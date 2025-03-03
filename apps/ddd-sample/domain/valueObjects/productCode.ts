/**
 * ProductCode値オブジェクトの実装
 * 不変かつ特定の形式を持つ商品コードを表現
 */
import type { ProductCode } from "../types.ts";
import { err, ok, type Result, ValidationError } from "../../core/result.ts";

/**
 * 商品コードのバリデーション正規表現
 * 例: "PROD-12345" または "ITEM-AB-789"
 */
const PRODUCT_CODE_REGEX = /^[A-Z]+-[A-Z0-9-]{1,10}$/;

/**
 * ProductCode値オブジェクトを作成する
 * @param value 商品コード文字列
 * @returns Result<ProductCode, ValidationError>
 */
export function createProductCode(
  value: string,
): Result<ProductCode, ValidationError> {
  // 空文字チェック
  if (!value) {
    return err(new ValidationError("商品コードは必須です"));
  }

  // 長さチェック
  if (value.length > 20) {
    return err(new ValidationError("商品コードが長すぎます（最大20文字）"));
  }

  // 形式チェック
  if (!PRODUCT_CODE_REGEX.test(value)) {
    return err(
      new ValidationError(
        "商品コードの形式が正しくありません（例: PROD-12345）",
      ),
    );
  }

  // ブランド付きの型として返す
  return ok(value as ProductCode);
}

/**
 * ProductCode同士の等価性を判定する
 * @param a 商品コードA
 * @param b 商品コードB
 * @returns 等価ならtrue
 */
export function productCodeEquals(a: ProductCode, b: ProductCode): boolean {
  // 大文字小文字を区別して比較
  return a === b;
}

/**
 * 与えられた文字列が商品コードとして有効かどうかを判定する
 * @param value チェックする文字列
 * @returns 有効な商品コードならtrue
 */
export function isValidProductCodeString(value: string): boolean {
  return PRODUCT_CODE_REGEX.test(value);
}

/**
 * 商品コードから製品カテゴリを取得する
 * @param productCode 商品コード
 * @returns 製品カテゴリ（例: "PROD"）
 */
export function getCategory(productCode: ProductCode): string {
  const parts = productCode.split("-");
  return parts[0];
}
