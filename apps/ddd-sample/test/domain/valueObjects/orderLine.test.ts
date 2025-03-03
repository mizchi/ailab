import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import {
  calculateSubtotal,
  changeQuantity,
  changeUnitPrice,
  createOrderLine,
  type OrderLine,
  orderLineEquals,
} from "../../../domain/valueObjects/orderLine.ts";
import type { Money, ProductId } from "../../../domain/types.ts";
import { ValidationError } from "../../../core/result.ts";
import type { createMoney } from "../../../domain/valueObjects/money.ts";
import type { createQuantity } from "../../../domain/valueObjects/quantity.ts";

// テスト用のヘルパー関数
function createTestProductId(): ProductId {
  return "prod_test123456" as ProductId;
}

function createValidOrderLineParams() {
  return {
    productId: createTestProductId(),
    quantity: 2,
    unitPrice: 1000,
  };
}

test("createOrderLine - 有効なパラメータでOrderLine値オブジェクトを作成できる", () => {
  const params = createValidOrderLineParams();
  const orderLineResult = createOrderLine(params);

  expect(orderLineResult.isOk()).toBe(true);
  if (orderLineResult.isOk()) {
    const orderLine = orderLineResult.value;
    expect(orderLine.productId).toBe(params.productId);
    expect(Number(orderLine.quantity)).toBe(params.quantity);
    expect(Number(orderLine.unitPrice)).toBe(params.unitPrice);
  }
});

test("createOrderLine - 無効な数量でエラーを返す", () => {
  const params = {
    ...createValidOrderLineParams(),
    quantity: 0, // 無効な数量
  };

  const orderLineResult = createOrderLine(params);

  expect(orderLineResult.isErr()).toBe(true);
  if (orderLineResult.isErr()) {
    expect(orderLineResult.error).toBeInstanceOf(ValidationError);
    expect(orderLineResult.error.message).toContain(
      "数量は1以上である必要があります",
    );
  }
});

test("createOrderLine - 無効な単価でエラーを返す", () => {
  const params = {
    ...createValidOrderLineParams(),
    unitPrice: -100, // 無効な単価
  };

  const orderLineResult = createOrderLine(params);

  expect(orderLineResult.isErr()).toBe(true);
  if (orderLineResult.isErr()) {
    expect(orderLineResult.error).toBeInstanceOf(ValidationError);
    expect(orderLineResult.error.message).toContain(
      "金額は0以上である必要があります",
    );
  }
});

test("calculateSubtotal - 注文明細の小計を正しく計算できる", () => {
  const params = createValidOrderLineParams();
  const orderLineResult = createOrderLine(params);

  expect(orderLineResult.isOk()).toBe(true);
  if (orderLineResult.isOk()) {
    const subtotalResult = calculateSubtotal(orderLineResult.value);

    expect(subtotalResult.isOk()).toBe(true);
    if (subtotalResult.isOk()) {
      // 数量2 × 単価1000 = 2000
      expect(Number(subtotalResult.value)).toBe(2000);
    }
  }
});

test("orderLineEquals - 同じ注文明細の等価性を判定できる", () => {
  const params1 = createValidOrderLineParams();
  const params2 = createValidOrderLineParams();
  const params3 = {
    ...createValidOrderLineParams(),
    quantity: 3, // 数量が異なる
  };

  const orderLine1Result = createOrderLine(params1);
  const orderLine2Result = createOrderLine(params2);
  const orderLine3Result = createOrderLine(params3);

  expect(
    orderLine1Result.isOk() && orderLine2Result.isOk() &&
      orderLine3Result.isOk(),
  ).toBe(true);

  if (
    orderLine1Result.isOk() && orderLine2Result.isOk() &&
    orderLine3Result.isOk()
  ) {
    expect(orderLineEquals(orderLine1Result.value, orderLine2Result.value))
      .toBe(true);
    expect(orderLineEquals(orderLine1Result.value, orderLine3Result.value))
      .toBe(false);
  }
});

