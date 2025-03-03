/**
 * 注文リポジトリのインメモリ実装
 */
import type { Order } from "../../domain/entities/order.ts";
import type { OrderRepository } from "../../domain/repositories/orderRepository.ts";
import type {
  CustomerId,
  Money,
  OrderId,
  OrderStatus,
  ProductId,
  Quantity,
} from "../../domain/types.ts";
import {
  err,
  NotFoundError,
  ok,
  type Result,
  type ValidationError,
} from "../../core/result.ts";
import type { validateOrderId } from "../../domain/valueObjects/ids.ts";

/**
 * インメモリ注文リポジトリ実装
 * メモリ内にデータを保持するシンプルな実装
 * テストやプロトタイピングに適している
 */
export class InMemoryOrderRepository implements OrderRepository {
  // メモリ内のデータストア
  private orders: Map<string, Order> = new Map();

  /**
   * IDで注文を検索する
   * @param id 検索する注文ID
   * @returns Result<Order | null, ValidationError | NotFoundError>
   */
  async findById(
    id: OrderId,
  ): Promise<Result<Order | null, ValidationError | NotFoundError>> {
    const order = this.orders.get(id);
    return ok(order || null);
  }

  /**
   * 顧客IDで注文を検索する
   * @param customerId 検索する顧客ID
   * @returns Result<Order[], ValidationError | NotFoundError>
   */
  async findByCustomerId(
    customerId: CustomerId,
  ): Promise<Result<Order[], ValidationError | NotFoundError>> {
    const customerOrders = Array.from(this.orders.values()).filter(
      (order) => order.customerId === customerId,
    );
    return ok(customerOrders);
  }

  /**
   * 商品IDを含む注文を検索する
   * @param productId 検索する商品ID
   * @returns Result<Order[], ValidationError | NotFoundError>
   */
  async findByProductId(
    productId: ProductId,
  ): Promise<Result<Order[], ValidationError | NotFoundError>> {
    const productOrders = Array.from(this.orders.values()).filter(
      (order) => order.orderLines.some((line) => line.productId === productId),
    );
    return ok(productOrders);
  }

  /**
   * 注文ステータスで注文を検索する
   * @param status 検索する注文ステータス
   * @returns Result<Order[], ValidationError | NotFoundError>
   */
  async findByStatus(
    status: OrderStatus["kind"],
  ): Promise<Result<Order[], ValidationError | NotFoundError>> {
    const filteredOrders = Array.from(this.orders.values()).filter(
      (order) => order.status.kind === status,
    );
    return ok(filteredOrders);
  }

  /**
   * 期間内の注文を検索する
   * @param startDate 開始日
   * @param endDate 終了日
   * @returns Result<Order[], ValidationError | NotFoundError>
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Result<Order[], ValidationError | NotFoundError>> {
    const filteredOrders = Array.from(this.orders.values()).filter(
      (order) => {
        const orderDate = order.createdAt;
        return orderDate >= startDate && orderDate <= endDate;
      },
    );
    return ok(filteredOrders);
  }

  /**
   * すべての注文を取得する
   * @returns Result<Order[], ValidationError | NotFoundError>
   */
  async findAll(): Promise<Result<Order[], ValidationError | NotFoundError>> {
    return ok(Array.from(this.orders.values()));
  }

  /**
   * 注文を保存する（新規作成または更新）
   * @param order 保存する注文エンティティ
   * @returns Result<void, ValidationError>
   */
  async save(order: Order): Promise<Result<void, ValidationError>> {
    // 深いコピーを行うことで、参照切れを防ぐ
    this.orders.set(order.id, JSON.parse(JSON.stringify(order)));
    return ok(undefined);
  }

  /**
   * 注文を削除する
   * @param id 削除する注文ID
   * @returns Result<void, ValidationError | NotFoundError>
   */
  async delete(
    id: OrderId,
  ): Promise<Result<void, ValidationError | NotFoundError>> {
    if (!this.orders.has(id)) {
      return err(new NotFoundError("注文", id));
    }

    this.orders.delete(id);
    return ok(undefined);
  }

  /**
   * IDの存在チェック
   * @param id チェックする注文ID
   * @returns Result<boolean, ValidationError>
   */
  async exists(id: OrderId): Promise<Result<boolean, ValidationError>> {
    return ok(this.orders.has(id));
  }

  /**
   * 顧客の注文数を取得する
   * @param customerId 顧客ID
   * @returns Result<number, ValidationError>
   */
  async countByCustomerId(
    customerId: CustomerId,
  ): Promise<Result<number, ValidationError>> {
    const customerOrders = Array.from(this.orders.values()).filter(
      (order) => order.customerId === customerId,
    );
    return ok(customerOrders.length);
  }

