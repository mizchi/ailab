# テスト駆動開発による関数型ドメインモデリング実践ガイド

このドキュメントでは、テスト駆動開発（TDD）、関数型ドメインモデリング、およびアダプターパターンを組み合わせた実践的なアプローチを解説します。

## 基本理念

- **関数型アプローチ**:
  オブジェクト指向ではなく関数型プログラミングの原則に基づいてドメインモデルを設計
- **テスト駆動開発**: 「Red-Green-Refactor」サイクルに従ってコードを段階的に実装
- **アダプターパターン**: 外部依存を抽象化し、ビジネスロジックを独立させる
- **不変性の重視**:
  すべてのデータ構造は不変とし、変更が必要な場合は新しいインスタンスを作成

## 実装構造

```
src/
├── core/                  # コアユーティリティ
│   └── result.ts          # Result型の実装
├── domain/                # ドメインレイヤー
│   ├── types.ts           # ドメイン全体の型定義
│   ├── valueObjects/      # 値オブジェクト
│   ├── entities/          # エンティティ
│   ├── repositories/      # リポジトリインターフェース
│   └── services/          # ドメインサービス
├── application/           # アプリケーションレイヤー
│   └── services/          # アプリケーションサービス
└── infrastructure/        # インフラストラクチャレイヤー
    └── repositories/      # リポジトリの実装
```

## 1. 型とResult型の定義

### 型定義 (types.ts)

```typescript
// ブランデッドタイプの定義
export type Branded<T, Brand> = T & { readonly _brand: Brand };

// エンティティID型の定義
export type IdBrand<Entity> = { readonly __id: Entity };
export type EntityId = Branded<string, IdBrand<"Entity">>;

// 値オブジェクト型の定義
export type ValueObject = Branded<string | number, "ValueObject">;

// エンティティの基本インターフェース
export interface Entity<Id> {
  readonly id: Id;
}
```

### Result型 (result.ts)

```typescript
import { err, ok, Result } from "neverthrow";

export { err, ok, Result };

// 基本エラークラス
export class ValidationError extends Error {
  constructor(message: string) {
    super(`バリデーションエラー: ${message}`);
    this.name = this.constructor.name;
  }
}

// Result型ヘルパー関数
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
```

## 2. テスト駆動開発による実装プロセス

### ステップ1: 仕様をテストとして記述する

「テストは仕様である」という考え方に基づき、実装前に期待する動作をテストとして記述します。

```typescript
// valueObject.test.ts
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { createValueObject } from "../valueObject.ts";
import { ValidationError } from "../core/result.ts";

test("createValueObject - 有効な値で値オブジェクトを作成できる", () => {
  const result = createValueObject("valid-value");

  expect(result.isOk()).toBe(true);
  if (result.isOk()) {
    expect(String(result.value)).toBe("valid-value");
  }
});

test("createValueObject - 無効な値でエラーを返す", () => {
  const result = createValueObject("");

  expect(result.isErr()).toBe(true);
  if (result.isErr()) {
    expect(result.error).toBeInstanceOf(ValidationError);
  }
});
```

### ステップ2: 最小限の実装を行う

テストが失敗する状態から始め、テストがパスするための最小限の実装を行います。

```typescript
// valueObject.ts
import { ValueObject } from "./types.ts";
import { err, ok, Result, ValidationError } from "./core/result.ts";

export function createValueObject(
  value: string,
): Result<ValueObject, ValidationError> {
  if (!value) {
    return err(new ValidationError("値は必須です"));
  }

  return ok(value as ValueObject);
}
```

### ステップ3: リファクタリングを行う

テストが通った後、コードをリファクタリングして品質を向上させます。

```typescript
// valueObject.ts (リファクタリング後)
import { ValueObject } from "./types.ts";
import { err, ok, Result, ValidationError } from "./core/result.ts";

export function createValueObject(
  value: string,
): Result<ValueObject, ValidationError> {
  // 入力検証
  if (!value) {
    return err(new ValidationError("値は必須です"));
  }

  if (value.length > 50) {
    return err(new ValidationError("値が長すぎます（最大50文字）"));
  }

  // 形式検証
  if (!/^[a-z0-9-]+$/.test(value)) {
    return err(
      new ValidationError("値は小文字、数字、ハイフンのみ使用できます"),
    );
  }

  // 値オブジェクトの作成
  return ok(value as ValueObject);
}
```

