/**
 * Email値オブジェクトの実装
 * 不変かつバリデーション付きのメールアドレスを表現
 */
import type { Email } from "../types.ts";
import { err, ok, type Result, ValidationError } from "../../core/result.ts";

/**
 * メールアドレスのバリデーション正規表現
 * シンプルな例としていますが、実際のプロジェクトではより詳細な検証が必要です
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Email値オブジェクトを作成する
 * @param value メールアドレス文字列
 * @returns Result<Email, ValidationError>
 */
export function createEmail(value: string): Result<Email, ValidationError> {
  // 空文字チェック
  if (!value) {
    return err(new ValidationError("メールアドレスは必須です"));
  }

  // 長さチェック
  if (value.length > 256) {
    return err(
      new ValidationError("メールアドレスが長すぎます（最大256文字）"),
    );
  }

  // 形式チェック
  if (!EMAIL_REGEX.test(value)) {
    return err(new ValidationError("メールアドレスの形式が正しくありません"));
  }

  // ブランド付きの型として返す
  return ok(value as Email);
}

/**
 * メールアドレスのドメイン部分を取得する
 * @param email メールアドレス
 * @returns ドメイン部分の文字列
 */
export function getDomain(email: Email): string {
  const parts = email.split("@");
  return parts[1];
}

/**
 * メールアドレスのローカル部分を取得する
 * @param email メールアドレス
 * @returns ローカル部分の文字列
 */
export function getLocalPart(email: Email): string {
  const parts = email.split("@");
  return parts[0];
}

/**
 * Email同士の等価性を判定する
 * @param a メールアドレスA
 * @param b メールアドレスB
 * @returns 等価ならtrue
 */
export function emailEquals(a: Email, b: Email): boolean {
  // 大文字小文字を区別せずに比較（ドメイン部分は大文字小文字を区別しないため）
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * 与えられた文字列がメールアドレスかどうかを判定する
 * @param value チェックする文字列
 * @returns メールアドレスならtrue
 */
export function isValidEmailString(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

/**
 * メールアドレスをマスクした形式で返す（プライバシー保護用）
 * @param email メールアドレス
 * @returns マスクされたメールアドレス（例: "j***@example.com"）
 */
export function maskEmail(email: Email): string {
  const localPart = getLocalPart(email);
  const domain = getDomain(email);

  if (localPart.length <= 1) {
    return `${localPart}***@${domain}`;
  }

  return `${localPart.charAt(0)}***@${domain}`;
}
