/**
 * 成功または失敗を表現する Result 型
 */

// Result型の定義
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// 成功を表す関数
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

// 失敗を表す関数
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// 基本エラータイプ
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// バリデーションエラー
export class ValidationError extends AppError {
  constructor(message: string) {
    super(`検証エラー: ${message}`);
  }
}

// 複数のResultを結合するヘルパー
export function combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (!result.ok) return result as Result<never, E>;
    values.push(result.value);
  }

  return ok(values);
}
