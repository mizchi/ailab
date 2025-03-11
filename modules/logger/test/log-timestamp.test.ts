import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { createLogger, LogLevel } from "../logger.ts";
import type { LogEntry } from "../types.ts";

// テスト用のロガーオプション（すべてのログレベルを表示）
const testLoggerOptions = {
  logLevel: LogLevel.DEBUG, // テスト中はすべてのログレベルを表示
};

test("displayLogEntry - デフォルトでタイムスタンプ非表示", () => {
  const logger = createLogger("test", testLoggerOptions);

  const entry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["タイムスタンプなしのメッセージ"],
  };

  // デフォルト設定（showTimestamp = false）
  const formatted = logger.display(entry);

  // タイムスタンプが含まれていないことを確認
  // タイムスタンプの形式は "HH:MM:SS" なので、これにマッチしないことを確認
  expect(formatted).not.toMatch(/^\d{2}:\d{2}:\d{2}/);

  // 正しいフォーマットになっていることを確認
  expect(formatted).toMatch(/^\[test\] タイムスタンプなしのメッセージ/);
});

test("displayLogEntry - タイムスタンプ表示設定", () => {
  const logger = createLogger("test", {
    ...testLoggerOptions,
    showTimestamp: true,
  });

  const entry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["タイムスタンプありのメッセージ"],
  };

  // showTimestamp = true の設定
  const formatted = logger.display(entry);

  // タイムスタンプが含まれていることを確認
  // タイムスタンプの形式は "HH:MM:SS" なので、これにマッチすることを確認
  expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}/);

  // 正しいフォーマットになっていることを確認
  expect(formatted).toMatch(
    /^\d{2}:\d{2}:\d{2} \[test\] タイムスタンプありのメッセージ/,
  );
});

test("displayLogEntry - 一時的なタイムスタンプ設定", () => {
  // デフォルト設定（showTimestamp = false）のロガー
  const logger = createLogger("test", testLoggerOptions);

  const entry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["メッセージ"],
  };

  // 一時的に showTimestamp = true に設定
  const formattedWithTimestamp = logger.display(entry, { showTimestamp: true });

  // タイムスタンプが含まれていることを確認
  expect(formattedWithTimestamp).toMatch(/^\d{2}:\d{2}:\d{2}/);

  // 一時的に showTimestamp = false に設定（明示的に指定）
  const formattedWithoutTimestamp = logger.display(entry, {
    showTimestamp: false,
  });

  // タイムスタンプが含まれていないことを確認
  expect(formattedWithoutTimestamp).not.toMatch(/^\d{2}:\d{2}:\d{2}/);
});

test("displayLogEntry - ISO形式のタイムスタンプ", () => {
  const logger = createLogger("test", {
    ...testLoggerOptions,
    showTimestamp: true,
    timeOnly: false,
  });

  const entry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["ISO形式のタイムスタンプ"],
  };

  // timeOnly = false の設定（ISO形式）
  const formatted = logger.display(entry);

  // ISO形式のタイムスタンプが含まれていることを確認
  // ISO形式の時間部分は "HH:MM:SS" なので、これにマッチすることを確認
  expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}/);

  // 正しいフォーマットになっていることを確認
  expect(formatted).toMatch(
    /^\d{2}:\d{2}:\d{2} \[test\] ISO形式のタイムスタンプ/,
  );
});
