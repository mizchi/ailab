/**
 * 注文アプリケーションサービス
 * 注文に関するユースケースを実装
 */
import {
  cancelOrder,
  type createOrder,
  deliverOrder,
  type Order,
  payOrder,
  shipOrder,
} from "../domain/entities/order.ts";
import type { OrderRepository } from "../domain/repositories/orderRepository.ts";
import type { CustomerRepository } from "../domain/repositories/customerRepository.ts";
import type { ProductRepository } from "../domain/repositories/productRepository.ts";
import {
  validateCustomerId,
  validateOrderId,
  validateProductId,
} from "../domain/valueObjects/ids.ts";
import type { createQuantity } from "../domain/valueObjects/quantity.ts";
import {
  type calculateOrderTotal,
  getNextAction,
  processOrder,
  validateOrderAvailability,
} from "../domain/services/orderService.ts";
import {
  type AppError,
  err,
  NotFoundError,
  ok,
  type Result,
  ValidationError,
} from "../core/result.ts";
import type { Product } from "../domain/entities/product.ts";

/**
 * 注文明細DTOインターフェース
 */
export interface OrderLineDto {
  productId: string;
  quantity: number;
}

/**
 * 注文作成DTOインターフェース
 */
export interface CreateOrderDto {
  customerId: string;
  orderLines: OrderLineDto[];
}

/**
 * 注文情報DTOインターフェース（レスポンス用）
 */
export interface OrderInfoDto {
  orderId: string;
  customerId: string;
  customerName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  totalAmount: number;
  status: string;
  statusText: string;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 注文アプリケーションサービス
 */
export class OrderApplicationService {
  /**
   * コンストラクタ
   * @param orderRepository 注文リポジトリ
   * @param customerRepository 顧客リポジトリ
   * @param productRepository 商品リポジトリ
   */
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  /**
   * 注文作成ユースケース
   * @param dto 注文作成情報
   * @returns Result<string, AppError> 注文ID
   */
  async createOrder(dto: CreateOrderDto): Promise<Result<string, AppError>> {
    // 顧客IDの検証
    const customerIdResult = validateCustomerId(dto.customerId);
    if (customerIdResult.isErr()) {
      return err(customerIdResult.error);
    }

    // 顧客の存在確認
    const customerResult = await this.customerRepository.findById(
      customerIdResult.value,
    );
    if (customerResult.isErr()) {
      return err(customerResult.error);
    }

    const customer = customerResult.value;
    if (!customer) {
      return err(new NotFoundError("顧客", dto.customerId));
    }

    // 顧客がアクティブでない場合はエラー
    if (!customer.isActive) {
      return err(new ValidationError("非アクティブな顧客は注文できません"));
    }

    // 注文明細の検証
    if (dto.orderLines.length === 0) {
      return err(new ValidationError("注文には少なくとも1つの商品が必要です"));
    }

    // 商品IDの検証と商品情報の取得
    const productIdsResults = dto.orderLines.map((line) =>
      validateProductId(line.productId)
    );
    const productIds: string[] = [];

    for (const result of productIdsResults) {
      if (result.isErr()) {
        return err(result.error);
      }
      productIds.push(result.value);
    }

    // 全商品の取得
    const productsResult = await this.productRepository.findAll();
    if (productsResult.isErr()) {
      return err(productsResult.error);
    }

    const allProducts = productsResult.value;

    // 注文明細に含まれる商品を特定
    const products: Product[] = [];
    for (const productId of productIds) {
      const product = allProducts.find((p) => p.id === productId);
      if (!product) {
        return err(new NotFoundError("商品", productId));
      }
      products.push(product);
    }

    // 注文可能性の検証
    const orderLines = dto.orderLines.map((line) => ({
      productId: line.productId as any, // validateProductIdで検証済みなので型キャスト
      quantity: line.quantity,
    }));

    const validationResult = validateOrderAvailability(
      customerIdResult.value,
      orderLines,
      products,
    );

    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    // 注文処理
    const processResult = processOrder(
      customerIdResult.value,
      orderLines,
      products,
    );

    if (processResult.isErr()) {
      return err(processResult.error);
    }

    // 注文と更新された商品情報の保存
    const { order, updatedProducts } = processResult.value;

    // 注文の保存
    const saveOrderResult = await this.orderRepository.save(order);
    if (saveOrderResult.isErr()) {
      return err(saveOrderResult.error);
    }

    // 更新された商品（在庫減）の保存
    const saveProductsResult = await this.productRepository.saveAll(
      updatedProducts,
    );
    if (saveProductsResult.isErr()) {
      return err(saveProductsResult.error);
    }

    return ok(order.id);
  }

