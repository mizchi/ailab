/**
 * サンプラーモジュール
 *
 * このモジュールは実行中のデータをサンプリングし、スコープ終了時に表示する機能を提供します。
 * Symbol.disposeを使用して、usingブロックと組み合わせることができます。
 */

import type { Logger } from "./types.ts";

/**
 * インデックス付きアイテム
 */
export interface IndexedItem<T> {
  /** アイテムの値 */
  value: T;
  /** 元のインデックス */
  index: number;
}

/**
 * サンプラーのオプション
 */
export interface SamplerOptions<T> {
  /** 保持する最大アイテム数 */
  n: number;
  /** 最初のアイテムを必ず含めるかどうか */
  first?: boolean;
  /** 最後のアイテムを必ず含めるかどうか */
  last?: boolean;
  /** アイテムをフィルタリングする関数 */
  filter?: (item: T) => boolean;
  /** アイテムを表示する関数 */
  // display?: (items: T[]) => void;
  /** インデックス付きアイテムを表示する関数 */
  displayItem?: (item: T, idx: number) => void;
  /** サンプリングのタイトル（表示時に使用） */
  title?: string;
  /** ロガーインスタンス（指定しない場合はconsole.logを使用） */
  logger?: Logger;
}

/**
 * サンプラーインターフェース
 */
export interface Sampler<T> {
  /**
   * アイテムを追加する
   * @param item 追加するアイテム
   * @returns フィルターを満たす場合はtrue、満たさない場合はfalse
   */
  add(item: T): boolean;
  /** 現在のアイテムを取得する */
  items(): T[];
  /** インデックス付きアイテムを取得する */
  indexedItems(): IndexedItem<T>[];
  /** 記録されたすべての要素を取得する */
  all(): T[];
  /** 現在のアイテムからn個をランダムにサンプリングする */
  sample(n: number): T[];
  /** ランダムにデータを一つ返す */
  pick(): T | undefined;
  /** 現在のアイテムをクリアする */
  clear(): void;
  /** Symbol.disposeメソッド（スコープ終了時に呼び出される） */
  [Symbol.dispose](): void;
}

/**
 * サンプラーを作成する
 * @param options サンプラーのオプション
 * @param seed 乱数シード（テスト環境で固定するために使用）
 * @returns サンプラーインスタンス
 *
 * @example
 * ```ts
 * {
 *   using sampler = createSampler<number>({
 *     n: 5,
 *     first: true,
 *     last: true
 *   });
 *
 *   for (let i = 0; i < 100; i++) {
 *     sampler.add(i);
 *   }
 *   // スコープを抜けると自動的に結果が表示される
 * }
 * ```
 */
