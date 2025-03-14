import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { createLogger, LogLevel } from "../logger.ts";
import type { LogEntry } from "../types.ts";

// テスト用のロガーオプション（すべてのログレベルを表示）
const testLoggerOptions = {
  logLevel: LogLevel.DEBUG, // テスト中はすべてのログレベルを表示
};

test("displayLogEntry - JSONの長さに基づくインデント", () => {
  const logger = createLogger("test", testLoggerOptions);

  // 短いJSONオブジェクト
  const shortEntry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["短いJSON", { a: 1, b: 2 }],
  };

  // 長いJSONオブジェクト
  const longEntry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["長いJSON", {
      name: "これは長いJSONオブジェクトです",
      description: "20文字以上の長さがあります",
      values: [1, 2, 3, 4, 5],
    }],
  };

  // 一行表示モードでの短いJSONの表示
  const shortFormatted = logger.display(shortEntry, { singleLine: true });

  // 一行表示モードでの長いJSONの表示
  const longFormatted = logger.display(longEntry, { singleLine: true });

  // 短いJSONは一行で表示される
  expect(shortFormatted.split("\n").length).toBe(1);

  // 長いJSONは複数行で表示される（インデントされる）
  expect(longFormatted.split("\n").length).toBeGreaterThan(1);
  expect(longFormatted).toContain("\n");
});

test("displayLogEntry - 長いJSONは常にインデントされる", () => {
  const logger = createLogger("test", testLoggerOptions);

  // 長いJSONオブジェクト
  const longObject: Record<string, string> = {};
  // 20文字以上になるようにプロパティを追加
  for (let i = 0; i < 10; i++) {
    longObject[`key${i}`] = `value${i}`;
  }

  const entry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["長いオブジェクト", longObject],
  };

  // 一行表示モードでも長いJSONはインデントされる
  const formatted = logger.display(entry, { singleLine: true });

  // 複数行になっていることを確認
  expect(formatted.split("\n").length).toBeGreaterThan(1);

  // インデントが含まれていることを確認
  expect(formatted).toMatch(/\n\s+/);
});
