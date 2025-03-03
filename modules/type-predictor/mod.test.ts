/**
 * 型予測システムのメインモジュールのテスト
 */

import { expect, test } from "./deps.ts";
import { TypePredictor } from "./mod.ts";

test("TypePredictor - predict simple object", () => {
  const predictor = new TypePredictor();
  const input = {
    name: "John",
    age: 30,
    active: true,
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("TypePredictor - predict complex object", () => {
  const predictor = new TypePredictor();
  const input = {
    user: {
      name: "John",
      scores: [85, 92, 78],
      contact: {
        email: "john@example.com",
        phone: null,
      },
      preferences: {
        theme_dark: true,
        theme_light: false,
      },
    },
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("TypePredictor - analyze data structure", () => {
  const predictor = new TypePredictor();
  const input = {
    name: "John",
    age: 30,
  };

  const analysis = predictor.analyze(input);
  expect(analysis.paths).toBeDefined();
  expect(analysis.structure).toBeDefined();
  expect(analysis.predictions).toBeDefined();
});

// FIMME
test.skip("TypePredictor - handle edge cases", () => {
  const predictor = new TypePredictor();

  // 空のオブジェクト
  const emptySchema = predictor.predict({});
  expect(emptySchema.safeParse({}).success).toBe(true);

  // // null
  const nullSchema = predictor.predict(null);
  expect(nullSchema.safeParse(null).success).toBe(true);

  // // 空の配列
  const emptyArraySchema = predictor.predict([]);
  expect(emptyArraySchema.safeParse([]).success).toBe(true);

  // -----Error-----
  // 単一の値の配列
  const numberArraySchema = predictor.predict([1, 2, 3]);
  expect(numberArraySchema.safeParse([4, 5, 6]).success).toBe(true);

  // 混合型の配列
  const mixedArraySchema = predictor.predict([1, "two", true]);
  expect(mixedArraySchema.safeParse([2, "three", false]).success).toBe(true);
});

test("TypePredictor - validate against invalid data", () => {
  const predictor = new TypePredictor();
  const input = {
    name: "John",
    age: 30,
  };

  const schema = predictor.predict(input);

  // 型が一致しないデータ
  const invalidResult = schema.safeParse({
    name: 123, // should be string
    age: "30", // should be number
  });
  expect(invalidResult.success).toBe(false);
});
