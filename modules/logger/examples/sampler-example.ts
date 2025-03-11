/**
 * サンプラーの使用例
 *
 * このサンプルでは、大量のデータからサンプリングを行い、
 * スコープを抜けるときに結果を表示する方法を示します。
 */

import { createLogger } from "../logger.ts";
import { createSampler } from "../sampler.ts";

// ロガーを作成
const logger = createLogger("sampler-example");

// 基本的な使用例
{
  logger.info("基本的なサンプリングの例:");

  // using宣言でサンプラーを作成
  using sampler = createSampler<number>({
    n: 5,
    title: "数値サンプル",
    logger,
  });

  // 大量のデータを追加
  for (let i = 0; i < 1000; i++) {
    sampler.add(i);
  }

  // スコープを抜けると自動的に結果が表示される
}

// インデックスを表示する例
{
  logger.info("\nインデックスを表示する例:");

  using sampler = createSampler<number>({
    n: 5,
    title: "インデックス付きサンプル",
    logger,
  });

  // 大量のデータを追加
  for (let i = 0; i < 1000; i++) {
    sampler.add(i);
  }
}

// 最初と最後のアイテムを含める例
{
  logger.info("\n最初と最後のアイテムを含める例:");

  using sampler = createSampler<number>({
    n: 5,
    first: true,
    last: true,
    title: "最初と最後を含むサンプル",
    logger,
  });

  for (let i = 0; i < 1000; i++) {
    sampler.add(i);
  }
}

// フィルター機能の例
{
  logger.info("\nフィルター機能の例:");

  using sampler = createSampler<number>({
    n: 5,
    filter: (n) => n % 100 === 0, // 100の倍数のみをサンプリング
    title: "100の倍数のみ",
    logger,
  });

  for (let i = 0; i < 1000; i++) {
    sampler.add(i);
  }
}

// カスタム表示関数の例
{
  logger.info("\nカスタム表示関数の例:");

  using sampler = createSampler<{ id: number; name: string }>({
    n: 5,
    title: "オブジェクトサンプル",
    displayItem: (item, idx) => {
      logger.info(`(${idx})ID: ${item.id}, 名前: ${item.name}`);
    },
  });

  // オブジェクトデータを追加
  for (let i = 0; i < 100; i++) {
    sampler.add({
      id: i,
      name: `アイテム${i}`,
    });
  }
}

// インデックス付きカスタム表示関数の例
{
  logger.info("\nインデックス付きカスタム表示関数の例:");

  using sampler = createSampler<{ id: number; name: string }>({
    n: 5,
    title: "インデックス付きオブジェクトサンプル",
    displayItem: (item, idx) => {
      logger.info(
        `元のインデックス: ${idx}, ID: ${item.id}, 名前: ${item.name}`,
      );
    },
  });

  // オブジェクトデータを追加
  for (let i = 0; i < 100; i++) {
    sampler.add({
      id: i,
      name: `アイテム${i}`,
    });
  }
}

// シード付き乱数生成の例
{
  logger.info("\nシード付き乱数生成の例:");

  // 同じシードで2つのサンプラーを作成
  const seed = 12345;
  using sampler1 = createSampler<number>({
    n: 5,
    title: "シード付きサンプル1",
    logger,
  }, seed);

  using sampler2 = createSampler<number>({
    n: 5,
    title: "シード付きサンプル2（同じシード）",
    logger,
  }, seed);

  // 同じデータを追加
  for (let i = 0; i < 100; i++) {
    sampler1.add(i);
    sampler2.add(i);
  }

  // 同じシードなので同じサンプリング結果になるはず
  logger.info("同じシードでの結果比較:");
  logger.info(`サンプル1: ${JSON.stringify(sampler1.items())}`);
  logger.info(`サンプル2: ${JSON.stringify(sampler2.items())}`);
}

// all メソッドの例
{
  logger.info("\nall メソッドの例:");

  using sampler = createSampler<number>({
    n: 3,
    filter: (n) => n % 10 === 0, // 10の倍数のみをサンプリング
    title: "全データとサンプリングデータの比較",
    logger,
  });

  // データを追加
  for (let i = 0; i < 100; i++) {
    sampler.add(i);
  }

  // 全てのフィルター通過アイテムを取得
  const allItems = sampler.all();
  logger.info(
    `全てのフィルター通過アイテム (${allItems.length}個): ${
      allItems.join(", ")
    }`,
  );

  // サンプリングされたアイテムを取得
  const sampledItems = sampler.items();
  logger.info(
    `サンプリングされたアイテム (${sampledItems.length}個): ${
      sampledItems.join(", ")
    }`,
  );
}

// sample メソッドの例
{
  logger.info("\nsample メソッドの例:");

  using sampler = createSampler<number>({
    n: 10,
    title: "サンプリングメソッドの例",
    logger,
  });

  // データを追加
  for (let i = 0; i < 100; i++) {
    sampler.add(i);
  }

  // 異なるサイズでサンプリング
  const sample3 = sampler.sample(3);
  logger.info(`3個のサンプル: ${sample3.join(", ")}`);

  const sample5 = sampler.sample(5);
  logger.info(`5個のサンプル: ${sample5.join(", ")}`);

  const sample15 = sampler.sample(15);
  logger.info(`15個のサンプル（最大10個）: ${sample15.join(", ")}`);
}

// pick メソッドの例
{
  logger.info("\npick メソッドの例:");

  using sampler = createSampler<string>({
    n: 10,
    title: "ランダムピックの例",
    logger,
  });

  // データを追加
  const fruits = [
    "りんご",
    "バナナ",
    "オレンジ",
    "ぶどう",
    "いちご",
    "メロン",
    "パイナップル",
    "キウイ",
    "もも",
    "さくらんぼ",
  ];
  for (const fruit of fruits) {
    sampler.add(fruit);
  }

  // ランダムに1つのアイテムを取得
  logger.info(`ランダムに選んだフルーツ: ${sampler.pick()}`);
  logger.info(`もう一度ランダムに選んだフルーツ: ${sampler.pick()}`);
  logger.info(`もう一度ランダムに選んだフルーツ: ${sampler.pick()}`);
}

// 実行時間計測の例
{
  logger.info("\n実行時間計測の例:");

  interface TimingData {
    operation: string;
    durationMs: number;
  }

  using sampler = createSampler<TimingData>({
    n: 5,
    title: "実行時間サンプル",
    logger,
    displayItem: (item, idx) => {
      logger.info(
        `(${idx})${item.operation}: ${item.durationMs.toFixed(2)}ms`,
      );
    },
  });

  // 様々な処理の実行時間をサンプリング
  for (let i = 0; i < 20; i++) {
    const start = performance.now();

    // 何らかの処理をシミュレート
    const delay = Math.random() * 100;
    const end = start + delay;
    while (performance.now() < end) {
      // ビジーウェイト
    }

    const duration = performance.now() - start;
    sampler.add({
      operation: `処理${i}`,
      durationMs: duration,
    });
  }
}

// フィルターの戻り値の例
{
  logger.info("\nフィルターの戻り値の例:");

  using sampler = createSampler<number>({
    n: 5,
    filter: (n) => n % 2 === 0, // 偶数のみをサンプリング
    title: "フィルター戻り値の例",
    logger,
  });

  // データを追加して戻り値を確認
  logger.info("add()の戻り値:");
  for (let i = 0; i < 5; i++) {
    const result = sampler.add(i);
    logger.info(
      `${i}: ${result ? "追加されました" : "フィルターで除外されました"}`,
    );
  }
}

logger.info("\nすべてのサンプルが完了しました。");