  /**
   * 特定の状態の注文数を取得する
   * @param status 注文ステータス
   * @returns Result<number, ValidationError>
   */
  async countByStatus(
    status: OrderStatus["kind"],
  ): Promise<Result<number, ValidationError>> {
    const filteredOrders = Array.from(this.orders.values()).filter(
      (order) => order.status.kind === status,
    );
    return ok(filteredOrders.length);
  }

  /**
   * リポジトリを空にする（テスト用）
   */
  clear(): void {
    this.orders.clear();
  }

  /**
   * 注文データを検索する（テストやデモ用の高度なクエリ）
   * @param query 検索クエリ関数
   * @returns 条件に一致する注文のリスト
   */
  findByQuery(query: (order: Order) => boolean): Order[] {
    return Array.from(this.orders.values()).filter(query);
  }

  /**
   * サンプルデータでリポジトリを初期化する（デモ・テスト用）
   * 注：実際の実装では、顧客IDと商品IDは実在するものを使用する必要があります
   */
  async initializeWithSampleData(): Promise<void> {
    // 既存のデータをクリア
    this.clear();

    // サンプル注文データの作成
    // 実際のアプリケーションでは、ここでドメインロジックを使用して注文を作成すべきです
    const orders: Order[] = [
      {
        id: "ord_sample001" as OrderId,
        customerId: "cust_sample001" as CustomerId,
        orderLines: [
          {
            productId: "prod_sample001" as ProductId,
            quantity: 1 as unknown as Quantity,
            unitPrice: 120000 as unknown as Money,
          },
          {
            productId: "prod_sample003" as ProductId,
            quantity: 2 as unknown as Quantity,
            unitPrice: 2800 as unknown as Money,
          },
        ],
        status: { kind: "pending" },
        totalAmount: 125600 as unknown as Money,
        createdAt: new Date("2024-02-01T10:00:00Z"),
        updatedAt: new Date("2024-02-01T10:00:00Z"),
      },
      {
        id: "ord_sample002" as OrderId,
        customerId: "cust_sample002" as CustomerId,
        orderLines: [
          {
            productId: "prod_sample002" as ProductId,
            quantity: 1 as unknown as Quantity,
            unitPrice: 35000 as unknown as Money,
          },
        ],
        status: { kind: "paid", paidAt: new Date("2024-02-02T15:30:00Z") },
        totalAmount: 35000 as unknown as Money,
        createdAt: new Date("2024-02-02T14:30:00Z"),
        updatedAt: new Date("2024-02-02T15:30:00Z"),
      },
      {
        id: "ord_sample003" as OrderId,
        customerId: "cust_sample001" as CustomerId,
        orderLines: [
          {
            productId: "prod_sample004" as ProductId,
            quantity: 2 as unknown as Quantity,
            unitPrice: 3500 as unknown as Money,
          },
        ],
        status: {
          kind: "shipped",
          shippedAt: new Date("2024-02-03T11:00:00Z"),
        },
        totalAmount: 7000 as unknown as Money,
        createdAt: new Date("2024-02-03T09:15:00Z"),
        updatedAt: new Date("2024-02-03T11:00:00Z"),
      },
      {
        id: "ord_sample004" as OrderId,
        customerId: "cust_sample002" as CustomerId,
        orderLines: [
          {
            productId: "prod_sample001" as ProductId,
            quantity: 1 as unknown as Quantity,
            unitPrice: 120000 as unknown as Money,
          },
        ],
        status: {
          kind: "delivered",
          deliveredAt: new Date("2024-02-05T14:00:00Z"),
        },
        totalAmount: 120000 as unknown as Money,
        createdAt: new Date("2024-02-04T11:20:00Z"),
        updatedAt: new Date("2024-02-05T14:00:00Z"),
      },
      {
        id: "ord_sample005" as OrderId,
        customerId: "cust_sample001" as CustomerId,
        orderLines: [
          {
            productId: "prod_sample002" as ProductId,
            quantity: 1 as unknown as Quantity,
            unitPrice: 35000 as unknown as Money,
          },
        ],
        status: {
          kind: "cancelled",
          reason: "顧客によるキャンセル要求",
          cancelledAt: new Date("2024-02-06T10:30:00Z"),
        },
        totalAmount: 35000 as unknown as Money,
        createdAt: new Date("2024-02-06T09:40:00Z"),
        updatedAt: new Date("2024-02-06T10:30:00Z"),
      },
    ];

    // サンプルデータの保存
    for (const order of orders) {
      await this.save(order);
    }
  }
}
