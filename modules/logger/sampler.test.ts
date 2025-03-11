import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { createSampler, type IndexedItem, type Sampler } from "./sampler.ts";
import { createLogger, LogLevel } from "./logger.ts";
import { assertSpyCalls, spy } from "@std/testing/mock";

test("createSampler - 基本的なサンプリング", () => {
  const displaySpy = spy((item: number, idx: number) => {});

  const sampler = createSampler<number>({
    n: 5,
    displayItem: displaySpy,
  });

  // 50個のアイテムを追加
  for (let i = 0; i < 50; i++) {
    sampler.add(i);
  }

  // Symbol.disposeを手動で呼び出し
  sampler[Symbol.dispose]();

  // displayItemが呼び出されたことを確認
  assertSpyCalls(displaySpy, 5); // 5個のアイテムそれぞれに対して呼び出される
});

test("createSampler - first オプション", () => {
  const sampler = createSampler<number>({
    n: 3,
    first: true,
  });

  // 50個のアイテムを追加
  for (let i = 0; i < 50; i++) {
    sampler.add(i);
  }

  const items = sampler.items();

  // 最初のアイテムが含まれていることを確認
  expect(items[0]).toBe(0);

  // 合計で3個のアイテムがあることを確認（最初のアイテムと2つのサンプル）
  expect(items.length).toBe(3);
});

test("createSampler - last オプション", () => {
  const sampler = createSampler<number>({
    n: 3,
    last: true,
  });

  // 50個のアイテムを追加
  for (let i = 0; i < 50; i++) {
    sampler.add(i);
  }

  const items = sampler.items();

  // 最後のアイテムが含まれていることを確認
  expect(items[items.length - 1]).toBe(49);

  // 合計で3個のアイテムがあることを確認（最後のアイテムと2つのサンプル）
  expect(items.length).toBe(3);
});

test("createSampler - first と last の両方", () => {
  const sampler = createSampler<number>({
    n: 4,
    first: true,
    last: true,
  });

  // 50個のアイテムを追加
  for (let i = 0; i < 50; i++) {
    sampler.add(i);
  }

  const items = sampler.items();

  // 最初と最後のアイテムが含まれていることを確認
  expect(items[0]).toBe(0);
  expect(items[items.length - 1]).toBe(49);

  // 合計で4個のアイテムがあることを確認
  expect(items.length).toBe(4);
});

test("createSampler - filter オプション", () => {
  const sampler = createSampler<number>({
    n: 5,
    filter: (item) => item % 2 === 0, // 偶数のみをサンプリング
  });

  // 50個のアイテムを追加
  const results = [];
  for (let i = 0; i < 50; i++) {
    results.push(sampler.add(i));
  }

  const items = sampler.items();

  // すべてのアイテムが偶数であることを確認
  for (const item of items) {
    expect(item % 2).toBe(0);
  }

  // 奇数のアイテムはfalseを返すことを確認
  for (let i = 0; i < 50; i++) {
    expect(results[i]).toBe(i % 2 === 0);
  }
});

test("createSampler - clear メソッド", () => {
  const sampler = createSampler<number>({
    n: 5,
  });

  // 50個のアイテムを追加
  for (let i = 0; i < 50; i++) {
    sampler.add(i);
  }

  // クリア前にアイテムがあることを確認
  expect(sampler.items().length).toBeGreaterThan(0);

  // クリア
  sampler.clear();

  // クリア後にアイテムがないことを確認
  expect(sampler.items().length).toBe(0);
});

test("createSampler - ロガーを使用した表示", () => {
  const mockOutput = {
    log: spy((message: string) => {}),
    error: spy((message: string) => {}),
  };

  const logger = createLogger("sampler-test", {
    output: mockOutput,
    logLevel: LogLevel.DEBUG, // 明示的にログレベルを設定
  });

  const sampler = createSampler<string>({
    n: 3,
    title: "テストサンプラー",
    logger,
  });

  // アイテムを追加
  sampler.add("item1");
  sampler.add("item2");
  sampler.add("item3");

  // Symbol.disposeを手動で呼び出し
  sampler[Symbol.dispose]();

  // ロガーのinfoメソッドが呼び出されたことを確認
  assertSpyCalls(mockOutput.log, 4); // タイトル行 + 3アイテム
});

test("createSampler - 少ないアイテム数", () => {
  const displaySpy = spy((item: number, idx: number) => {});

  const sampler = createSampler<number>({
    n: 10, // 追加するアイテムより多い
    displayItem: displaySpy,
  });

  // 5個のアイテムを追加
  for (let i = 0; i < 5; i++) {
    sampler.add(i);
  }

  // Symbol.disposeを手動で呼び出し
  sampler[Symbol.dispose]();

  // 追加したアイテムがすべてサンプリングされていることを確認
  assertSpyCalls(displaySpy, 5); // 5個のアイテムそれぞれに対して呼び出される

  // 各アイテムが期待通りであることを確認
  const values = displaySpy.calls.map((call) => call.args[0]);
  expect(values).toContain(0);
  expect(values).toContain(1);
  expect(values).toContain(2);
  expect(values).toContain(3);
  expect(values).toContain(4);
});

