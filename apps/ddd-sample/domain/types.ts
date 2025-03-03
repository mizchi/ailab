/**
 * DDDの関数型アプローチにおける基本的な型定義
 */

// ブランデッドタイプを作成するためのユーティリティ型
// これにより、string型やnumber型に特別な「ブランド」を付与して型安全性を高める
export type Branded<T, Brand> = T & { readonly _brand: Brand };

// ID型のブランドとして使用する型
export type IdBrand<Entity> = { readonly __id: Entity };

// 各エンティティのID型
export type CustomerId = Branded<string, IdBrand<"Customer">>;
export type ProductId = Branded<string, IdBrand<"Product">>;
export type OrderId = Branded<string, IdBrand<"Order">>;

// ブランデッド型を作成するためのヘルパー関数型
export type BrandedCreator<T, B, E> = (value: T) => Result<Branded<T, B>, E>;

// 値オブジェクト型
export type Money = Branded<number, "Money">;
export type Email = Branded<string, "Email">;
export type ProductCode = Branded<string, "ProductCode">;
export type Quantity = Branded<number, "Quantity">;

// 注文ステータスの型定義（直和型/判別共用体）
export type OrderStatus =
  | { kind: "pending" }
  | { kind: "paid"; paidAt: Date }
  | { kind: "shipped"; shippedAt: Date }
  | { kind: "delivered"; deliveredAt: Date }
  | { kind: "cancelled"; reason: string; cancelledAt: Date };

// エンティティの基本インターフェース
export interface Entity<Id> {
  readonly id: Id;
}

// Result型のインポート
import type { Result } from "../core/result.ts";
