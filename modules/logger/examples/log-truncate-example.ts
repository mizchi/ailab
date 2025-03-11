// JSONの深さと配列長さの制限機能のデモ

import { createLogger } from "../logger.ts";

console.log("\n=== 配列の要素数制限 ===");
const arrayLogger = createLogger("array");

// 長い配列を含むオブジェクト
const longArrayObject = {
  numbers: Array.from({ length: 100 }, (_, i) => i),
  letters: Array.from(
    { length: 50 },
    (_, i) => String.fromCharCode(97 + (i % 26)),
  ),
};

// デフォルト設定（maxArrayLength = 10）
console.log("デフォルト設定（maxArrayLength = 10）:");
arrayLogger.info("長い配列:", longArrayObject);

// カスタム設定（maxArrayLength = 5）
console.log("\nカスタム設定（maxArrayLength = 5）:");
const customArrayLogger = createLogger("custom-array", { maxArrayLength: 5 });
customArrayLogger.info("長い配列:", longArrayObject);

console.log("\n=== JSONの深さ制限 ===");
const depthLogger = createLogger("depth");

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

// デフォルト設定（depth = 5）
console.log("デフォルト設定（depth = 5）:");
depthLogger.info("深いオブジェクト:", deepObject);

// 浅い表示（depth = 2）
console.log("\n浅い表示（depth = 2）:");
const shallowLogger = createLogger("shallow", { depth: 2 });
shallowLogger.info("深いオブジェクト:", deepObject);

// 深い表示（depth = 6）
console.log("\n深い表示（depth = 6）:");
const deepLogger = createLogger("deep", { depth: 6 });
deepLogger.info("深いオブジェクト:", deepObject);

console.log("\n=== 複合的な制限 ===");
// 複雑なオブジェクト（深いネストと長い配列を含む）
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
    settings: {
      theme: {
        colors: {
          primary: "#007bff",
          secondary: "#6c757d",
        },
      },
    },
  },
};

// 複合的な制限を適用
console.log("複合的な制限（depth = 3, maxArrayLength = 5）:");
const complexLogger = createLogger("complex", {
  depth: 3,
  maxArrayLength: 5,
});
complexLogger.info("複雑なオブジェクト:", complexObject);

// 一行表示モードでの制限
console.log(
  "\n一行表示モードでの制限（depth = 2, maxArrayLength = 3, singleLine = true）:",
);
const singleLineLogger = createLogger("single", {
  depth: 2,
  maxArrayLength: 3,
  singleLine: true,
});
singleLineLogger.info("複雑なオブジェクト:", complexObject);