export function createSampler<T>(
  options: SamplerOptions<T>,
  seed?: number,
): Sampler<T> {
  const {
    n: maxItems,
    first = false,
    last = false,
    filter = () => true,
    displayItem: displayWithIndex,
    logger,
  } = options;

  // 有効なサンプリング数を計算（first と last を考慮）
  const effectiveMaxItems = Math.max(
    1,
    maxItems - (first ? 1 : 0) - (last ? 1 : 0),
  );

  // 乱数生成器の設定
  let random = Math.random;
  if (seed !== undefined) {
    // シードが指定された場合は、シード付き乱数生成器を使用
    const seededRandom = createSeededRandom(seed);
    random = () => seededRandom.next();
  }

  // サンプリングデータの保存用
  let firstItem: IndexedItem<T> | null = null;
  let lastItem: IndexedItem<T> | null = null;
  const sampledItems: IndexedItem<T>[] = [];
  const allItems: IndexedItem<T>[] = []; // すべてのフィルター通過アイテムを保存
  let totalItems = 0;
  let skippedItems = 0;

  // サンプリング確率を計算する関数
  function calculateSamplingProbability(): number {
    if (totalItems <= effectiveMaxItems) return 1.0;
    return effectiveMaxItems / totalItems;
  }

  // シード付き乱数生成器
  function createSeededRandom(seed: number) {
    let state = seed;
    return {
      next: () => {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
      },
    };
  }

  // 結果を表示する関数
  function displayResults() {
    const allIndexedItems: IndexedItem<T>[] = [];

    // 最初のアイテムを追加
    if (first && firstItem !== null) {
      allIndexedItems.push(firstItem);
    }

    // サンプリングされたアイテムを追加
    allIndexedItems.push(...sampledItems);

    // 最後のアイテムを追加
    if (
      last && lastItem !== null &&
      (sampledItems.length === 0 ||
        lastItem.index !== sampledItems[sampledItems.length - 1].index)
    ) {
      allIndexedItems.push(lastItem);
    }

    // インデックス付きアイテムの表示関数があれば使用
    if (displayWithIndex) {
      for (const [idx, item] of allIndexedItems.entries()) {
        displayWithIndex(item.value, idx);
      }
      // displayWithIndex(allIndexedItems);
      return;
    }

    // デフォルトの表示
    if (logger) {
      logger.info(
        `(${allIndexedItems.length}/${totalItems} items, ${skippedItems} skipped):`,
      );
      for (const item of allIndexedItems) {
        logger.info(`- [${item.index}] ${String(item.value)}`);
      }
    } else {
      console.log(
        `(${allIndexedItems.length}/${totalItems} items, ${skippedItems} skipped):`,
      );
      for (const item of allIndexedItems) {
        console.log(`- [${item.index}] ${String(item.value)}`);
      }
    }
  }

  return {
    add(item: T): boolean {
      // フィルターをチェック
      if (!filter(item)) {
        skippedItems++;
        return false;
      }

      const indexedItem: IndexedItem<T> = {
        value: item,
        index: totalItems,
      };

      totalItems++;

      // すべてのフィルター通過アイテムを保存
      allItems.push(indexedItem);

      // 最初のアイテムを保存
      if (first && firstItem === null) {
        firstItem = indexedItem;
        return true;
      }

      // 最後のアイテムを常に更新
      if (last) {
        lastItem = indexedItem;
      }

      // サンプリング確率に基づいてアイテムを追加
      const probability = calculateSamplingProbability();

      if (sampledItems.length < effectiveMaxItems) {
        // 最大数に達するまでは全て追加
        sampledItems.push(indexedItem);
      } else if (random() < probability) {
        // 確率に基づいて既存のアイテムを置き換え
        const replaceIndex = Math.floor(random() * sampledItems.length);
        sampledItems[replaceIndex] = indexedItem;
      }

      return true;
    },

    items(): T[] {
      return this.indexedItems().map((item) => item.value);
    },

    indexedItems(): IndexedItem<T>[] {
      const result: IndexedItem<T>[] = [];
      if (first && firstItem !== null) {
        result.push(firstItem);
      }
      result.push(...sampledItems);
      if (
        last && lastItem !== null &&
        (sampledItems.length === 0 ||
          lastItem.index !== sampledItems[sampledItems.length - 1].index)
      ) {
        result.push(lastItem);
      }
      return result;
    },

    all(): T[] {
      return allItems.map((item) => item.value);
    },

    sample(n: number): T[] {
      const items = this.items();
      if (items.length <= n) return [...items];

      const result: T[] = [];
      const indices = new Set<number>();

      while (result.length < n && result.length < items.length) {
        const idx = Math.floor(random() * items.length);
        if (!indices.has(idx)) {
          indices.add(idx);
          result.push(items[idx]);
        }
      }

      return result;
    },

    pick(): T | undefined {
      const items = this.items();
      if (items.length === 0) return undefined;
      return items[Math.floor(random() * items.length)];
    },

    clear(): void {
      firstItem = null;
      lastItem = null;
      sampledItems.length = 0;
      allItems.length = 0;
      totalItems = 0;
      skippedItems = 0;
    },

    [Symbol.dispose](): void {
      displayResults();
    },
  };
}
