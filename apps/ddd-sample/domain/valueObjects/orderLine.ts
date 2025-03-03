/**
 * OrderLine（注文明細）値オブジェクトの実装
 * 商品ID、数量、単価を持つ不変オブジェクト
 */
import type { Money, ProductId, Quantity } from "../types.ts";
import {
  type combine,
  err,
  ok,
  type Result,
  type ValidationError,
} from "../../core/result.ts";
import { createQuantity } from "./quantity.ts";
import { createMoney, multiplyMoney } from "./money.ts";

/**
 * 注文明細（OrderLine）の構造
 */
export interface OrderLine {
  readonly productId: ProductId;
  readonly quantity: Quantity;
  readonly unitPrice: Money;
}

/**
 * OrderLine作成用のパラメータ
 */
export interface CreateOrderLineParams {
  productId: ProductId;
  quantity: number;
  unitPrice: number;
}

/**
 * OrderLine値オブジェクトを作成する
 * @param params 注文明細作成パラメータ
 * @returns Result<OrderLine, ValidationError>
 */
export function createOrderLine(
  params: CreateOrderLineParams,
): Result<OrderLine, ValidationError> {
  // 各フィールドのバリデーション
  const quantityResult = createQuantity(params.quantity);
  const unitPriceResult = createMoney(params.unitPrice);

  // 各フィールドのバリデーション結果を個別に処理
  if (quantityResult.isErr()) {
    return err(quantityResult.error);
  }

  if (unitPriceResult.isErr()) {
    return err(unitPriceResult.error);
  }

  // すべての値が正常なら新しいオブジェクトを作成
  return ok({
    productId: params.productId,
    quantity: quantityResult.value,
    unitPrice: unitPriceResult.value,
  });
}

/**
 * 注文明細の小計を計算する
 * @param orderLine 注文明細
 * @returns Result<Money, ValidationError> 小計金額
 */
export function calculateSubtotal(
  orderLine: OrderLine,
): Result<Money, ValidationError> {
  return multiplyMoney(orderLine.unitPrice, orderLine.quantity);
}

/**
 * OrderLine同士の等価性を判定する
 * @param a 注文明細A
 * @param b 注文明細B
 * @returns 等価ならtrue
 */
export function orderLineEquals(a: OrderLine, b: OrderLine): boolean {
  return (
    a.productId === b.productId &&
    a.quantity === b.quantity &&
    a.unitPrice === b.unitPrice
  );
}

/**
 * 注文明細の数量を変更した新しい注文明細を作成する
 * @param orderLine 元の注文明細
 * @param newQuantity 新しい数量
 * @returns Result<OrderLine, ValidationError> 新しい注文明細
 */
export function changeQuantity(
  orderLine: OrderLine,
  newQuantity: number,
): Result<OrderLine, ValidationError> {
  const quantityResult = createQuantity(newQuantity);

  if (quantityResult.isErr()) {
    return err(quantityResult.error);
  }

  // 不変性を保つため、新しいオブジェクトを作成して返す
  return ok({
    ...orderLine,
    quantity: quantityResult.value,
  });
}

/**
 * 注文明細の単価を変更した新しい注文明細を作成する
 * @param orderLine 元の注文明細
 * @param newUnitPrice 新しい単価
 * @returns Result<OrderLine, ValidationError> 新しい注文明細
 */
export function changeUnitPrice(
  orderLine: OrderLine,
  newUnitPrice: number,
): Result<OrderLine, ValidationError> {
  const unitPriceResult = createMoney(newUnitPrice);

  if (unitPriceResult.isErr()) {
    return err(unitPriceResult.error);
  }

  // 不変性を保つため、新しいオブジェクトを作成して返す
  return ok({
    ...orderLine,
    unitPrice: unitPriceResult.value,
  });
}
