/**
 * Product（商品）エンティティの実装
 * 関数型アプローチによる不変エンティティ
 */
import type { Entity, Money, ProductCode, ProductId } from "../types.ts";
import { err, ok, type Result, ValidationError } from "../../core/result.ts";
import { createMoney } from "../valueObjects/money.ts";
import { createProductCode } from "../valueObjects/productCode.ts";
import { generateProductId, validateProductId } from "../valueObjects/ids.ts";

/**
 * 商品カテゴリー
 */
export type ProductCategory =
  | "ELECTRONICS"
  | "CLOTHING"
  | "BOOKS"
  | "FOOD"
  | "OTHER";

/**
 * 商品エンティティの構造
 */
export interface Product extends Entity<ProductId> {
  readonly id: ProductId;
  readonly code: ProductCode;
  readonly name: string;
  readonly description: string;
  readonly price: Money;
  readonly category: ProductCategory;
  readonly stockQuantity: number;
  readonly isAvailable: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * 商品作成時のパラメータ
 */
export interface CreateProductParams {
  code: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  stockQuantity: number;
}

/**
 * 新規商品エンティティを作成する
 * @param params 作成パラメータ
 * @returns Result<Product, ValidationError>
 */
export function createProduct(
  params: CreateProductParams,
): Result<Product, ValidationError> {
  // 商品コードのバリデーション
  const codeResult = createProductCode(params.code);
  if (codeResult.isErr()) {
    return err(codeResult.error);
  }

  // 商品名のバリデーション
  if (!params.name.trim()) {
    return err(new ValidationError("商品名は必須です"));
  }

  if (params.name.length > 100) {
    return err(new ValidationError("商品名は100文字以内である必要があります"));
  }

  // 価格のバリデーション
  const priceResult = createMoney(params.price);
  if (priceResult.isErr()) {
    return err(priceResult.error);
  }

  // 在庫数のバリデーション
  if (params.stockQuantity < 0) {
    return err(new ValidationError("在庫数は0以上である必要があります"));
  }

  // 新しい商品IDを生成
  const id = generateProductId();
  const now = new Date();

  // 商品エンティティの生成
  return ok({
    id,
    code: codeResult.value,
    name: params.name.trim(),
    description: params.description.trim(),
    price: priceResult.value,
    category: params.category,
    stockQuantity: params.stockQuantity,
    isAvailable: params.stockQuantity > 0,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * 既存の商品エンティティを再構築する（リポジトリからの復元など）
 * @param data 商品データ
 * @returns Result<Product, ValidationError>
 */
export function reconstructProduct(data: {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  stockQuantity: number;
  isAvailable: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}): Result<Product, ValidationError> {
  // IDのバリデーション
  const idResult = validateProductId(data.id);
  if (idResult.isErr()) {
    return err(idResult.error);
  }

  // 商品コードのバリデーション
  const codeResult = createProductCode(data.code);
  if (codeResult.isErr()) {
    return err(codeResult.error);
  }

  // 価格のバリデーション
  const priceResult = createMoney(data.price);
  if (priceResult.isErr()) {
    return err(priceResult.error);
  }

  // 商品エンティティの再構築
  return ok({
    id: idResult.value,
    code: codeResult.value,
    name: data.name,
    description: data.description,
    price: priceResult.value,
    category: data.category,
    stockQuantity: data.stockQuantity,
    isAvailable: data.isAvailable,
    createdAt: data.createdAt instanceof Date
      ? data.createdAt
      : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Date
      ? data.updatedAt
      : new Date(data.updatedAt),
  });
}

/**
 * 商品の価格を変更する
 * @param product 対象商品
 * @param newPrice 新しい価格
 * @returns Result<Product, ValidationError>
 */
export function changeProductPrice(
  product: Product,
  newPrice: number,
): Result<Product, ValidationError> {
  const priceResult = createMoney(newPrice);
  if (priceResult.isErr()) {
    return err(priceResult.error);
  }

  // 不変性を保つため、新しいオブジェクトを返す
  return ok({
    ...product,
    price: priceResult.value,
    updatedAt: new Date(),
  });
}

/**
 * 商品の在庫数を変更する
 * @param product 対象商品
 * @param newStockQuantity 新しい在庫数
 * @returns Result<Product, ValidationError>
 */
export function updateStockQuantity(
  product: Product,
  newStockQuantity: number,
): Result<Product, ValidationError> {
  if (newStockQuantity < 0) {
    return err(new ValidationError("在庫数は0以上である必要があります"));
  }

  // 不変性を保つため、新しいオブジェクトを返す
  return ok({
    ...product,
    stockQuantity: newStockQuantity,
    isAvailable: newStockQuantity > 0,
    updatedAt: new Date(),
  });
}

/**
 * 商品の在庫を減らす
 * @param product 対象商品
 * @param quantity 減らす数量
 * @returns Result<Product, ValidationError>
 */
export function decreaseStock(
  product: Product,
  quantity: number,
): Result<Product, ValidationError> {
  if (quantity <= 0) {
    return err(new ValidationError("数量は正の値である必要があります"));
  }

  if (product.stockQuantity < quantity) {
    return err(new ValidationError("在庫が不足しています"));
  }

  return updateStockQuantity(product, product.stockQuantity - quantity);
}

/**
 * 商品の在庫を増やす
 * @param product 対象商品
 * @param quantity 増やす数量
 * @returns Result<Product, ValidationError>
 */
export function increaseStock(
  product: Product,
  quantity: number,
): Result<Product, ValidationError> {
  if (quantity <= 0) {
    return err(new ValidationError("数量は正の値である必要があります"));
  }

  return updateStockQuantity(product, product.stockQuantity + quantity);
}

/**
 * 商品を利用可能または利用不可にする
 * @param product 対象商品
 * @param isAvailable 利用可能かどうか
 * @returns Product
 */
export function setProductAvailability(
  product: Product,
  isAvailable: boolean,
): Product {
  // 既に同じ状態なら変更しない
  if (product.isAvailable === isAvailable) {
    return product;
  }

  // 不変性を保つため、新しいオブジェクトを返す
  return {
    ...product,
    isAvailable,
    updatedAt: new Date(),
  };
}

/**
 * 商品情報を表示用にフォーマットする
 * @param product 商品
 * @returns フォーマットされた商品情報
 */
export function formatProductInfo(product: Product): string {
  return `${product.name} (${product.code}) - 価格: ¥${product.price} - 在庫: ${product.stockQuantity}`;
}
