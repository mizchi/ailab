import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { createLogger, LogLevel } from "../logger.ts";
import { assertSpyCalls, spy } from "@std/testing/mock";

// テスト用のロガーオプション（すべてのログレベルを表示）
const testLoggerOptions = {
  logLevel: LogLevel.DEBUG, // テスト中はすべてのログレベルを表示
};

test("logger.config - 一時的な設定の適用", () => {
  const mockOutput = {
    log: spy((message: string) => {}),
    error: spy((message: string) => {}),
  };

  // デフォルト設定のロガー
  const logger = createLogger("test", {
    ...testLoggerOptions,
    output: mockOutput,
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
              value: "deep",
            },
          },
        },
      },
    },
  };

  // 長い配列を持つオブジェクト
  const arrayObject = {
    numbers: Array.from({ length: 20 }, (_, i) => i),
  };

  // デフォルト設定でログ出力
  logger.info("デフォルト設定:", deepObject);

  // 一時的な設定でログ出力
  logger.with({ depth: 6, maxArrayLength: 5 }).info(
    "一時的な設定:",
    deepObject,
  );

  // 再度デフォルト設定でログ出力
  logger.info("再度デフォルト設定:", deepObject);

  // 配列の長さ制限を一時的に変更
  logger.info("デフォルト配列設定:", arrayObject);
  logger.with({ maxArrayLength: 5 }).info("一時的な配列設定:", arrayObject);

  // 呼び出し回数を確認
  assertSpyCalls(mockOutput.log, 5);

  // 一時的な設定が適用されていることを確認
  const defaultOutput = mockOutput.log.calls[0].args[0];
  const tempOutput = mockOutput.log.calls[1].args[0];
  const defaultAgainOutput = mockOutput.log.calls[2].args[0];
  const defaultArrayOutput = mockOutput.log.calls[3].args[0];
  const tempArrayOutput = mockOutput.log.calls[4].args[0];

  // 深さの設定が一時的に変更されていることを確認
  expect(defaultOutput).not.toContain("deep"); // デフォルト設定では深い値は表示されない
  expect(tempOutput).toContain("deep"); // 一時的な設定では深い値が表示される
  expect(defaultAgainOutput).not.toContain("deep"); // 再度デフォルト設定に戻る

  // 配列の長さ制限が一時的に変更されていることを確認
  expect(defaultArrayOutput).toContain("... 10 more items"); // デフォルトは10
  expect(tempArrayOutput).toContain("... 15 more items"); // 一時的な設定は5
});

test("logger.config - 一時的な表示モードの変更", () => {
  const mockOutput = {
    log: spy((message: string) => {}),
    error: spy((message: string) => {}),
  };

  // デフォルト設定のロガー（複数行表示）
  const logger = createLogger("test", {
    ...testLoggerOptions,
    output: mockOutput,
    singleLine: false,
  });

  const testObject = { a: 1, b: 2, c: 3 };

  // デフォルト設定（複数行表示）
  logger.info("複数行表示:", testObject);

  // 一時的に一行表示に変更
  logger.with({ singleLine: true }).info("一行表示:", testObject);

  // 再度デフォルト設定（複数行表示）
  logger.info("再度複数行表示:", testObject);

  // 呼び出し回数を確認
  assertSpyCalls(mockOutput.log, 3);

  // 一時的な設定が適用されていることを確認
  const multilineOutput = mockOutput.log.calls[0].args[0];
  const singlelineOutput = mockOutput.log.calls[1].args[0];
  const multilineAgainOutput = mockOutput.log.calls[2].args[0];

  // 改行の有無で表示モードを確認
  const hasNewline = (output: string) => output.includes("\n");

  expect(hasNewline(multilineOutput)).toBe(true); // 複数行表示には改行がある
  expect(hasNewline(singlelineOutput)).toBe(false); // 一行表示には改行がない
  expect(hasNewline(multilineAgainOutput)).toBe(true); // 再度複数行表示には改行がある
});
