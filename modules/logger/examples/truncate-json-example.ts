import { createLogger, LogLevel } from "../mod.ts";

// ロガーの作成
const logger = createLogger("example", {
  logLevel: LogLevel.DEBUG,
});

console.log("=== 文字列長制限のデモ ===");

// 大きなJSONオブジェクトを作成
const largeObject = {
  data: Array.from({ length: 50 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description:
      `This is a description for item ${i} that will contribute to the overall length.`,
    tags: Array.from({ length: 5 }, (_, j) => `tag-${j}`),
  })),
};

// 制限なし
console.log("\n制限なし (maxLength = 0):");
logger.log("大きなJSONオブジェクト", largeObject);

// 短い制限
console.log("\n短い制限 (maxLength = 100):");
logger.with({ maxLength: 100 }).log("大きなJSONオブジェクト", largeObject);

// 中程度の制限
console.log("\n中程度の制限 (maxLength = 500):");
logger.with({ maxLength: 500 }).log("大きなJSONオブジェクト", largeObject);

// 大きな配列
console.log("\n=== 大きな配列の文字列長制限 ===");
const largeArray = Array.from(
  { length: 100 },
  (_, i) => `Item ${i} with additional text`,
);

// 制限なし
console.log("\n制限なし (maxLength = 0):");
logger.log("大きな配列", largeArray);

// 短い制限
console.log("\n短い制限 (maxLength = 100):");
logger.with({ maxLength: 100 }).log("大きな配列", largeArray);

// ネストされたオブジェクト
console.log("\n=== ネストされたオブジェクトの文字列長制限 ===");
const nestedObject = {
  level1: {
    level2: {
      level3: {
        data: Array.from({ length: 20 }, (_, i) => ({
          id: i,
          name: `Nested item ${i}`,
          properties: {
            a: `Property A for item ${i}`,
            b: `Property B for item ${i}`,
          },
        })),
      },
    },
  },
};

// 制限なし
console.log("\n制限なし (maxLength = 0):");
logger.with({ depth: 5 }).log("ネストされたオブジェクト", nestedObject);

// 短い制限
console.log("\n短い制限 (maxLength = 200):");
logger.with({ maxLength: 200, depth: 5 }).log(
  "ネストされたオブジェクト",
  nestedObject,
);
