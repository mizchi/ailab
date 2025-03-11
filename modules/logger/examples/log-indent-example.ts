// JSONの長さに基づくインデント機能のデモ

import { createLogger } from "../logger.ts";

console.log("\n=== JSONの長さに基づくインデント ===");

// 短いJSONオブジェクト
const shortObject = { a: 1, b: 2 };

// 長いJSONオブジェクト
const longObject = {
  name: "これは長いJSONオブジェクトです",
  description: "20文字以上の長さがあるため、インデントされます",
  values: [1, 2, 3, 4, 5],
  metadata: {
    created: new Date().toISOString(),
    author: "ずんだもん",
  },
};

// 一行表示モードでの短いJSONと長いJSONの比較
console.log("\n一行表示モードでの比較:");
const singleLineLogger = createLogger("single", { singleLine: true });

console.log("\n短いJSONオブジェクト（一行表示）:");
singleLineLogger.info("短いJSON:", shortObject);

console.log(
  "\n長いJSONオブジェクト（一行表示モードでも長さが20以上なのでインデント）:",
);
singleLineLogger.info("長いJSON:", longObject);

// 複数行表示モードでの比較
console.log("\n複数行表示モードでの比較:");
const multiLineLogger = createLogger("multi");

console.log("\n短いJSONオブジェクト（複数行表示）:");
multiLineLogger.info("短いJSON:", shortObject);

console.log("\n長いJSONオブジェクト（複数行表示）:");
multiLineLogger.info("長いJSON:", longObject);

// 動的に生成した長いオブジェクト
console.log("\n動的に生成した長いオブジェクト:");
const dynamicObject: Record<string, string> = {};
for (let i = 0; i < 10; i++) {
  dynamicObject[`key${i}`] = `value${i}`;
}

console.log("\n一行表示モードでも長さが20以上なのでインデント:");
singleLineLogger.info("動的オブジェクト:", dynamicObject);

// 配列の長さ制限との組み合わせ
console.log("\n配列の長さ制限との組み合わせ:");
const arrayObject = {
  numbers: Array.from({ length: 100 }, (_, i) => i),
  letters: Array.from(
    { length: 50 },
    (_, i) => String.fromCharCode(97 + (i % 26)),
  ),
};

console.log("\n長い配列を含むオブジェクト（maxArrayLength = 5）:");
const arrayLogger = createLogger("array", { maxArrayLength: 5 });
arrayLogger.info("配列オブジェクト:", arrayObject);

// 深さ制限との組み合わせ
console.log("\n深さ制限との組み合わせ:");
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

console.log("\n深いオブジェクト（depth = 3）:");
const depthLogger = createLogger("depth", { depth: 3 });
depthLogger.info("深いオブジェクト:", deepObject);

// 複合的な設定
console.log(
  "\n複合的な設定（depth = 3, maxArrayLength = 5, singleLine = true）:",
);
const complexLogger = createLogger("complex", {
  depth: 3,
  maxArrayLength: 5,
  singleLine: true,
});

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

complexLogger.info("複雑なオブジェクト:", complexObject);
