/**
 * エッジケースのテストケース
 */

import { expect, test } from "./deps.ts";
import { TypePredictor } from "./mod.ts";

test("edge - special numbers", () => {
  const predictor = new TypePredictor();
  const input = {
    numbers: {
      nan: NaN,
      infinity: Infinity,
      negativeInfinity: -Infinity,
      maxInt: Number.MAX_SAFE_INTEGER,
      minInt: Number.MIN_SAFE_INTEGER,
      maxValue: Number.MAX_VALUE,
      minValue: Number.MIN_VALUE,
      epsilon: Number.EPSILON,
    },
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("edge - empty values", () => {
  const predictor = new TypePredictor();
  const input = {
    strings: {
      empty: "",
      space: " ",
      tab: "\t",
      newline: "\n",
      multiline: "\n\n\n",
    },
    arrays: {
      empty: [],
      nested: [[], [], []],
      sparse: Array(3),
      mixed: [[], null, {}],
    },
    objects: {
      empty: {},
      nested: { a: {}, b: { c: {} } },
      nullValues: { a: null, b: null },
    },
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("edge - special characters", () => {
  const predictor = new TypePredictor();
  const input = {
    strings: {
      unicode: "こんにちは世界",
      emoji: "👋🌍🚀",
      control: "\u0000\u0001\u0002",
      surrogate: "𝌆",
      combining: "e\u0301", // é
      zero: "\0",
      quotes: "\"'`",
      escapes: "\\\r\n\t\b\f\v",
    },
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("edge - large structures", () => {
  const predictor = new TypePredictor();

  // 大きな配列
  const largeArray = Array.from({ length: 10000 }, (_, i) => i);

  // 深いネスト
  let deepNest: any = { value: 0 };
  for (let i = 0; i < 100; i++) {
    deepNest = { next: deepNest };
  }

  // 大きなオブジェクト
  const largeObject: Record<string, number> = {};
  for (let i = 0; i < 1000; i++) {
    largeObject[`key_${i}`] = i;
  }

  const input = {
    largeArray,
    deepNest,
    largeObject,
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("edge - mixed null and undefined", () => {
  const predictor = new TypePredictor();
  const input = {
    values: [null, undefined, null, undefined],
    nested: {
      a: null,
      b: undefined,
      c: { d: null, e: undefined },
    },
    mixed: [
      { value: null },
      { value: undefined },
      { other: null },
      { other: undefined },
    ],
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("edge - special objects", () => {
  const predictor = new TypePredictor();
  const input = {
    regex: /test/,
    date: new Date(),
    error: new Error("test"),
    map: new Map([["key", "value"]]),
    set: new Set([1, 2, 3]),
    buffer: new Uint8Array([1, 2, 3]),
    promise: Promise.resolve(42),
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("edge - mixed record patterns", () => {
  const predictor = new TypePredictor();
  const input = {
    // 通常のRecord型
    settings: {
      setting_theme: "dark",
      setting_lang: "en",
      setting_mode: null,
    },
    // 数値をキーに含むRecord型
    items: {
      item_1: { name: "A" },
      item_2: { name: "B" },
      item_10: { name: "C" },
    },
    // 特殊文字を含むRecord型
    data: {
      "data.key.1": 1,
      "data.key.2": 2,
      "data.key.3": null,
    },
    // 大文字小文字混在のRecord型
    config: {
      Config_Main: true,
      Config_Sub: false,
      Config_Extra: null,
    },
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("edge - array variations", () => {
  const predictor = new TypePredictor();
  const input = {
    // 異なる長さの配列
    varying: [[1], [1, 2], [1, 2, 3]],
    // 異なる型の配列
    mixed: [
      [1, "a"],
      [true, 2],
      [null, "b"],
    ],
    // スパース配列
    sparse: {
      simple: Array(3),
      nested: [Array(2), Array(3)],
      mixed: [Array(1), [1], Array(2)],
    },
    // 多次元配列
    multi: {
      d2: [
        [1, 2],
        [3, 4],
      ],
      d3: [[[1]], [[2]]],
      d4: [[[[1]]], [[[2]]]],
    },
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});