  /**
   * 注文支払いユースケース
   * @param orderId 注文ID
   * @returns Result<void, AppError>
   */
  async payOrder(orderId: string): Promise<Result<void, AppError>> {
    // 注文IDの検証
    const orderIdResult = validateOrderId(orderId);
    if (orderIdResult.isErr()) {
      return err(orderIdResult.error);
    }

    // 注文の取得
    const orderResult = await this.orderRepository.findById(
      orderIdResult.value,
    );
    if (orderResult.isErr()) {
      return err(orderResult.error);
    }

    const order = orderResult.value;
    if (!order) {
      return err(new NotFoundError("注文", orderId));
    }

    // 支払い処理
    const paidOrderResult = payOrder(order);
    if (paidOrderResult.isErr()) {
      return err(paidOrderResult.error);
    }

    // 注文の保存
    const saveResult = await this.orderRepository.save(paidOrderResult.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(undefined);
  }

  /**
   * 注文出荷ユースケース
   * @param orderId 注文ID
   * @returns Result<void, AppError>
   */
  async shipOrder(orderId: string): Promise<Result<void, AppError>> {
    // 注文IDの検証
    const orderIdResult = validateOrderId(orderId);
    if (orderIdResult.isErr()) {
      return err(orderIdResult.error);
    }

    // 注文の取得
    const orderResult = await this.orderRepository.findById(
      orderIdResult.value,
    );
    if (orderResult.isErr()) {
      return err(orderResult.error);
    }

    const order = orderResult.value;
    if (!order) {
      return err(new NotFoundError("注文", orderId));
    }

    // 出荷処理
    const shippedOrderResult = shipOrder(order);
    if (shippedOrderResult.isErr()) {
      return err(shippedOrderResult.error);
    }

    // 注文の保存
    const saveResult = await this.orderRepository.save(
      shippedOrderResult.value,
    );
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(undefined);
  }

  /**
   * 注文配達完了ユースケース
   * @param orderId 注文ID
   * @returns Result<void, AppError>
   */
  async deliverOrder(orderId: string): Promise<Result<void, AppError>> {
    // 注文IDの検証
    const orderIdResult = validateOrderId(orderId);
    if (orderIdResult.isErr()) {
      return err(orderIdResult.error);
    }

    // 注文の取得
    const orderResult = await this.orderRepository.findById(
      orderIdResult.value,
    );
    if (orderResult.isErr()) {
      return err(orderResult.error);
    }

    const order = orderResult.value;
    if (!order) {
      return err(new NotFoundError("注文", orderId));
    }

    // 配達完了処理
    const deliveredOrderResult = deliverOrder(order);
    if (deliveredOrderResult.isErr()) {
      return err(deliveredOrderResult.error);
    }

    // 注文の保存
    const saveResult = await this.orderRepository.save(
      deliveredOrderResult.value,
    );
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(undefined);
  }

  /**
   * 注文キャンセルユースケース
   * @param orderId 注文ID
   * @param reason キャンセル理由
   * @returns Result<void, AppError>
   */
  async cancelOrder(
    orderId: string,
    reason: string,
  ): Promise<Result<void, AppError>> {
    // 注文IDの検証
    const orderIdResult = validateOrderId(orderId);
    if (orderIdResult.isErr()) {
      return err(orderIdResult.error);
    }

    // 注文の取得
    const orderResult = await this.orderRepository.findById(
      orderIdResult.value,
    );
    if (orderResult.isErr()) {
      return err(orderResult.error);
    }

    const order = orderResult.value;
    if (!order) {
      return err(new NotFoundError("注文", orderId));
    }

    // キャンセル理由の検証
    if (!reason.trim()) {
      return err(new ValidationError("キャンセル理由は必須です"));
    }

    // キャンセル処理
    const cancelledOrderResult = cancelOrder(order, reason);
    if (cancelledOrderResult.isErr()) {
      return err(cancelledOrderResult.error);
    }

    // 注文の保存
    const saveResult = await this.orderRepository.save(
      cancelledOrderResult.value,
    );
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(undefined);
  }

  /**
   * 注文詳細取得ユースケース
   * @param orderId 注文ID
   * @returns Result<OrderInfoDto, AppError>
   */
  async getOrderDetail(
    orderId: string,
  ): Promise<Result<OrderInfoDto, AppError>> {
    // 注文IDの検証
    const orderIdResult = validateOrderId(orderId);
    if (orderIdResult.isErr()) {
      return err(orderIdResult.error);
    }

    // 注文の取得
    const orderResult = await this.orderRepository.findById(
      orderIdResult.value,
    );
    if (orderResult.isErr()) {
      return err(orderResult.error);
    }

    const order = orderResult.value;
    if (!order) {
      return err(new NotFoundError("注文", orderId));
    }

    // 顧客情報の取得
    const customerResult = await this.customerRepository.findById(
      order.customerId,
    );
    if (customerResult.isErr()) {
      return err(customerResult.error);
    }

    const customer = customerResult.value;
    if (!customer) {
      return err(new NotFoundError("顧客", order.customerId));
    }

    // 商品情報の取得
    const productIds = order.orderLines.map((line) => line.productId);
    const products: Product[] = [];

    for (const productId of productIds) {
      const productResult = await this.productRepository.findById(productId);
      if (productResult.isErr()) {
        return err(productResult.error);
      }

      const product = productResult.value;
      if (!product) {
        return err(new NotFoundError("商品", productId));
      }

      products.push(product);
    }

    // 注文情報DTOの作成
    const orderInfoDto: OrderInfoDto = {
      orderId: order.id,
      customerId: customer.id,
      customerName: `${customer.lastName} ${customer.firstName}`,
      items: order.orderLines.map((line) => {
        const product = products.find((p) => p.id === line.productId)!;
        return {
          productId: product.id,
          productName: product.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          subtotal: line.quantity * line.unitPrice,
        };
      }),
      totalAmount: order.totalAmount,
      status: order.status.kind,
      statusText: this.getStatusText(order.status.kind),
      nextAction: getNextAction(order),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };

    return ok(orderInfoDto);
  }

  /**
   * 注文一覧取得ユースケース
   * @param customerId 顧客ID（指定がある場合）
   * @param status 注文ステータス（指定がある場合）
   * @returns Result<OrderInfoDto[], AppError>
   */
  async listOrders(
    customerId?: string,
    status?: string,
  ): Promise<Result<OrderInfoDto[], AppError>> {
    let orders: Order[];

    // 顧客IDでフィルタリング
    if (customerId) {
      const customerIdResult = validateCustomerId(customerId);
      if (customerIdResult.isErr()) {
        return err(customerIdResult.error);
      }

      const ordersByCustomerResult = await this.orderRepository
        .findByCustomerId(
          customerIdResult.value,
        );

      if (ordersByCustomerResult.isErr()) {
        return err(ordersByCustomerResult.error);
      }

      orders = ordersByCustomerResult.value;
    } else {
      // 全注文取得
      const allOrdersResult = await this.orderRepository.findAll();
      if (allOrdersResult.isErr()) {
        return err(allOrdersResult.error);
      }

      orders = allOrdersResult.value;
    }

    // ステータスでフィルタリング
    if (status) {
      const validStatuses = [
        "pending",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return err(new ValidationError(`無効な注文ステータスです: ${status}`));
      }

      orders = orders.filter((order) => order.status.kind === status);
    }

    // 注文情報の詳細を取得
    const orderInfoDtos: OrderInfoDto[] = [];

    for (const order of orders) {
      const orderDetailResult = await this.getOrderDetail(order.id);
      if (orderDetailResult.isErr()) {
        // エラーの場合はスキップ
        continue;
      }

      orderInfoDtos.push(orderDetailResult.value);
    }

    return ok(orderInfoDtos);
  }

  /**
   * 顧客の注文数を取得するユースケース
   * @param customerId 顧客ID
   * @returns Result<number, AppError>
   */
  async getCustomerOrderCount(
    customerId: string,
  ): Promise<Result<number, AppError>> {
    const customerIdResult = validateCustomerId(customerId);
    if (customerIdResult.isErr()) {
      return err(customerIdResult.error);
    }

    return await this.orderRepository.countByCustomerId(customerIdResult.value);
  }

  /**
   * 注文ステータスのテキスト表現を取得
   * @param status 注文ステータス
   * @returns ステータスの日本語テキスト
   */
  private getStatusText(status: string): string {
    switch (status) {
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
      default:
        return "不明なステータス";
    }
  }
}
