/**
 * ID値オブジェクトの実装
 * 各エンティティのID生成と検証のためのユーティリティ関数
 */
import type { CustomerId, OrderId, ProductId } from "../types.ts";
import { err, ok, type Result, ValidationError } from "../../core/result.ts";

/**
 * ID用のバリデーション正規表現
 * 例: "cust_123456", "prod_abcdef", "ord_xyz789"
 */
const CUSTOMER_ID_REGEX = /^cust_[a-z0-9]{6,}$/;
const PRODUCT_ID_REGEX = /^prod_[a-z0-9]{6,}$/;
const ORDER_ID_REGEX = /^ord_[a-z0-9]{6,}$/;

/**
 * ランダムな文字列を生成
 * @param length 文字列の長さ
 * @returns ランダム文字列
 */
function generateRandomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}

/**
 * 新しい顧客IDを生成
 * @returns CustomerId
 */
export function generateCustomerId(): CustomerId {
  return `cust_${generateRandomString(10)}` as CustomerId;
}

/**
 * 顧客IDの検証
 * @param id 検証する顧客ID
 * @returns Result<CustomerId, ValidationError>
 */
export function validateCustomerId(
  id: string,
): Result<CustomerId, ValidationError> {
  if (!id) {
    return err(new ValidationError("顧客IDは必須です"));
  }

  if (!CUSTOMER_ID_REGEX.test(id)) {
    return err(
      new ValidationError("顧客IDの形式が正しくありません (例: cust_123456)"),
    );
  }

  return ok(id as CustomerId);
}

/**
 * 新しい商品IDを生成
 * @returns ProductId
 */
export function generateProductId(): ProductId {
  return `prod_${generateRandomString(10)}` as ProductId;
}

/**
 * 商品IDの検証
 * @param id 検証する商品ID
 * @returns Result<ProductId, ValidationError>
 */
export function validateProductId(
  id: string,
): Result<ProductId, ValidationError> {
  if (!id) {
    return err(new ValidationError("商品IDは必須です"));
  }

  if (!PRODUCT_ID_REGEX.test(id)) {
    return err(
      new ValidationError("商品IDの形式が正しくありません (例: prod_123456)"),
    );
  }

  return ok(id as ProductId);
}

/**
 * 新しい注文IDを生成
 * @returns OrderId
 */
export function generateOrderId(): OrderId {
  return `ord_${generateRandomString(10)}` as OrderId;
}

/**
 * 注文IDの検証
 * @param id 検証する注文ID
 * @returns Result<OrderId, ValidationError>
 */
export function validateOrderId(id: string): Result<OrderId, ValidationError> {
  if (!id) {
    return err(new ValidationError("注文IDは必須です"));
  }

  if (!ORDER_ID_REGEX.test(id)) {
    return err(
      new ValidationError("注文IDの形式が正しくありません (例: ord_123456)"),
    );
  }

  return ok(id as OrderId);
}

/**
 * ID同士の等価性を判定する汎用関数
 * @param a ID A
 * @param b ID B
 * @returns 等価ならtrue
 */
export function idEquals<T>(a: T, b: T): boolean {
  return a === b;
}
