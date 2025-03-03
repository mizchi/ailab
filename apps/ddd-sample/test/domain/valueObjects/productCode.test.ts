import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import {
  createProductCode,
  getCategory,
  isValidProductCodeString,
  productCodeEquals,
} from "../../../domain/valueObjects/productCode.ts";
import { ValidationError } from "../../../core/result.ts";

test("createProductCode - 有効な商品コードでProductCode値オブジェクトを作成できる", () => {
  const validCodes = [
    "PROD-12345",
    "ITEM-AB-789",
    "BOOK-XYZ",
    "ELEC-PHONE",
    "FOOD-APPLE",
  ];

  for (const code of validCodes) {
    const productCodeResult = createProductCode(code);
    expect(productCodeResult.isOk(), `${code}は有効な商品コードのはず`).toBe(
      true,
    );

    if (productCodeResult.isOk()) {
      expect(String(productCodeResult.value)).toBe(code);
    }
  }
});

test("createProductCode - 空の商品コードでエラーを返す", () => {
  const productCodeResult = createProductCode("");

  expect(productCodeResult.isErr()).toBe(true);
  if (productCodeResult.isErr()) {
    expect(productCodeResult.error).toBeInstanceOf(ValidationError);
    expect(productCodeResult.error.message).toContain("商品コードは必須です");
  }
});

test("createProductCode - 長すぎる商品コードでエラーを返す", () => {
  const longCode = "PRODUCT-" + "X".repeat(20);
  const productCodeResult = createProductCode(longCode);

  expect(productCodeResult.isErr()).toBe(true);
  if (productCodeResult.isErr()) {
    expect(productCodeResult.error).toBeInstanceOf(ValidationError);
    expect(productCodeResult.error.message).toContain("商品コードが長すぎます");
  }
});

test("createProductCode - 無効な形式の商品コードでエラーを返す", () => {
  const invalidCodes = [
    "prod-12345", // 小文字
    "PROD_12345", // アンダースコア
    "PROD12345", // ハイフンなし
    "-12345", // プレフィックスなし
    "PROD-", // サフィックスなし
    "123-ABC", // 数字から始まる
  ];

  for (const code of invalidCodes) {
    const productCodeResult = createProductCode(code);

    expect(productCodeResult.isErr(), `${code}は無効な商品コードのはず`).toBe(
      true,
    );
    if (productCodeResult.isErr()) {
      expect(productCodeResult.error).toBeInstanceOf(ValidationError);
      expect(productCodeResult.error.message).toContain(
        "商品コードの形式が正しくありません",
      );
    }
  }
});

test("productCodeEquals - 同じ商品コードの等価性を判定できる", () => {
  const code1Result = createProductCode("PROD-12345");
  const code2Result = createProductCode("PROD-12345");
  const code3Result = createProductCode("ITEM-67890");

  expect(code1Result.isOk() && code2Result.isOk() && code3Result.isOk()).toBe(
    true,
  );

  if (code1Result.isOk() && code2Result.isOk() && code3Result.isOk()) {
    expect(productCodeEquals(code1Result.value, code2Result.value)).toBe(true);
    expect(productCodeEquals(code1Result.value, code3Result.value)).toBe(false);
  }
});

test("productCodeEquals - 大文字小文字を区別して比較する", () => {
  // 実際には createProductCode でバリデーションするので、テスト用に直接キャスト
  // これは本来避けるべきだが、比較ロジックをテストするためのテクニック
  const code1 = "PROD-12345" as any;
  const code2 = "prod-12345" as any;

  expect(productCodeEquals(code1, code2)).toBe(false);
});

test("isValidProductCodeString - 有効な商品コード文字列を判定できる", () => {
  const validCodes = [
    "PROD-12345",
    "ITEM-AB-789",
    "BOOK-XYZ",
  ];

  for (const code of validCodes) {
    expect(isValidProductCodeString(code), `${code}は有効な商品コードのはず`)
      .toBe(true);
  }
});

test("isValidProductCodeString - 無効な商品コード文字列を判定できる", () => {
  const invalidCodes = [
    "",
    "prod-12345", // 小文字
    "PROD_12345", // アンダースコア
    "PROD12345", // ハイフンなし
    "-12345", // プレフィックスなし
    "PROD-", // サフィックスなし
  ];

  for (const code of invalidCodes) {
    expect(isValidProductCodeString(code), `${code}は無効な商品コードのはず`)
      .toBe(false);
  }
});

test("getCategory - 商品コードから正しくカテゴリを取得できる", () => {
  const testCases = [
    { code: "PROD-12345", expectedCategory: "PROD" },
    { code: "ITEM-AB-789", expectedCategory: "ITEM" },
    { code: "BOOK-XYZ", expectedCategory: "BOOK" },
    { code: "ELEC-PHONE", expectedCategory: "ELEC" },
  ];

  for (const { code, expectedCategory } of testCases) {
    const productCodeResult = createProductCode(code);

    expect(productCodeResult.isOk(), `${code}は有効な商品コードのはず`).toBe(
      true,
    );

    if (productCodeResult.isOk()) {
      const category = getCategory(productCodeResult.value);
      expect(category).toBe(expectedCategory);
    }
  }
});

test("getCategory - ハイフンで区切られた複雑な商品コードでも正しくカテゴリを取得できる", () => {
  const code = "ITEM-AB-789";
  const productCodeResult = createProductCode(code);

  expect(productCodeResult.isOk()).toBe(true);

  if (productCodeResult.isOk()) {
    const category = getCategory(productCodeResult.value);
    expect(category).toBe("ITEM");
  }
});
