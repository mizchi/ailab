// オブジェクトのキーを表示する機能のデモ

import { createLogger } from "../logger.ts";

console.log("\n=== オブジェクトのキーを表示する機能 ===");

// 基本的なロガー
const logger = createLogger("keys", {
  depth: 2, // 深さを制限
});

// ネストされたオブジェクト
const nestedObject = {
  user: {
    id: 1,
    name: "ずんだもん",
    email: "zunda@example.com",
    role: "admin",
    preferences: {
      theme: "dark",
      notifications: true,
      language: "ja",
      fontSize: 14,
      colors: {
        primary: "#007bff",
        secondary: "#6c757d",
        success: "#28a745",
        danger: "#dc3545",
        warning: "#ffc107",
      },
    },
  },
};

// 多くのキーを持つオブジェクト
const manyKeysObject = {
  key1: 1,
  key2: 2,
  key3: 3,
  key4: 4,
  key5: 5,
  key6: 6,
  key7: 7,
  key8: 8,
  key9: 9,
  key10: 10,
};

// 複雑なネストされたオブジェクト
const complexObject = {
  users: [
    {
      id: 1,
      name: "ユーザー1",
      details: {
        address: {
          city: "東京",
          country: "日本",
          postalCode: "100-0001",
        },
        contacts: {
          email: "user1@example.com",
          phone: "090-1234-5678",
        },
      },
    },
    {
      id: 2,
      name: "ユーザー2",
      details: {
        address: {
          city: "大阪",
          country: "日本",
          postalCode: "530-0001",
        },
        contacts: {
          email: "user2@example.com",
          phone: "090-8765-4321",
        },
      },
    },
  ],
  metadata: {
    version: "1.0",
    generated: new Date().toISOString(),
    settings: {
      theme: "dark",
      language: "ja",
    },
  },
};

// 通常のログ出力
console.log("\n=== 通常のログ出力 ===");
logger.info("ネストされたオブジェクト:", nestedObject);
logger.info("多くのキーを持つオブジェクト:", manyKeysObject);
logger.info("複雑なネストされたオブジェクト:", complexObject);

// 深さを変更してログ出力
console.log("\n=== 深さを変更してログ出力 (depth: 4) ===");
logger.with({ depth: 4 }).info(
  "ネストされたオブジェクト (深さ増加):",
  nestedObject,
);

// 一行表示モードでログ出力
console.log("\n=== 一行表示モードでログ出力 ===");
logger.with({ singleLine: true }).info(
  "ネストされたオブジェクト (一行表示):",
  nestedObject,
);

// 小さなオブジェクトの表示
console.log("\n=== 小さなオブジェクトの表示 ===");
logger.info("小さなオブジェクト:", { a: 1, b: 2 });
logger.with({ singleLine: true }).info("小さなオブジェクト (一行表示):", {
  a: 1,
  b: 2,
});

// 空のオブジェクトと配列の表示
console.log("\n=== 空のオブジェクトと配列の表示 ===");
logger.info("空のオブジェクトと配列:", {
  emptyObj: {},
  emptyArr: [],
  nestedEmpty: {
    empty: {},
  },
});
