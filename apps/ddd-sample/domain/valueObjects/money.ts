/**
 * Money値オブジェクトの実装
 * 不変かつ等価性が値によって決まる金額を表現
 */
import type { Money } from "../types.ts";
import { err, ok, type Result, ValidationError } from "../../core/result.ts";

/**
 * Money値オブジェクトを作成する
 * @param amount 金額
 * @returns Result<Money, ValidationError>
 */
export function createMoney(amount: number): Result<Money, ValidationError> {
  // 負の金額をチェック
  if (amount < 0) {
    return err(new ValidationError("金額は0以上である必要があります"));
  }

  // 小数点以下2桁までに制限（銭以下は扱わない）
  if (Math.round(amount * 100) / 100 !== amount) {
    return err(
      new ValidationError("金額は小数点以下2桁までしか指定できません"),
    );
  }

  // ブランド付きの型として返す
  return ok(amount as Money);
}

/**
 * Money同士の加算を行う
 * @param a 金額A
 * @param b 金額B
 * @returns 合計金額
 */
export function addMoney(a: Money, b: Money): Money {
  // ブランドの型情報は失われるが、新しい値を作成して返す
  return (a + b) as Money;
}

/**
 * Money同士の減算を行う（負の値にはならない）
 * @param a 金額A
 * @param b 金額B
 * @returns Result<Money, ValidationError> 減算結果
 */
export function subtractMoney(
  a: Money,
  b: Money,
): Result<Money, ValidationError> {
  const result = a - b;

  if (result < 0) {
    return err(new ValidationError("金額の減算結果が負の値になりました"));
  }

  return ok(result as Money);
}

/**
 * Moneyと数値の乗算を行う
 * @param money 金額
 * @param multiplier 乗数
 * @returns Result<Money, ValidationError> 乗算結果
 */
export function multiplyMoney(
  money: Money,
  multiplier: number,
): Result<Money, ValidationError> {
  if (multiplier < 0) {
    return err(new ValidationError("乗数は0以上である必要があります"));
  }

  const result = Math.round(money * multiplier * 100) / 100;
  return createMoney(result);
}

/**
 * Money同士の等価性を判定する
 * @param a 金額A
 * @param b 金額B
 * @returns 等価ならtrue
 */
export function moneyEquals(a: Money, b: Money): boolean {
  return a === b;
}

/**
 * Moneyを文字列に変換する
 * @param money 金額
 * @returns フォーマットされた金額文字列（例: "¥1,000"）
 */
export function formatMoney(money: Money): string {
  return `¥${money.toLocaleString()}`;
}
