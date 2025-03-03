/**
 * 商品リポジトリのインターフェース定義
 */
import type { Product, ProductCategory } from "../entities/product.ts";
import type { ProductCode, ProductId } from "../types.ts";
import type {
  NotFoundError,
  Result,
  ValidationError,
} from "../../core/result.ts";

/**
 * 商品リポジトリのインターフェース
 * ドメイン層ではインターフェースのみを定義し、具体的な実装はインフラストラクチャ層で行う
 */
export interface ProductRepository {
  /**
   * IDで商品を検索する
   * @param id 検索する商品ID
   * @returns Result<Product | null, ValidationError | NotFoundError>
   */
  findById(
    id: ProductId,
  ): Promise<Result<Product | null, ValidationError | NotFoundError>>;

  /**
   * 商品コードで商品を検索する
   * @param code 検索する商品コード
   * @returns Result<Product | null, ValidationError | NotFoundError>
   */
  findByCode(
    code: ProductCode,
  ): Promise<Result<Product | null, ValidationError | NotFoundError>>;

  /**
   * すべての商品を取得する
   * @returns Result<Product[], ValidationError | NotFoundError>
   */
  findAll(): Promise<Result<Product[], ValidationError | NotFoundError>>;

  /**
   * カテゴリで商品を検索する
   * @param category 検索するカテゴリ
   * @returns Result<Product[], ValidationError | NotFoundError>
   */
  findByCategory(
    category: ProductCategory,
  ): Promise<Result<Product[], ValidationError | NotFoundError>>;

  /**
   * 利用可能な商品のみを取得する
   * @returns Result<Product[], ValidationError | NotFoundError>
   */
  findAllAvailable(): Promise<
    Result<Product[], ValidationError | NotFoundError>
  >;

  /**
   * 在庫がある商品のみを取得する
   * @returns Result<Product[], ValidationError | NotFoundError>
   */
  findAllInStock(): Promise<Result<Product[], ValidationError | NotFoundError>>;

  /**
   * 商品を保存する（新規作成または更新）
   * @param product 保存する商品エンティティ
   * @returns Result<void, ValidationError>
   */
  save(product: Product): Promise<Result<void, ValidationError>>;

  /**
   * 複数の商品を一括保存する
   * @param products 保存する商品エンティティの配列
   * @returns Result<void, ValidationError>
   */
  saveAll(products: Product[]): Promise<Result<void, ValidationError>>;

  /**
   * 商品を削除する
   * @param id 削除する商品ID
   * @returns Result<void, ValidationError | NotFoundError>
   */
  delete(id: ProductId): Promise<Result<void, ValidationError | NotFoundError>>;

  /**
   * IDの存在チェック
   * @param id チェックする商品ID
   * @returns Result<boolean, ValidationError>
   */
  exists(id: ProductId): Promise<Result<boolean, ValidationError>>;

  /**
   * 商品コードの存在チェック
   * @param code チェックする商品コード
   * @returns Result<boolean, ValidationError>
   */
  existsByCode(code: ProductCode): Promise<Result<boolean, ValidationError>>;
}
