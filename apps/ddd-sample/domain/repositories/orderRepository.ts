/**
 * 注文リポジトリのインターフェース定義
 */
import type { Order } from "../entities/order.ts";
import type { CustomerId, OrderId, OrderStatus, ProductId } from "../types.ts";
import type {
  NotFoundError,
  Result,
  ValidationError,
} from "../../core/result.ts";

/**
 * 注文リポジトリのインターフェース
 * ドメイン層ではインターフェースのみを定義し、具体的な実装はインフラストラクチャ層で行う
 */
export interface OrderRepository {
  /**
   * IDで注文を検索する
   * @param id 検索する注文ID
   * @returns Result<Order | null, ValidationError | NotFoundError>
   */
  findById(
    id: OrderId,
  ): Promise<Result<Order | null, ValidationError | NotFoundError>>;

  /**
   * 顧客IDで注文を検索する
   * @param customerId 検索する顧客ID
   * @returns Result<Order[], ValidationError | NotFoundError>
   */
  findByCustomerId(
    customerId: CustomerId,
  ): Promise<Result<Order[], ValidationError | NotFoundError>>;

  /**
   * 商品IDを含む注文を検索する
   * @param productId 検索する商品ID
   * @returns Result<Order[], ValidationError | NotFoundError>
   */
  findByProductId(
    productId: ProductId,
  ): Promise<Result<Order[], ValidationError | NotFoundError>>;

  /**
   * 注文ステータスで注文を検索する
   * @param status 検索する注文ステータス
   * @returns Result<Order[], ValidationError | NotFoundError>
   */
  findByStatus(
    status: OrderStatus["kind"],
  ): Promise<Result<Order[], ValidationError | NotFoundError>>;

  /**
   * 期間内の注文を検索する
   * @param startDate 開始日
   * @param endDate 終了日
   * @returns Result<Order[], ValidationError | NotFoundError>
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Result<Order[], ValidationError | NotFoundError>>;

  /**
   * すべての注文を取得する
   * @returns Result<Order[], ValidationError | NotFoundError>
   */
  findAll(): Promise<Result<Order[], ValidationError | NotFoundError>>;

  /**
   * 注文を保存する（新規作成または更新）
   * @param order 保存する注文エンティティ
   * @returns Result<void, ValidationError>
   */
  save(order: Order): Promise<Result<void, ValidationError>>;

  /**
   * 注文を削除する
   * @param id 削除する注文ID
   * @returns Result<void, ValidationError | NotFoundError>
   */
  delete(id: OrderId): Promise<Result<void, ValidationError | NotFoundError>>;

  /**
   * IDの存在チェック
   * @param id チェックする注文ID
   * @returns Result<boolean, ValidationError>
   */
  exists(id: OrderId): Promise<Result<boolean, ValidationError>>;

  /**
   * 顧客の注文数を取得する
   * @param customerId 顧客ID
   * @returns Result<number, ValidationError>
   */
  countByCustomerId(
    customerId: CustomerId,
  ): Promise<Result<number, ValidationError>>;

  /**
   * 特定の状態の注文数を取得する
   * @param status 注文ステータス
   * @returns Result<number, ValidationError>
   */
  countByStatus(
    status: OrderStatus["kind"],
  ): Promise<Result<number, ValidationError>>;
}
