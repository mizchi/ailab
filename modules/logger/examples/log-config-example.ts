// 一時的な設定を適用するconfig機能のデモ

import { createLogger } from "../logger.ts";

console.log("\n=== 一時的な設定を適用するconfig機能 ===");

// 基本的なロガー
const logger = createLogger("base", {
  singleLine: true,
  depth: 2,
  maxArrayLength: 10,
});

// 深いネストを持つオブジェクト
const deepObject = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            value: "深い値",
            array: [1, 2, 3, 4, 5],
          },
        },
      },
    },
  },
};

// 長い配列を持つオブジェクト
const arrayObject = {
  numbers: Array.from({ length: 100 }, (_, i) => i),
};

// 複雑なオブジェクト
const complexObject = {
  users: Array.from({ length: 20 }, (_, i) => ({
    id: i,
    name: `ユーザー ${i}`,
    details: {
      address: {
        city: `都市 ${i}`,
        country: "日本",
      },
    },
  })),
  metadata: {
    version: "1.0",
    generated: new Date().toISOString(),
  },
};

// デフォルト設定でのログ出力
console.log(
  "\n=== デフォルト設定（depth: 2, maxArrayLength: 10, singleLine: true） ===",
);
logger.info("深いオブジェクト:", deepObject);
logger.info("長い配列:", arrayObject);
logger.info("複雑なオブジェクト:", complexObject);

// 一時的に深さを変更
console.log("\n=== 一時的に深さを変更（depth: 6） ===");
logger.with({ depth: 6 }).info("深いオブジェクト（深さ増加）:", deepObject);

// 一時的に配列の長さ制限を変更
console.log("\n=== 一時的に配列の長さ制限を変更（maxArrayLength: 5） ===");
logger.with({ maxArrayLength: 5 }).info(
  "長い配列（要素数制限）:",
  arrayObject,
);

// 一時的に表示モードを変更
console.log("\n=== 一時的に表示モードを変更（singleLine: false） ===");
logger.with({ singleLine: false }).info("複数行表示:", complexObject);

// 複数の設定を同時に変更
console.log(
  "\n=== 複数の設定を同時に変更（depth: 4, maxArrayLength: 3, singleLine: false） ===",
);
logger.with({
  depth: 4,
  maxArrayLength: 3,
  singleLine: false,
}).info("複合設定変更:", complexObject);

// 元の設定に戻ることを確認
console.log("\n=== 元の設定に戻ることを確認 ===");
logger.info("元の設定に戻る:", complexObject);

// 実用的な例：デバッグ時に一時的に詳細表示
console.log("\n=== 実用的な例：デバッグ時に一時的に詳細表示 ===");

function processData(data: any) {
  // 通常のログ
  logger.info("処理開始:", data);

  // エラーが発生した場合、詳細情報を表示
  try {
    // 何らかの処理
    if (data.level1.level2.level3.nonExistentProperty) {
      // 存在しないプロパティにアクセス
    }
  } catch (error) {
    // エラー発生時に一時的に詳細設定でログ出力
    logger.error("エラーが発生しました:", error);
    logger.with({
      depth: 10,
      maxArrayLength: 100,
      singleLine: false,
    }).error("詳細なデータ構造:", data);
  }

  // 通常のログに戻る
  logger.info("処理完了");
}

// エラーが発生するデータで関数を実行
processData(deepObject);
