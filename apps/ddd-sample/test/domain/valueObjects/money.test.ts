import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import {
  addMoney,
  createMoney,
  formatMoney,
  moneyEquals,
  multiplyMoney,
  subtractMoney,
} from "../../../domain/valueObjects/money.ts";
import { ValidationError } from "../../../core/result.ts";

test("createMoney - 有効な金額でMoney値オブジェクトを作成できる", () => {
  const validAmounts = [0, 1, 10.5, 100.75, 1000, 9999.99];

  for (const amount of validAmounts) {
    const moneyResult = createMoney(amount);
    expect(moneyResult.isOk(), `${amount}は有効な金額のはず`).toBe(true);

    if (moneyResult.isOk()) {
      expect(Number(moneyResult.value)).toBe(amount);
    }
  }
});

test("createMoney - 負の金額でエラーを返す", () => {
  const negativeAmounts = [-1, -10.5, -100];

  for (const amount of negativeAmounts) {
    const moneyResult = createMoney(amount);

    expect(moneyResult.isErr()).toBe(true);
    if (moneyResult.isErr()) {
      expect(moneyResult.error).toBeInstanceOf(ValidationError);
      expect(moneyResult.error.message).toContain(
        "金額は0以上である必要があります",
      );
    }
  }
});

test("createMoney - 小数点以下3桁以上の金額でエラーを返す", () => {
  const invalidPrecisionAmounts = [10.123, 100.005, 0.001];

  for (const amount of invalidPrecisionAmounts) {
    const moneyResult = createMoney(amount);

    expect(moneyResult.isErr()).toBe(true);
    if (moneyResult.isErr()) {
      expect(moneyResult.error).toBeInstanceOf(ValidationError);
      expect(moneyResult.error.message).toContain(
        "金額は小数点以下2桁までしか指定できません",
      );
    }
  }
});

test("addMoney - 金額を正しく加算できる", () => {
  const money1Result = createMoney(100);
  const money2Result = createMoney(200.50);

  expect(money1Result.isOk() && money2Result.isOk()).toBe(true);

  if (money1Result.isOk() && money2Result.isOk()) {
    const sum = addMoney(money1Result.value, money2Result.value);
    expect(Number(sum)).toBe(300.50);
  }
});

test("subtractMoney - 金額を正しく減算できる", () => {
  const money1Result = createMoney(200);
  const money2Result = createMoney(50.25);

  expect(money1Result.isOk() && money2Result.isOk()).toBe(true);

  if (money1Result.isOk() && money2Result.isOk()) {
    const diffResult = subtractMoney(money1Result.value, money2Result.value);

    expect(diffResult.isOk()).toBe(true);
    if (diffResult.isOk()) {
      expect(Number(diffResult.value)).toBe(149.75);
    }
  }
});

test("subtractMoney - 減算結果が負になる場合エラーを返す", () => {
  const money1Result = createMoney(50);
  const money2Result = createMoney(100);

  expect(money1Result.isOk() && money2Result.isOk()).toBe(true);

  if (money1Result.isOk() && money2Result.isOk()) {
    const diffResult = subtractMoney(money1Result.value, money2Result.value);

    expect(diffResult.isErr()).toBe(true);
    if (diffResult.isErr()) {
      expect(diffResult.error).toBeInstanceOf(ValidationError);
      expect(diffResult.error.message).toContain(
        "金額の減算結果が負の値になりました",
      );
    }
  }
});

test("multiplyMoney - 金額を正しく乗算できる", () => {
  const moneyResult = createMoney(10.5);

  expect(moneyResult.isOk()).toBe(true);

  if (moneyResult.isOk()) {
    const productResult = multiplyMoney(moneyResult.value, 3);

    expect(productResult.isOk()).toBe(true);
    if (productResult.isOk()) {
      expect(Number(productResult.value)).toBe(31.5);
    }
  }
});

test("multiplyMoney - 乗算結果を小数点以下2桁に丸める", () => {
  const moneyResult = createMoney(10);

  expect(moneyResult.isOk()).toBe(true);

  if (moneyResult.isOk()) {
    const productResult = multiplyMoney(moneyResult.value, 0.333);

    expect(productResult.isOk()).toBe(true);
    if (productResult.isOk()) {
      // 10 * 0.333 = 3.33 (丸められる)
      expect(Number(productResult.value)).toBe(3.33);
    }
  }
});

test("multiplyMoney - 負の乗数でエラーを返す", () => {
  const moneyResult = createMoney(10);

  expect(moneyResult.isOk()).toBe(true);

  if (moneyResult.isOk()) {
    const productResult = multiplyMoney(moneyResult.value, -2);

    expect(productResult.isErr()).toBe(true);
    if (productResult.isErr()) {
      expect(productResult.error).toBeInstanceOf(ValidationError);
      expect(productResult.error.message).toContain(
        "乗数は0以上である必要があります",
      );
    }
  }
});

test("moneyEquals - 同じ金額の等価性を判定できる", () => {
  const money1Result = createMoney(100);
  const money2Result = createMoney(100);
  const money3Result = createMoney(200);

  expect(money1Result.isOk() && money2Result.isOk() && money3Result.isOk())
    .toBe(true);

  if (money1Result.isOk() && money2Result.isOk() && money3Result.isOk()) {
    expect(moneyEquals(money1Result.value, money2Result.value)).toBe(true);
    expect(moneyEquals(money1Result.value, money3Result.value)).toBe(false);
  }
});

test("formatMoney - 金額を正しくフォーマットできる", () => {
  const testCases = [
    { amount: 0, expected: "¥0" },
    { amount: 1, expected: "¥1" },
    { amount: 1000, expected: "¥1,000" },
    { amount: 1234.56, expected: "¥1,234.56" },
  ];

  for (const { amount, expected } of testCases) {
    const moneyResult = createMoney(amount);

    expect(moneyResult.isOk(), `${amount}は有効な金額のはず`).toBe(true);

    if (moneyResult.isOk()) {
      const formatted = formatMoney(moneyResult.value);
      expect(formatted).toBe(expected);
    }
  }
});
