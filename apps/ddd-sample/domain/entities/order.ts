/**
 * Order（注文）エンティティの実装
 * 集約ルートとして機能する関数型アプローチによる不変エンティティ
 */
import type {
  CustomerId,
  Entity,
  Money,
  OrderId,
  OrderStatus,
  ProductId,
} from "../types.ts";
import {
  calculateSubtotal,
  createOrderLine,
  type CreateOrderLineParams,
  type OrderLine,
} from "../valueObjects/orderLine.ts";
import {
  type combine,
  err,
  ok,
  type Result,
  sequence,
  ValidationError,
} from "../../core/result.ts";
import {
  generateOrderId,
  validateCustomerId,
  validateOrderId,
} from "../valueObjects/ids.ts";
import { type addMoney, createMoney } from "../valueObjects/money.ts";

/**
 * 注文エンティティの構造
 */
export interface Order extends Entity<OrderId> {
  readonly id: OrderId;
  readonly customerId: CustomerId;
  readonly orderLines: ReadonlyArray<OrderLine>;
  readonly status: OrderStatus;
  readonly totalAmount: Money;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * 注文作成時のパラメータ
 */
export interface CreateOrderParams {
  customerId: CustomerId;
  orderLines: CreateOrderLineParams[];
}

/**
 * 新規注文エンティティを作成する
 * @param params 作成パラメータ
 * @returns Result<Order, ValidationError>
 */
export function createOrder(
  params: CreateOrderParams,
): Result<Order, ValidationError> {
  // 注文明細が空でないことを確認
  if (params.orderLines.length === 0) {
    return err(
      new ValidationError("注文には少なくとも1つの注文明細が必要です"),
    );
  }

  // 注文明細のバリデーションと作成
  const orderLinesResults = params.orderLines.map(createOrderLine);
  const orderLinesResult = sequence(orderLinesResults);

  if (orderLinesResult.isErr()) {
    return err(orderLinesResult.error);
  }

  // 合計金額の計算
  const subtotalResults = orderLinesResult.value.map(calculateSubtotal);
  const subtotalsResult = sequence(subtotalResults);

  if (subtotalsResult.isErr()) {
    return err(subtotalsResult.error);
  }

  let totalAmount = 0;
  for (const subtotal of subtotalsResult.value) {
    totalAmount += subtotal;
  }

  const totalAmountResult = createMoney(totalAmount);
  if (totalAmountResult.isErr()) {
    return err(totalAmountResult.error);
  }

  // 新しい注文IDを生成
  const id = generateOrderId();
  const now = new Date();

  // 注文エンティティの生成
  return ok({
    id,
    customerId: params.customerId,
    orderLines: orderLinesResult.value,
    status: { kind: "pending" },
    totalAmount: totalAmountResult.value,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * 既存の注文エンティティを再構築する（リポジトリからの復元など）
 * @param data 注文データ
 * @returns Result<Order, ValidationError>
 */
export function reconstructOrder(data: {
  id: string;
  customerId: string;
  orderLines: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  status: OrderStatus;
  totalAmount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}): Result<Order, ValidationError> {
  // IDのバリデーション
  const idResult = validateOrderId(data.id);
  if (idResult.isErr()) {
    return err(idResult.error);
  }

  // 顧客IDのバリデーション
  const customerIdResult = validateCustomerId(data.customerId);
  if (customerIdResult.isErr()) {
    return err(customerIdResult.error);
  }

  // 注文明細のバリデーションと作成
  const orderLinesParams = data.orderLines.map((line) => ({
    productId: line.productId as ProductId, // 型キャストは実際のアプリケーションではより厳密に行うべき
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  }));

  const orderLinesResults = orderLinesParams.map(createOrderLine);
  const orderLinesResult = sequence(orderLinesResults);

  if (orderLinesResult.isErr()) {
    return err(orderLinesResult.error);
  }

  // 合計金額のバリデーション
  const totalAmountResult = createMoney(data.totalAmount);
  if (totalAmountResult.isErr()) {
    return err(totalAmountResult.error);
  }

  // 注文エンティティの再構築
  return ok({
    id: idResult.value,
    customerId: customerIdResult.value,
    orderLines: orderLinesResult.value,
    status: data.status,
    totalAmount: totalAmountResult.value,
    createdAt: data.createdAt instanceof Date
      ? data.createdAt
      : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Date
      ? data.updatedAt
      : new Date(data.updatedAt),
  });
}

/**
 * 注文に支払いを行う
 * @param order 対象注文
 * @returns Result<Order, ValidationError>
 */
export function payOrder(order: Order): Result<Order, ValidationError> {
  // すでに支払い済みか確認
  if (order.status.kind !== "pending") {
    return err(
      new ValidationError(
        `現在の注文状態（${order.status.kind}）では支払いを行えません`,
      ),
    );
  }

  // 不変性を保つため、新しいオブジェクトを返す
  return ok({
    ...order,
    status: {
      kind: "paid",
      paidAt: new Date(),
    },
    updatedAt: new Date(),
  });
}

/**
 * 注文の出荷を行う
 * @param order 対象注文
 * @returns Result<Order, ValidationError>
 */
export function shipOrder(order: Order): Result<Order, ValidationError> {
  // 支払い済みか確認
  if (order.status.kind !== "paid") {
    return err(
      new ValidationError(
        `現在の注文状態（${order.status.kind}）では出荷を行えません`,
      ),
    );
  }

  // 不変性を保つため、新しいオブジェクトを返す
  return ok({
    ...order,
    status: {
      kind: "shipped",
      shippedAt: new Date(),
    },
    updatedAt: new Date(),
  });
}

/**
 * 注文の配達完了を記録する
 * @param order 対象注文
 * @returns Result<Order, ValidationError>
 */
export function deliverOrder(order: Order): Result<Order, ValidationError> {
  // 出荷済みか確認
  if (order.status.kind !== "shipped") {
    return err(
      new ValidationError(
        `現在の注文状態（${order.status.kind}）では配達完了を記録できません`,
      ),
    );
  }

  // 不変性を保つため、新しいオブジェクトを返す
  return ok({
    ...order,
    status: {
      kind: "delivered",
      deliveredAt: new Date(),
    },
    updatedAt: new Date(),
  });
}

/**
 * 注文をキャンセルする
 * @param order 対象注文
 * @param reason キャンセル理由
 * @returns Result<Order, ValidationError>
 */
export function cancelOrder(
  order: Order,
  reason: string,
): Result<Order, ValidationError> {
  // 出荷済みまたは配達済みの注文はキャンセルできない
  if (order.status.kind === "shipped" || order.status.kind === "delivered") {
    return err(
      new ValidationError(
        `現在の注文状態（${order.status.kind}）ではキャンセルできません`,
      ),
    );
  }

  if (!reason.trim()) {
    return err(new ValidationError("キャンセル理由は必須です"));
  }

  // 不変性を保つため、新しいオブジェクトを返す
  return ok({
    ...order,
    status: {
      kind: "cancelled",
      reason: reason.trim(),
      cancelledAt: new Date(),
    },
    updatedAt: new Date(),
  });
}

/**
 * 指定した商品の数量を取得する
 * @param order 注文
 * @param productId 商品ID
 * @returns 数量（存在しない場合は0）
 */
export function getProductQuantity(order: Order, productId: ProductId): number {
  const orderLine = order.orderLines.find((line) =>
    line.productId === productId
  );
  return orderLine ? orderLine.quantity : 0;
}

/**
 * 注文に含まれる商品IDのリストを取得する
 * @param order 注文
 * @returns 商品IDのリスト
 */
export function getProductIds(order: Order): ProductId[] {
  return order.orderLines.map((line) => line.productId);
}

/**
 * 注文ステータスの表示名を取得する
 * @param status 注文ステータス
 * @returns 日本語での表示名
 */
export function getStatusDisplayName(status: OrderStatus): string {
  switch (status.kind) {
    case "pending":
      return "未払い";
    case "paid":
      return "支払い済み";
    case "shipped":
      return "出荷済み";
    case "delivered":
      return "配達済み";
    case "cancelled":
      return "キャンセル済み";
  }
}
