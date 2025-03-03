import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import {
  generateCustomerId,
  generateOrderId,
  generateProductId,
  idEquals,
  validateCustomerId,
  validateOrderId,
  validateProductId,
} from "../../../domain/valueObjects/ids.ts";
import type { CustomerId, OrderId, ProductId } from "../../../domain/types.ts";
import { ValidationError } from "../../../core/result.ts";

test("generateCustomerId - 有効な形式の顧客IDを生成できる", () => {
  const customerId = generateCustomerId();

  expect(typeof customerId).toBe("string");
  expect(customerId.startsWith("cust_")).toBe(true);
  expect(customerId.length).toBeGreaterThanOrEqual(15); // "cust_" + 少なくとも10文字のランダム文字列
});

test("validateCustomerId - 有効な形式の顧客IDを検証できる", () => {
  const validIds = [
    "cust_123456789abc",
    "cust_abcdef123456",
    "cust_" + "a".repeat(20),
  ];

  for (const id of validIds) {
    const result = validateCustomerId(id);
    expect(result.isOk(), `${id}は有効なIDのはず`).toBe(true);

    if (result.isOk()) {
      expect(String(result.value)).toBe(id);
    }
  }
});

test("validateCustomerId - 空の顧客IDでエラーを返す", () => {
  const result = validateCustomerId("");

  expect(result.isErr()).toBe(true);
  if (result.isErr()) {
    expect(result.error).toBeInstanceOf(ValidationError);
    expect(result.error.message).toContain("顧客IDは必須です");
  }
});

test("validateCustomerId - 無効な形式の顧客IDでエラーを返す", () => {
  const invalidIds = [
    "customer_123456", // プレフィックスが異なる
    "cust-123456", // アンダースコアではなくハイフン
    "cust_12345", // 短すぎる
    "CUST_123456789", // 大文字
    "123456_cust", // プレフィックスが後ろにある
  ];

  for (const id of invalidIds) {
    const result = validateCustomerId(id);

    expect(result.isErr(), `${id}は無効なIDのはず`).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.message).toContain("顧客IDの形式が正しくありません");
    }
  }
});

test("generateProductId - 有効な形式の商品IDを生成できる", () => {
  const productId = generateProductId();

  expect(typeof productId).toBe("string");
  expect(productId.startsWith("prod_")).toBe(true);
  expect(productId.length).toBeGreaterThanOrEqual(15); // "prod_" + 少なくとも10文字のランダム文字列
});

test("validateProductId - 有効な形式の商品IDを検証できる", () => {
  const validIds = [
    "prod_123456789abc",
    "prod_abcdef123456",
    "prod_" + "a".repeat(20),
  ];

  for (const id of validIds) {
    const result = validateProductId(id);
    expect(result.isOk(), `${id}は有効なIDのはず`).toBe(true);

    if (result.isOk()) {
      expect(String(result.value)).toBe(id);
    }
  }
});

test("validateProductId - 空の商品IDでエラーを返す", () => {
  const result = validateProductId("");

  expect(result.isErr()).toBe(true);
  if (result.isErr()) {
    expect(result.error).toBeInstanceOf(ValidationError);
    expect(result.error.message).toContain("商品IDは必須です");
  }
});

test("validateProductId - 無効な形式の商品IDでエラーを返す", () => {
  const invalidIds = [
    "product_123456", // プレフィックスが異なる
    "prod-123456", // アンダースコアではなくハイフン
    "prod_12345", // 短すぎる
    "PROD_123456789", // 大文字
    "123456_prod", // プレフィックスが後ろにある
  ];

  for (const id of invalidIds) {
    const result = validateProductId(id);

    expect(result.isErr(), `${id}は無効なIDのはず`).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.message).toContain("商品IDの形式が正しくありません");
    }
  }
});

test("generateOrderId - 有効な形式の注文IDを生成できる", () => {
  const orderId = generateOrderId();

  expect(typeof orderId).toBe("string");
  expect(orderId.startsWith("ord_")).toBe(true);
  expect(orderId.length).toBeGreaterThanOrEqual(14); // "ord_" + 少なくとも10文字のランダム文字列
});

test("validateOrderId - 有効な形式の注文IDを検証できる", () => {
  const validIds = [
    "ord_123456789abc",
    "ord_abcdef123456",
    "ord_" + "a".repeat(20),
  ];

  for (const id of validIds) {
    const result = validateOrderId(id);
    expect(result.isOk(), `${id}は有効なIDのはず`).toBe(true);

    if (result.isOk()) {
      expect(String(result.value)).toBe(id);
    }
  }
});

test("validateOrderId - 空の注文IDでエラーを返す", () => {
  const result = validateOrderId("");

  expect(result.isErr()).toBe(true);
  if (result.isErr()) {
    expect(result.error).toBeInstanceOf(ValidationError);
    expect(result.error.message).toContain("注文IDは必須です");
  }
});

test("validateOrderId - 無効な形式の注文IDでエラーを返す", () => {
  const invalidIds = [
    "order_123456", // プレフィックスが異なる
    "ord-123456", // アンダースコアではなくハイフン
    "ord_12345", // 短すぎる
    "ORD_123456789", // 大文字
    "123456_ord", // プレフィックスが後ろにある
  ];

  for (const id of invalidIds) {
    const result = validateOrderId(id);

    expect(result.isErr(), `${id}は無効なIDのはず`).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.message).toContain("注文IDの形式が正しくありません");
    }
  }
});

test("idEquals - 同じIDの等価性を判定できる", () => {
  // 顧客ID
  const customerId1: CustomerId = "cust_123456789abc" as CustomerId;
  const customerId2: CustomerId = "cust_123456789abc" as CustomerId;
  const customerId3: CustomerId = "cust_differentid" as CustomerId;

  expect(idEquals(customerId1, customerId2)).toBe(true);
  expect(idEquals(customerId1, customerId3)).toBe(false);

  // 商品ID
  const productId1: ProductId = "prod_123456789abc" as ProductId;
  const productId2: ProductId = "prod_123456789abc" as ProductId;
  const productId3: ProductId = "prod_differentid" as ProductId;

  expect(idEquals(productId1, productId2)).toBe(true);
  expect(idEquals(productId1, productId3)).toBe(false);

  // 注文ID
  const orderId1: OrderId = "ord_123456789abc" as OrderId;
  const orderId2: OrderId = "ord_123456789abc" as OrderId;
  const orderId3: OrderId = "ord_differentid" as OrderId;

  expect(idEquals(orderId1, orderId2)).toBe(true);
  expect(idEquals(orderId1, orderId3)).toBe(false);
});

test("IDの生成と検証の組み合わせテスト", () => {
  // 顧客ID
  const customerId = generateCustomerId();
  const customerIdResult = validateCustomerId(customerId);

  expect(customerIdResult.isOk()).toBe(true);
  if (customerIdResult.isOk()) {
    expect(customerIdResult.value).toBe(customerId);
  }

  // 商品ID
  const productId = generateProductId();
  const productIdResult = validateProductId(productId);

  expect(productIdResult.isOk()).toBe(true);
  if (productIdResult.isOk()) {
    expect(productIdResult.value).toBe(productId);
  }

  // 注文ID
  const orderId = generateOrderId();
  const orderIdResult = validateOrderId(orderId);

  expect(orderIdResult.isOk()).toBe(true);
  if (orderIdResult.isOk()) {
    expect(orderIdResult.value).toBe(orderId);
  }
});
