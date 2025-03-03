/**
 * 注文ドメインサービスの実装
 * エンティティをまたがるドメインロジックを提供
 */
import {
  type cancelOrder,
  createOrder,
  type Order,
  type payOrder,
  type shipOrder,
} from "../entities/order.ts";
import type {
  CustomerId,
  Money,
  OrderId,
  OrderStatus,
  ProductId,
} from "../types.ts";
import { decreaseStock, type Product } from "../entities/product.ts";
import {
  err,
  type NotFoundError,
  ok,
  type Result,
  sequence,
  ValidationError,
} from "../../core/result.ts";
import { createMoney } from "../valueObjects/money.ts";

/**
 * 注文可能かどうかを検証する
 * @param customerId 顧客ID
 * @param orderLines 注文明細
 * @param products 商品リスト
 * @returns Result<void, ValidationError>
 */
export function validateOrderAvailability(
  customerId: CustomerId,
  orderLines: Array<{ productId: ProductId; quantity: number }>,
  products: Product[],
): Result<void, ValidationError> {
  // 注文明細が空でないことを確認
  if (orderLines.length === 0) {
    return err(
      new ValidationError("注文には少なくとも1つの注文明細が必要です"),
    );
  }

  // 各注文明細の商品が存在し、在庫があることを確認
  for (const line of orderLines) {
    const product = products.find((p) => p.id === line.productId);

    if (!product) {
      return err(
        new ValidationError(`商品ID ${line.productId} が見つかりません`),
      );
    }

    if (!product.isAvailable) {
      return err(
        new ValidationError(`商品 ${product.name} は現在利用できません`),
      );
    }

    if (product.stockQuantity < line.quantity) {
      return err(
        new ValidationError(
          `商品 ${product.name} の在庫が不足しています（要求: ${line.quantity}, 在庫: ${product.stockQuantity}）`,
        ),
      );
    }
  }

  return ok(undefined);
}

/**
 * 注文処理を行う
 * @param customerId 顧客ID
 * @param orderLines 注文明細
 * @param products 商品リスト（在庫確認・価格取得用）
 * @returns Result<{ order: Order, updatedProducts: Product[] }, ValidationError>
 */
export function processOrder(
  customerId: CustomerId,
  orderLines: Array<{ productId: ProductId; quantity: number }>,
  products: Product[],
): Result<{ order: Order; updatedProducts: Product[] }, ValidationError> {
  // 注文可能性の検証
  const validationResult = validateOrderAvailability(
    customerId,
    orderLines,
    products,
  );
  if (validationResult.isErr()) {
    return err(validationResult.error);
  }

  // 商品情報を取得し、OrderLine作成用パラメータを構築
  const orderLineParams = orderLines.map((line) => {
    const product = products.find((p) => p.id === line.productId)!; // validationResultで存在確認済み
    return {
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: product.price,
    };
  });

  // 注文エンティティの作成
  const orderResult = createOrder({
    customerId,
    orderLines: orderLineParams,
  });

  if (orderResult.isErr()) {
    return err(orderResult.error);
  }

  // 在庫の減少処理
  const updatedProductsResults = orderLines.map((line) => {
    const product = products.find((p) => p.id === line.productId)!;
    return decreaseStock(product, line.quantity);
  });

  const updatedProductsResult = sequence(updatedProductsResults);
  if (updatedProductsResult.isErr()) {
    return err(updatedProductsResult.error);
  }

  return ok({
    order: orderResult.value,
    updatedProducts: updatedProductsResult.value,
  });
}

/**
 * 注文の合計金額を計算する
 * @param orderLines 注文明細
 * @param products 商品リスト（価格取得用）
 * @returns Result<Money, ValidationError>
 */
export function calculateOrderTotal(
  orderLines: Array<{ productId: ProductId; quantity: number }>,
  products: Product[],
): Result<Money, ValidationError> {
  let total = 0;

  for (const line of orderLines) {
    const product = products.find((p) => p.id === line.productId);

    if (!product) {
      return err(
        new ValidationError(`商品ID ${line.productId} が見つかりません`),
      );
    }

    total += product.price * line.quantity;
  }

  return createMoney(total);
}

/**
 * 商品の価格変更が注文に与える影響を計算する
 * @param order 注文
 * @param product 価格変更された商品
 * @param oldPrice 元の価格
 * @returns 価格差額
 */
export function calculatePriceChangeImpact(
  order: Order,
  product: Product,
  oldPrice: Money,
): number {
  const orderLine = order.orderLines.find((line) =>
    line.productId === product.id
  );

  if (!orderLine) {
    return 0;
  }

  const priceDifference = product.price - oldPrice;
  return priceDifference * orderLine.quantity;
}

/**
 * 注文ステータスに応じた次のアクションを取得する
 * @param order 注文
 * @returns 次のアクション説明
 */
export function getNextAction(order: Order): string {
  switch (order.status.kind) {
    case "pending":
      return "支払いを行う";
    case "paid":
      return "出荷処理を行う";
    case "shipped":
      return "配達完了を記録する";
    case "delivered":
      return "アクションはありません（処理完了）";
    case "cancelled":
      return "アクションはありません（キャンセル済み）";
  }
}

/**
 * 注文が指定した状態への遷移が可能かチェックする
 * @param order 注文
 * @param targetStatus 目標状態
 * @returns 遷移可能ならtrue
 */
export function canTransitionTo(
  order: Order,
  targetStatus: OrderStatus["kind"],
): boolean {
  const currentStatus = order.status.kind;

  // 状態遷移の制約を定義
  const allowedTransitions: Record<OrderStatus["kind"], OrderStatus["kind"][]> =
    {
      "pending": ["paid", "cancelled"],
      "paid": ["shipped", "cancelled"],
      "shipped": ["delivered"],
      "delivered": [],
      "cancelled": [],
    };

  return allowedTransitions[currentStatus].includes(targetStatus);
}
