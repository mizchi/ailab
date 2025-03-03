/**
 * Result型のラッパーモジュール
 * neverthrowライブラリをラップして使いやすくするためのユーティリティ関数を提供します。
 */
import { Err, err, Ok, ok, Result } from "neverthrow";

export { Err, err, Ok, ok, Result };

// 型定義
export type AppError =
  | ValidationError
  | NotFoundError
  | SystemError;

// 基本エラークラス
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// 各種エラークラス
export class ValidationError extends BaseError {
  constructor(message: string) {
    super(`バリデーションエラー: ${message}`);
  }
}

export class NotFoundError extends BaseError {
  constructor(entityName: string, id: string) {
    super(`${entityName}(ID: ${id})が見つかりません`);
  }
}

export class SystemError extends BaseError {
  constructor(message: string) {
    super(`システムエラー: ${message}`);
  }
}

// 便利なヘルパー関数
export function combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const okValues: T[] = [];

  for (const result of results) {
    if (result.isErr()) {
      return err(result.error);
    }
    okValues.push(result.value);
  }

  return ok(okValues);
}

// Result<T, E>のArrayをResult<T[], E>に変換するヘルパー関数
export function sequence<T, E>(results: Result<T, E>[]): Result<T[], E> {
  return combine(results);
}

// オブジェクトの各プロパティがResultである場合、それらを単一のResultに変換する
export function combineProperties<T extends Record<string, unknown>, E>(
  obj: { [K in keyof T]: Result<T[K], E> },
): Result<T, E> {
  const keys = Object.keys(obj) as Array<keyof T>;
  const values: T = {} as T;

  for (const key of keys) {
    const result = obj[key];
    if (result.isErr()) {
      return err(result.error);
    }
    values[key] = result.value;
  }

  return ok(values);
}
