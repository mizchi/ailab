import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import {
  addQuantity,
  createQuantity,
  fromQuantity,
  quantityEquals,
  subtractQuantity,
  toQuantity,
} from "../../../domain/valueObjects/quantity.ts";
import { ValidationError } from "../../../core/result.ts";

test("createQuantity - 有効な数量でQuantity値オブジェクトを作成できる", () => {
  const validQuantities = [1, 5, 100, 1000, 9999];

  for (const value of validQuantities) {
    const quantityResult = createQuantity(value);
    expect(quantityResult.isOk(), `${value}は有効な数量のはず`).toBe(true);

    if (quantityResult.isOk()) {
      expect(Number(quantityResult.value)).toBe(value);
    }
  }
});

test("createQuantity - 整数でない数量でエラーを返す", () => {
  const nonIntegerValues = [1.5, 3.14, 10.9];

  for (const value of nonIntegerValues) {
    const quantityResult = createQuantity(value);

    expect(quantityResult.isErr()).toBe(true);
    if (quantityResult.isErr()) {
      expect(quantityResult.error).toBeInstanceOf(ValidationError);
      expect(quantityResult.error.message).toContain(
        "数量は整数である必要があります",
      );
    }
  }
});

test("createQuantity - 0以下の数量でエラーを返す", () => {
  const nonPositiveValues = [0, -1, -10];

  for (const value of nonPositiveValues) {
    const quantityResult = createQuantity(value);

    expect(quantityResult.isErr()).toBe(true);
    if (quantityResult.isErr()) {
      expect(quantityResult.error).toBeInstanceOf(ValidationError);
      expect(quantityResult.error.message).toContain(
        "数量は1以上である必要があります",
      );
    }
  }
});

test("createQuantity - 上限を超える数量でエラーを返す", () => {
  const tooLargeValues = [10001, 20000, 100000];

  for (const value of tooLargeValues) {
    const quantityResult = createQuantity(value);

    expect(quantityResult.isErr()).toBe(true);
    if (quantityResult.isErr()) {
      expect(quantityResult.error).toBeInstanceOf(ValidationError);
      expect(quantityResult.error.message).toContain(
        "数量が多すぎます（最大10000個）",
      );
    }
  }
});

test("addQuantity - 数量を正しく加算できる", () => {
  const quantity1Result = createQuantity(3);
  const quantity2Result = createQuantity(5);

  expect(quantity1Result.isOk() && quantity2Result.isOk()).toBe(true);

  if (quantity1Result.isOk() && quantity2Result.isOk()) {
    const sumResult = addQuantity(quantity1Result.value, quantity2Result.value);

    expect(sumResult.isOk()).toBe(true);
    if (sumResult.isOk()) {
      expect(Number(sumResult.value)).toBe(8);
    }
  }
});

test("addQuantity - 加算結果が上限を超える場合エラーを返す", () => {
  const quantity1Result = createQuantity(9000);
  const quantity2Result = createQuantity(2000);

  expect(quantity1Result.isOk() && quantity2Result.isOk()).toBe(true);

  if (quantity1Result.isOk() && quantity2Result.isOk()) {
    const sumResult = addQuantity(quantity1Result.value, quantity2Result.value);

    expect(sumResult.isErr()).toBe(true);
    if (sumResult.isErr()) {
      expect(sumResult.error).toBeInstanceOf(ValidationError);
      expect(sumResult.error.message).toContain(
        "数量が多すぎます（最大10000個）",
      );
    }
  }
});

test("subtractQuantity - 数量を正しく減算できる", () => {
  const quantity1Result = createQuantity(10);
  const quantity2Result = createQuantity(3);

  expect(quantity1Result.isOk() && quantity2Result.isOk()).toBe(true);

  if (quantity1Result.isOk() && quantity2Result.isOk()) {
    const diffResult = subtractQuantity(
      quantity1Result.value,
      quantity2Result.value,
    );

    expect(diffResult.isOk()).toBe(true);
    if (diffResult.isOk()) {
      expect(Number(diffResult.value)).toBe(7);
    }
  }
});

test("subtractQuantity - 減算結果が0以下になる場合エラーを返す", () => {
  const quantity1Result = createQuantity(3);
  const quantity2Result = createQuantity(5);

  expect(quantity1Result.isOk() && quantity2Result.isOk()).toBe(true);

  if (quantity1Result.isOk() && quantity2Result.isOk()) {
    const diffResult = subtractQuantity(
      quantity1Result.value,
      quantity2Result.value,
    );

    expect(diffResult.isErr()).toBe(true);
    if (diffResult.isErr()) {
      expect(diffResult.error).toBeInstanceOf(ValidationError);
      expect(diffResult.error.message).toContain(
        "数量は1以上である必要があります",
      );
    }
  }
});

test("quantityEquals - 同じ数量の等価性を判定できる", () => {
  const quantity1Result = createQuantity(5);
  const quantity2Result = createQuantity(5);
  const quantity3Result = createQuantity(10);

  expect(
    quantity1Result.isOk() && quantity2Result.isOk() && quantity3Result.isOk(),
  ).toBe(true);

  if (
    quantity1Result.isOk() && quantity2Result.isOk() && quantity3Result.isOk()
  ) {
    expect(quantityEquals(quantity1Result.value, quantity2Result.value)).toBe(
      true,
    );
    expect(quantityEquals(quantity1Result.value, quantity3Result.value)).toBe(
      false,
    );
  }
});

test("toQuantity - 数値をQuantityに変換できる", () => {
  const validValue = 5;
  const quantityResult = toQuantity(validValue);

  expect(quantityResult.isOk()).toBe(true);
  if (quantityResult.isOk()) {
    expect(Number(quantityResult.value)).toBe(validValue);
  }
});

test("toQuantity - 無効な数値でエラーを返す", () => {
  const invalidValues = [0, -1, 1.5, 20000];

  for (const value of invalidValues) {
    const quantityResult = toQuantity(value);

    expect(quantityResult.isErr()).toBe(true);
    if (quantityResult.isErr()) {
      expect(quantityResult.error).toBeInstanceOf(ValidationError);
    }
  }
});

test("fromQuantity - Quantityを数値として取得できる", () => {
  const value = 5;
  const quantityResult = createQuantity(value);

  expect(quantityResult.isOk()).toBe(true);
  if (quantityResult.isOk()) {
    const extractedValue = fromQuantity(quantityResult.value);
    expect(extractedValue).toBe(value);
  }
});
