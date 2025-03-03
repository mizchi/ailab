/**
 * 商品リポジトリのインメモリ実装
 */
import type {
  Product,
  ProductCategory,
} from "../../domain/entities/product.ts";
import type { ProductRepository } from "../../domain/repositories/productRepository.ts";
import type { ProductCode, ProductId } from "../../domain/types.ts";
import {
  err,
  NotFoundError,
  ok,
  type Result,
  type ValidationError,
} from "../../core/result.ts";
import type { createProductCode } from "../../domain/valueObjects/productCode.ts";
import type { validateProductId } from "../../domain/valueObjects/ids.ts";

/**
 * インメモリ商品リポジトリ実装
 * メモリ内にデータを保持するシンプルな実装
 * テストやプロトタイピングに適している
 */
export class InMemoryProductRepository implements ProductRepository {
  // メモリ内のデータストア
  private products: Map<string, Product> = new Map();

  /**
   * IDで商品を検索する
   * @param id 検索する商品ID
   * @returns Result<Product | null, ValidationError | NotFoundError>
   */
  async findById(
    id: ProductId,
  ): Promise<Result<Product | null, ValidationError | NotFoundError>> {
    const product = this.products.get(id);
    return ok(product || null);
  }

  /**
   * 商品コードで商品を検索する
   * @param code 検索する商品コード
   * @returns Result<Product | null, ValidationError | NotFoundError>
   */
  async findByCode(
    code: ProductCode,
  ): Promise<Result<Product | null, ValidationError | NotFoundError>> {
    for (const product of this.products.values()) {
      if (product.code === code) {
        return ok(product);
      }
    }
    return ok(null);
  }

  /**
   * すべての商品を取得する
   * @returns Result<Product[], ValidationError | NotFoundError>
   */
  async findAll(): Promise<Result<Product[], ValidationError | NotFoundError>> {
    return ok(Array.from(this.products.values()));
  }

  /**
   * カテゴリで商品を検索する
   * @param category 検索するカテゴリ
   * @returns Result<Product[], ValidationError | NotFoundError>
   */
  async findByCategory(
    category: ProductCategory,
  ): Promise<Result<Product[], ValidationError | NotFoundError>> {
    const filteredProducts = Array.from(this.products.values()).filter(
      (product) => product.category === category,
    );
    return ok(filteredProducts);
  }

  /**
   * 利用可能な商品のみを取得する
   * @returns Result<Product[], ValidationError | NotFoundError>
   */
  async findAllAvailable(): Promise<
    Result<Product[], ValidationError | NotFoundError>
  > {
    const availableProducts = Array.from(this.products.values()).filter(
      (product) => product.isAvailable,
    );
    return ok(availableProducts);
  }

  /**
   * 在庫がある商品のみを取得する
   * @returns Result<Product[], ValidationError | NotFoundError>
   */
  async findAllInStock(): Promise<
    Result<Product[], ValidationError | NotFoundError>
  > {
    const inStockProducts = Array.from(this.products.values()).filter(
      (product) => product.stockQuantity > 0,
    );
    return ok(inStockProducts);
  }

  /**
   * 商品を保存する（新規作成または更新）
   * @param product 保存する商品エンティティ
   * @returns Result<void, ValidationError>
   */
  async save(product: Product): Promise<Result<void, ValidationError>> {
    this.products.set(product.id, { ...product });
    return ok(undefined);
  }

  /**
   * 複数の商品を一括保存する
   * @param products 保存する商品エンティティの配列
   * @returns Result<void, ValidationError>
   */
  async saveAll(products: Product[]): Promise<Result<void, ValidationError>> {
    for (const product of products) {
      this.products.set(product.id, { ...product });
    }
    return ok(undefined);
  }

  /**
   * 商品を削除する
   * @param id 削除する商品ID
   * @returns Result<void, ValidationError | NotFoundError>
   */
  async delete(
    id: ProductId,
  ): Promise<Result<void, ValidationError | NotFoundError>> {
    if (!this.products.has(id)) {
      return err(new NotFoundError("商品", id));
    }

    this.products.delete(id);
    return ok(undefined);
  }

  /**
   * IDの存在チェック
   * @param id チェックする商品ID
   * @returns Result<boolean, ValidationError>
   */
  async exists(id: ProductId): Promise<Result<boolean, ValidationError>> {
    return ok(this.products.has(id));
  }

  /**
   * 商品コードの存在チェック
   * @param code チェックする商品コード
   * @returns Result<boolean, ValidationError>
   */
  async existsByCode(
    code: ProductCode,
  ): Promise<Result<boolean, ValidationError>> {
    for (const product of this.products.values()) {
      if (product.code === code) {
        return ok(true);
      }
    }
    return ok(false);
  }

  /**
   * リポジトリを空にする（テスト用）
   */
  clear(): void {
    this.products.clear();
  }

  /**
   * サンプルデータでリポジトリを初期化する（デモ・テスト用）
   */
  async initializeWithSampleData(): Promise<void> {
    // 既存のデータをクリア
    this.clear();

    // サンプル商品データの作成
    const products: Product[] = [
      {
        id: "prod_sample001" as ProductId,
        code: "PROD-001" as ProductCode,
        name: "高品質ノートPC",
        description:
          "高性能な最新のノートパソコンです。ビジネスにも趣味にも最適です。",
        price: 120000 as any, // Money型が必要
        category: "ELECTRONICS",
        stockQuantity: 10,
        isAvailable: true,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      },
      {
        id: "prod_sample002" as ProductId,
        code: "PROD-002" as ProductCode,
        name: "ビジネススーツ",
        description:
          "高品質な素材を使用したビジネススーツです。シンプルで洗練されたデザイン。",
        price: 35000 as any, // Money型が必要
        category: "CLOTHING",
        stockQuantity: 25,
        isAvailable: true,
        createdAt: new Date("2024-01-02T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
      },
      {
        id: "prod_sample003" as ProductId,
        code: "PROD-003" as ProductCode,
        name: "プログラミング入門書",
        description: "初心者にも分かりやすいプログラミングの入門書です。",
        price: 2800 as any, // Money型が必要
        category: "BOOKS",
        stockQuantity: 50,
        isAvailable: true,
        createdAt: new Date("2024-01-03T00:00:00Z"),
        updatedAt: new Date("2024-01-03T00:00:00Z"),
      },
      {
        id: "prod_sample004" as ProductId,
        code: "PROD-004" as ProductCode,
        name: "有機野菜セット",
        description:
          "農薬を使用していない有機野菜のセットです。新鮮で安全な食材をお届けします。",
        price: 3500 as any, // Money型が必要
        category: "FOOD",
        stockQuantity: 15,
        isAvailable: true,
        createdAt: new Date("2024-01-04T00:00:00Z"),
        updatedAt: new Date("2024-01-04T00:00:00Z"),
      },
      {
        id: "prod_sample005" as ProductId,
        code: "PROD-005" as ProductCode,
        name: "スマートフォン",
        description:
          "最新のスマートフォン。高性能カメラと大容量バッテリーを搭載しています。",
        price: 85000 as any, // Money型が必要
        category: "ELECTRONICS",
        stockQuantity: 0,
        isAvailable: false,
        createdAt: new Date("2024-01-05T00:00:00Z"),
        updatedAt: new Date("2024-01-10T00:00:00Z"),
      },
    ];

    // サンプルデータの保存
    for (const product of products) {
      await this.save(product);
    }
  }
}
