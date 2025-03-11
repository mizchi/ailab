import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { createLogger, LogLevel } from "../logger.ts";
import type { LogEntry } from "../types.ts";

// テスト用のロガーオプション（すべてのログレベルを表示）
const testLoggerOptions = {
  logLevel: LogLevel.DEBUG, // テスト中はすべてのログレベルを表示
};

test("displayLogEntry - 配列の要素数制限", () => {
  const logger = createLogger("test", testLoggerOptions);

  // 大きな配列を含むログエントリ
  const entry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["配列テスト", { numbers: Array.from({ length: 20 }, (_, i) => i) }],
  };

  // デフォルト設定（maxArrayLength = 10）
  const formatted = logger.display(entry);
  expect(formatted).toContain("... 10 more items"); // 10要素以降が省略されていることを確認

  // カスタム設定（maxArrayLength = 5）
  const formattedCustom = logger.display(entry, { maxArrayLength: 5 });
  expect(formattedCustom).toContain("... 15 more items"); // 5要素以降が省略されていることを確認
});

test("displayLogEntry - JSONの深さ制限", () => {
  const logger = createLogger("test", testLoggerOptions);

  // 深いネストを持つオブジェクト
  const deepObject = {
    level1: {
      level2: {
        level3: {
          level4: {
            level5: {
              value: "deep",
            },
          },
        },
      },
    },
  };

  const entry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["深さテスト", deepObject],
  };

  // depth=2 の場合（浅い表示）
  const formattedShallow = logger.display(entry, { depth: 2 });

  // depth=6 の場合（深い表示）
  const formattedDeep = logger.display(entry, { depth: 6 });

  // 浅い表示では深い値が表示されないことを確認
  expect(formattedShallow).not.toContain("deep");

  // 深い表示では深い値が表示されることを確認
  expect(formattedDeep).toContain("deep");
});

test("displayLogEntry - 複合的な制限", () => {
  const logger = createLogger("test", testLoggerOptions);

  // 複雑なオブジェクト（深いネストと長い配列を含む）
  const complexObject = {
    users: Array.from({ length: 20 }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      details: {
        address: {
          city: `City ${i}`,
          country: "Japan",
        },
      },
    })),
    metadata: {
      version: "1.0",
      generated: new Date().toISOString(),
    },
  };

  const entry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["複合テスト", complexObject],
  };

  // 複合的な制限を適用
  const formatted = logger.display(entry, {
    depth: 3,
    maxArrayLength: 5,
  });

  // 配列が制限されていることを確認
  expect(formatted).toContain("... 15 more items");

  // 深さが制限されていることを確認
  // address オブジェクトは [Object] として表示される
  expect(formatted).toContain("[Object]");

  // 深すぎる値は表示されないことを確認
  expect(formatted).not.toContain("city");
  expect(formatted).not.toContain("country");
});