test("changeQuantity - 数量を変更した新しい注文明細を作成できる", () => {
  const params = createValidOrderLineParams();
  const orderLineResult = createOrderLine(params);

  expect(orderLineResult.isOk()).toBe(true);
  if (orderLineResult.isOk()) {
    const newQuantity = 5;
    const changedResult = changeQuantity(orderLineResult.value, newQuantity);

    expect(changedResult.isOk()).toBe(true);
    if (changedResult.isOk()) {
      const changedOrderLine = changedResult.value;

      // 数量が変更されている
      expect(Number(changedOrderLine.quantity)).toBe(newQuantity);

      // 他のプロパティは変更されていない
      expect(changedOrderLine.productId).toBe(params.productId);
      expect(Number(changedOrderLine.unitPrice)).toBe(params.unitPrice);

      // 元のオブジェクトは変更されていない（不変性）
      expect(Number(orderLineResult.value.quantity)).toBe(params.quantity);
    }
  }
});

test("changeQuantity - 無効な数量で変更するとエラーを返す", () => {
  const params = createValidOrderLineParams();
  const orderLineResult = createOrderLine(params);

  expect(orderLineResult.isOk()).toBe(true);
  if (orderLineResult.isOk()) {
    const newQuantity = 0; // 無効な数量
    const changedResult = changeQuantity(orderLineResult.value, newQuantity);

    expect(changedResult.isErr()).toBe(true);
    if (changedResult.isErr()) {
      expect(changedResult.error).toBeInstanceOf(ValidationError);
      expect(changedResult.error.message).toContain(
        "数量は1以上である必要があります",
      );
    }
  }
});

test("changeUnitPrice - 単価を変更した新しい注文明細を作成できる", () => {
  const params = createValidOrderLineParams();
  const orderLineResult = createOrderLine(params);

  expect(orderLineResult.isOk()).toBe(true);
  if (orderLineResult.isOk()) {
    const newUnitPrice = 1500;
    const changedResult = changeUnitPrice(orderLineResult.value, newUnitPrice);

    expect(changedResult.isOk()).toBe(true);
    if (changedResult.isOk()) {
      const changedOrderLine = changedResult.value;

      // 単価が変更されている
      expect(Number(changedOrderLine.unitPrice)).toBe(newUnitPrice);

      // 他のプロパティは変更されていない
      expect(changedOrderLine.productId).toBe(params.productId);
      expect(Number(changedOrderLine.quantity)).toBe(params.quantity);

      // 元のオブジェクトは変更されていない（不変性）
      expect(Number(orderLineResult.value.unitPrice)).toBe(params.unitPrice);
    }
  }
});

test("changeUnitPrice - 無効な単価で変更するとエラーを返す", () => {
  const params = createValidOrderLineParams();
  const orderLineResult = createOrderLine(params);

  expect(orderLineResult.isOk()).toBe(true);
  if (orderLineResult.isOk()) {
    const newUnitPrice = -100; // 無効な単価
    const changedResult = changeUnitPrice(orderLineResult.value, newUnitPrice);

    expect(changedResult.isErr()).toBe(true);
    if (changedResult.isErr()) {
      expect(changedResult.error).toBeInstanceOf(ValidationError);
      expect(changedResult.error.message).toContain(
        "金額は0以上である必要があります",
      );
    }
  }
});

test("複合テスト - 注文明細の作成、変更、小計計算の一連の流れ", () => {
  // 1. 注文明細の作成
  const params = createValidOrderLineParams();
  const orderLineResult = createOrderLine(params);

  expect(orderLineResult.isOk()).toBe(true);

  if (orderLineResult.isOk()) {
    // 2. 数量の変更
    const newQuantity = 3;
    const changedQuantityResult = changeQuantity(
      orderLineResult.value,
      newQuantity,
    );

    expect(changedQuantityResult.isOk()).toBe(true);

    if (changedQuantityResult.isOk()) {
      // 3. 単価の変更
      const newUnitPrice = 1200;
      const changedUnitPriceResult = changeUnitPrice(
        changedQuantityResult.value,
        newUnitPrice,
      );

      expect(changedUnitPriceResult.isOk()).toBe(true);

      if (changedUnitPriceResult.isOk()) {
        // 4. 小計計算
        const subtotalResult = calculateSubtotal(changedUnitPriceResult.value);

        expect(subtotalResult.isOk()).toBe(true);

        if (subtotalResult.isOk()) {
          // 新しい数量3 × 新しい単価1200 = 3600
          expect(Number(subtotalResult.value)).toBe(3600);
        }
      }
    }
  }
});