test("createSampler - インデックス付きアイテムの取得", () => {
  const sampler = createSampler<number>({
    n: 5,
  });

  // 50個のアイテムを追加
  for (let i = 0; i < 50; i++) {
    sampler.add(i);
  }

  // インデックス付きアイテムを取得
  const indexedItems = sampler.indexedItems();

  // 5個のアイテムがあることを確認
  expect(indexedItems.length).toBe(5);

  // 各アイテムがインデックスを持っていることを確認
  for (const item of indexedItems) {
    expect(item).toHaveProperty("value");
    expect(item).toHaveProperty("index");
    expect(typeof item.index).toBe("number");
  }
});

test("createSampler - インデックス付き表示関数", () => {
  const displaySpy = spy((item: number, idx: number) => {});

  const sampler = createSampler<number>({
    n: 5,
    displayItem: displaySpy,
  });

  // 50個のアイテムを追加
  for (let i = 0; i < 50; i++) {
    sampler.add(i);
  }

  // Symbol.disposeを手動で呼び出し
  sampler[Symbol.dispose]();

  // displayItemが呼び出されたことを確認
  assertSpyCalls(displaySpy, 5); // 5個のアイテムそれぞれに対して呼び出される

  // 各アイテムのインデックスが0から4の範囲内であることを確認
  for (const call of displaySpy.calls) {
    const idx = call.args[1];
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(5);
  }
});

test("createSampler - all メソッド", () => {
  const sampler = createSampler<number>({
    n: 3,
    filter: (item) => item % 2 === 0, // 偶数のみをサンプリング
  });

  // 50個のアイテムを追加
  for (let i = 0; i < 50; i++) {
    sampler.add(i);
  }

  // all()で全てのフィルター通過アイテムを取得
  const allItems = sampler.all();

  // フィルターを通過した偶数のみが含まれていることを確認
  expect(allItems.length).toBe(25); // 0, 2, 4, ..., 48
  for (const item of allItems) {
    expect(item % 2).toBe(0);
  }

  // items()はサンプリングされた3つのアイテムのみを返す
  expect(sampler.items().length).toBe(3);
});

test("createSampler - sample メソッド", () => {
  const sampler = createSampler<number>({
    n: 10,
  });

  // 50個のアイテムを追加
  for (let i = 0; i < 50; i++) {
    sampler.add(i);
  }

  // 5個のアイテムをサンプリング
  const sample1 = sampler.sample(5);
  expect(sample1.length).toBe(5);

  // 重複がないことを確認
  const uniqueItems = new Set(sample1);
  expect(uniqueItems.size).toBe(5);

  // 要求数が現在のアイテム数より多い場合は全てのアイテムを返す
  const sample2 = sampler.sample(15);
  expect(sample2.length).toBe(10); // 現在のアイテム数は10
});

test("createSampler - pick メソッド", () => {
  const sampler = createSampler<number>({
    n: 5,
  });

  // アイテムがない場合はundefinedを返す
  expect(sampler.pick()).toBeUndefined();

  // 50個のアイテムを追加
  for (let i = 0; i < 50; i++) {
    sampler.add(i);
  }

  // ランダムに1つのアイテムを取得
  const picked = sampler.pick();
  expect(picked).not.toBeUndefined();
  expect(sampler.items()).toContain(picked);
});

test("createSampler - シード付き乱数生成", () => {
  // 同じシードで2つのサンプラーを作成
  const sampler1 = createSampler<number>({ n: 5 }, 12345);
  const sampler2 = createSampler<number>({ n: 5 }, 12345);

  // 同じデータを追加
  for (let i = 0; i < 100; i++) {
    sampler1.add(i);
    sampler2.add(i);
  }

  // 同じシードなので同じサンプリング結果になるはず
  expect(sampler1.items()).toEqual(sampler2.items());

  // 異なるシードで別のサンプラーを作成
  const sampler3 = createSampler<number>({ n: 5 }, 67890);

  // 同じデータを追加
  for (let i = 0; i < 100; i++) {
    sampler3.add(i);
  }

  // 異なるシードなので結果も異なる可能性が高い
  // 注: 確率的に同じ結果になる可能性もあるため、必ずしも異なるとは限らない
  // このテストは確率的なものであり、稀に失敗する可能性がある
  const items1 = JSON.stringify(sampler1.items());
  const items3 = JSON.stringify(sampler3.items());
  expect(items1 !== items3).toBeTruthy();
});

test("createSampler - first/last はフィルターを満たすもののみ", () => {
  const sampler = createSampler<number>({
    n: 5,
    first: true,
    last: true,
    filter: (item) => item % 2 === 0, // 偶数のみをサンプリング
  });

  // 50個のアイテムを追加
  for (let i = 0; i < 50; i++) {
    sampler.add(i);
  }

  const items = sampler.items();

  // 最初のフィルター通過アイテムは0
  expect(items[0]).toBe(0);

  // 最後のフィルター通過アイテムは48
  expect(items[items.length - 1]).toBe(48);

  // 奇数は含まれていない
  for (const item of items) {
    expect(item % 2).toBe(0);
  }
});
