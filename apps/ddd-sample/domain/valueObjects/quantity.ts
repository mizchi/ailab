/**
 * Quantity値オブジェクトの実装
 * 不変かつ正の数量を表現する
 */
import type { Quantity } from "../types.ts";
import { err, ok, type Result, ValidationError } from "../../core/result.ts";

/**
 * Quantity値オブジェクトを作成する
 * @param value 数量
 * @returns Result<Quantity, ValidationError>
 */
export function createQuantity(
  value: number,
): Result<Quantity, ValidationError> {
  // 整数チェック
  if (!Number.isInteger(value)) {
    return err(new ValidationError("数量は整数である必要があります"));
  }

  // 正の値チェック
  if (value <= 0) {
    return err(new ValidationError("数量は1以上である必要があります"));
  }

  // 上限チェック（例えば在庫管理の都合など）
  if (value > 10000) {
    return err(new ValidationError("数量が多すぎます（最大10000個）"));
  }

  // ブランド付きの型として返す
  return ok(value as Quantity);
}

/**
 * Quantity同士の加算を行う
 * @param a 数量A
 * @param b 数量B
 * @returns Result<Quantity, ValidationError> 合計数量
 */
export function addQuantity(
  a: Quantity,
  b: Quantity,
): Result<Quantity, ValidationError> {
  return createQuantity(a + b);
}

/**
 * Quantity同士の減算を行う
 * @param a 数量A
 * @param b 数量B
 * @returns Result<Quantity, ValidationError> 減算結果
 */
export function subtractQuantity(
  a: Quantity,
  b: Quantity,
): Result<Quantity, ValidationError> {
  return createQuantity(a - b);
}

/**
 * Quantity同士の等価性を判定する
 * @param a 数量A
 * @param b 数量B
 * @returns 等価ならtrue
 */
export function quantityEquals(a: Quantity, b: Quantity): boolean {
  return a === b;
}

/**
 * 通常の数値をQuantityに変換する（バリデーションあり）
 * @param value 数値
 * @returns Result<Quantity, ValidationError>
 */
export function toQuantity(value: number): Result<Quantity, ValidationError> {
  return createQuantity(value);
}

/**
 * Quantityを通常の数値として取得する
 * @param quantity 数量
 * @returns 数値
 */
export function fromQuantity(quantity: Quantity): number {
  return quantity;
}