## 3. 値オブジェクトの実装パターン

値オブジェクトは以下の特性を持ちます：

1. **不変性**: 一度作成されたら変更されない
2. **等価性**: 内部の値が同じなら等価とみなされる
3. **自己検証**: 常に有効な状態を保つ
4. **意味のある操作**: ドメインにおける意味のある操作を提供

### 実装例

```typescript
import { Money } from "./types.ts";
import { err, ok, Result, ValidationError } from "./core/result.ts";

// 作成関数
export function createMoney(amount: number): Result<Money, ValidationError> {
  if (amount < 0) {
    return err(new ValidationError("金額は0以上である必要があります"));
  }

  return ok(amount as Money);
}

// 操作関数
export function addMoney(a: Money, b: Money): Money {
  return (a + b) as Money;
}

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

// 等価性判定
export function moneyEquals(a: Money, b: Money): boolean {
  return a === b;
}

// フォーマット
export function formatMoney(money: Money): string {
  return `¥${money.toLocaleString()}`;
}
```

## 4. エンティティの実装パターン

エンティティは以下の特性を持ちます：

1. **ID**: 固有の識別子を持つ
2. **不変性**: プロパティの変更ではなく新しいインスタンスを作成
3. **ビジネスルール**: ドメインルールに従った振る舞いを持つ

### 実装例

```typescript
import { Entity, EntityId } from "./types.ts";
import { err, ok, Result, ValidationError } from "./core/result.ts";

// エンティティの型定義
export interface Product extends Entity<EntityId> {
  readonly name: string;
  readonly price: Money;
}

// 作成関数
export function createProduct(
  id: EntityId,
  name: string,
  price: Money,
): Result<Product, ValidationError> {
  if (!name) {
    return err(new ValidationError("商品名は必須です"));
  }

  return ok({
    id,
    name,
    price,
  });
}

// 操作関数 (不変性を保つため新しいインスタンスを返す)
export function changeProductPrice(
  product: Product,
  newPrice: Money,
): Result<Product, ValidationError> {
  return ok({
    ...product,
    price: newPrice,
  });
}

// 等価性判定 (IDベース)
export function productEquals(a: Product, b: Product): boolean {
  return a.id === b.id;
}
```

## 5. リポジトリの実装とアダプターパターン

リポジトリはエンティティの永続化を担当し、アダプターパターンを使用して外部依存を抽象化します。

### リポジトリインターフェース

```typescript
import { EntityId, Product } from "./types.ts";
import { NotFoundError, Result, SystemError } from "./core/result.ts";

// リポジトリインターフェース
export interface ProductRepository {
  findById(id: EntityId): Promise<Result<Product, NotFoundError | SystemError>>;
  findAll(): Promise<Result<Product[], SystemError>>;
  save(product: Product): Promise<Result<void, SystemError>>;
  remove(id: EntityId): Promise<Result<void, NotFoundError | SystemError>>;
}
```

### インメモリリポジトリ実装

```typescript
import { ProductRepository } from "../domain/repositories/productRepository.ts";
import { EntityId, Product } from "../domain/types.ts";
import { err, NotFoundError, ok, Result, SystemError } from "../core/result.ts";

export class InMemoryProductRepository implements ProductRepository {
  private products: Map<string, Product> = new Map();

  async findById(
    id: EntityId,
  ): Promise<Result<Product, NotFoundError | SystemError>> {
    const product = this.products.get(String(id));

    if (!product) {
      return err(new NotFoundError("Product", String(id)));
    }

    return ok(product);
  }

  async findAll(): Promise<Result<Product[], SystemError>> {
    return ok(Array.from(this.products.values()));
  }

  async save(product: Product): Promise<Result<void, SystemError>> {
    try {
      this.products.set(String(product.id), product);
      return ok(undefined);
    } catch (error) {
      return err(new SystemError(`製品の保存エラー: ${error.message}`));
    }
  }

  async remove(
    id: EntityId,
  ): Promise<Result<void, NotFoundError | SystemError>> {
    if (!this.products.has(String(id))) {
      return err(new NotFoundError("Product", String(id)));
    }

    try {
      this.products.delete(String(id));
      return ok(undefined);
    } catch (error) {
      return err(new SystemError(`製品の削除エラー: ${error.message}`));
    }
  }
}
```

