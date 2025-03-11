import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { createLogger, LogLevel } from "../logger.ts";
import type { LogEntry } from "../types.ts";

// テスト用のロガーオプション（すべてのログレベルを表示）
const testLoggerOptions = {
  logLevel: LogLevel.DEBUG, // テスト中はすべてのログレベルを表示
};

test("displayLogEntry - JSONとArrayの文字列長制限", () => {
  const logger = createLogger("test", testLoggerOptions);

  // 大きなJSONオブジェクトを作成
  const largeObject = {
    data: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      description:
        `This is a long description for item ${i} that will contribute to the overall length of the JSON string.`,
      tags: Array.from({ length: 10 }, (_, j) => `tag-${j}`),
    })),
  };

  const entry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["大きなJSONオブジェクト", largeObject],
  };

  // 短い最大長で表示（文字列が切り詰められるはず）
  const formattedShort = logger.display(entry, { maxLength: 100 });

  // 長い最大長で表示（文字列が切り詰められないはず）
  const formattedLong = logger.display(entry, { maxLength: 10000 });

  // 短い表示では文字列が切り詰められていることを確認
  expect(formattedShort).toContain("...");
  expect(formattedShort.length).toBeLessThan(formattedLong.length);

  // 短い表示の長さが制限に近いことを確認（正確な長さは表示処理によって異なる可能性があるため、おおよその確認）
  // 実際の表示には、タイムスタンプやタグなども含まれるため、100より大きくなる
  expect(formattedShort.length).toBeLessThan(300);
});

test("displayLogEntry - 大きな配列の文字列長制限", () => {
  const logger = createLogger("test", testLoggerOptions);

  // 大きな配列を作成
  const largeArray = Array.from(
    { length: 1000 },
    (_, i) => `Item ${i} with some additional text to make it longer`,
  );

  const entry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["大きな配列", largeArray],
  };

  // 短い最大長で表示
  const formattedShort = logger.display(entry, { maxLength: 200 });

  // 長い最大長で表示
  const formattedLong = logger.display(entry, { maxLength: 10000 });

  // 短い表示では文字列が切り詰められていることを確認
  expect(formattedShort).toContain("...");
  expect(formattedShort.length).toBeLessThan(formattedLong.length);
  expect(formattedShort.length).toBeLessThan(500); // バッファを含めた概算
});

test("displayLogEntry - ネストされたオブジェクトの文字列長制限", () => {
  const logger = createLogger("test", testLoggerOptions);

  // ネストされたオブジェクトを作成
  const nestedObject = {
    level1: {
      level2: {
        level3: {
          data: Array.from({ length: 50 }, (_, i) => ({
            id: i,
            name: `Nested item ${i}`,
            properties: {
              a: `Property A for item ${i}`,
              b: `Property B for item ${i}`,
              c: `Property C for item ${i}`,
            },
          })),
        },
      },
    },
  };

  const entry: LogEntry = {
    timestamp: new Date(),
    level: LogLevel.INFO,
    tag: "test",
    args: ["ネストされたオブジェクト", nestedObject],
  };

  // 短い最大長で表示
  const formattedShort = logger.display(entry, {
    maxLength: 150,
    depth: 5, // 深いネストを表示するために深さを増やす
  });

  // 長い最大長で表示
  const formattedLong = logger.display(entry, {
    maxLength: 10000,
    depth: 5,
  });

  // 短い表示では文字列が切り詰められていることを確認
  expect(formattedShort).toContain("...");
  expect(formattedShort.length).toBeLessThan(formattedLong.length);
  expect(formattedShort.length).toBeLessThan(500); // バッファを含めた概算
});