## 6. アプリケーションサービスの実装

アプリケーションサービスはドメインの機能を組み合わせてユースケースを実装します。

```typescript
import { ProductRepository } from "../domain/repositories/productRepository.ts";
import { EntityId, Money, Product } from "../domain/types.ts";
import {
  changeProductPrice,
  createProduct,
} from "../domain/entities/product.ts";
import { createMoney } from "../domain/valueObjects/money.ts";
import {
  combine,
  err,
  NotFoundError,
  ok,
  Result,
  SystemError,
  ValidationError,
} from "../core/result.ts";

export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async createNewProduct(
    id: EntityId,
    name: string,
    price: number,
  ): Promise<Result<Product, ValidationError | SystemError>> {
    // 値オブジェクトの作成
    const moneyResult = createMoney(price);

    if (moneyResult.isErr()) {
      return err(moneyResult.error);
    }

    // エンティティの作成
    const productResult = createProduct(id, name, moneyResult.value);

    if (productResult.isErr()) {
      return err(productResult.error);
    }

    // 永続化
    const saveResult = await this.productRepository.save(productResult.value);

    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(productResult.value);
  }

  async updateProductPrice(
    id: EntityId,
    newPrice: number,
  ): Promise<Result<Product, ValidationError | NotFoundError | SystemError>> {
    // 既存の製品を取得
    const productResult = await this.productRepository.findById(id);

    if (productResult.isErr()) {
      return err(productResult.error);
    }

    // 新しい価格の値オブジェクトを作成
    const moneyResult = createMoney(newPrice);

    if (moneyResult.isErr()) {
      return err(moneyResult.error);
    }

    // 価格を更新した新しい製品エンティティを作成
    const updatedProductResult = changeProductPrice(
      productResult.value,
      moneyResult.value,
    );

    if (updatedProductResult.isErr()) {
      return err(updatedProductResult.error);
    }

    // 更新された製品を永続化
    const saveResult = await this.productRepository.save(
      updatedProductResult.value,
    );

    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(updatedProductResult.value);
  }
}
```

## 7. テスト戦略

テストはレイヤーごとに異なるアプローチで実施します：

### 値オブジェクトとエンティティのテスト

- 純粋な単体テスト
- 外部依存なし
- すべての条件分岐をテスト

### リポジトリのテスト

- インメモリ実装を使用した統合テスト
- 実際のデータベース実装を使用した結合テスト

### アプリケーションサービスのテスト

- モック/スタブを使用した単体テスト
- E2Eテストによる全体的な機能検証

## 8. リファクタリングガイドライン

TDDの「リファクタリング」フェーズでは以下の点に注意します：

- **単一責任の原則**: 各関数は一つの責任のみを持つようにする
- **依存性の明示**: 依存関係は明示的に渡す（依存性の注入）
- **純粋関数の優先**: 可能な限り純粋関数として実装する
- **ビジネスルールの集約**: 関連するルールは同じ場所に集める
- **適切な抽象化**: 過度な抽象化や早すぎる抽象化を避ける
- **命名の改善**: よりドメインに即した命名に改善する

## まとめ

関数型アプローチによるドメイン駆動設計は、不変性と型安全性を強調しながらビジネスドメインをモデル化する強力なパラダイムです。テスト駆動開発と組み合わせることで、高品質なコードと明確な仕様の両方を実現できます。

このアプローチの主な利点は：

1. **型安全性**: コンパイル時に多くのエラーを捉えられる
2. **テストのしやすさ**: 純粋関数は容易にテスト可能
3. **関心の分離**: 各レイヤーとコンポーネントが明確に分離される
4. **メンテナンス性**: 不変データ構造と明示的な依存関係により理解しやすい
5. **拡張性**: 新しい機能を追加する際の影響範囲が限定される
