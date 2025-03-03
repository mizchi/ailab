# TypeScriptによるドメイン駆動設計（DDD）の実践

TypeScriptは型システムの強力さと柔軟性から、ドメイン駆動設計（DDD）の実装に適した言語のひとつです。このドキュメントでは、TypeScriptを使用してDDDの主要な構成要素を実装する方法を解説します。

## 目次

1. [TypeScriptでのDDD実装の利点](#1-typescript%E3%81%A7%E3%81%AEddd%E5%AE%9F%E8%A3%85%E3%81%AE%E5%88%A9%E7%82%B9)
2. [基本的な実装パターン](#2-%E5%9F%BA%E6%9C%AC%E7%9A%84%E3%81%AA%E5%AE%9F%E8%A3%85%E3%83%91%E3%82%BF%E3%83%BC%E3%83%B3)
   1. [値オブジェクト (Value Object)](#21-%E5%80%A4%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88-value-object)
   2. [エンティティ (Entity)](#22-%E3%82%A8%E3%83%B3%E3%83%86%E3%82%A3%E3%83%86%E3%82%A3-entity)
   3. [集約 (Aggregate)](#23-%E9%9B%86%E7%B4%84-aggregate)
   4. [リポジトリ (Repository)](#24-%E3%83%AA%E3%83%9D%E3%82%B8%E3%83%88%E3%83%AA-repository)
   5. [ドメインサービス (Domain Service)](#25-%E3%83%89%E3%83%A1%E3%82%A4%E3%83%B3%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9-domain-service)
   6. [ドメインイベント (Domain Event)](#26-%E3%83%89%E3%83%A1%E3%82%A4%E3%83%B3%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88-domain-event)
3. [アプリケーション層の実装](#3-%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E5%B1%A4%E3%81%AE%E5%AE%9F%E8%A3%85)
4. [インフラストラクチャ層の実装](#4-%E3%82%A4%E3%83%B3%E3%83%95%E3%83%A9%E3%82%B9%E3%83%88%E3%83%A9%E3%82%AF%E3%83%81%E3%83%A3%E5%B1%A4%E3%81%AE%E5%AE%9F%E8%A3%85)
5. [テストの書き方](#5-%E3%83%86%E3%82%B9%E3%83%88%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9)
6. [よくあるパターンとベストプラクティス](#6-%E3%82%88%E3%81%8F%E3%81%82%E3%82%8B%E3%83%91%E3%82%BF%E3%83%BC%E3%83%B3%E3%81%A8%E3%83%99%E3%82%B9%E3%83%88%E3%83%97%E3%83%A9%E3%82%AF%E3%83%86%E3%82%A3%E3%82%B9)

## 1. TypeScriptでのDDD実装の利点

TypeScriptを使用してDDDを実装する主な利点は以下の通りです：

1. **型安全性**:
   - ドメインモデルの表現力が向上し、コンパイル時にエラーを検出できる
   - ドメイン知識を型として表現することで、業務ルールをコードに落とし込みやすい

2. **インターフェース**:
   - リポジトリやサービスのインターフェースを明確に定義でき、依存性の注入がしやすい
   - アダプターの実装が型によって保証される

3. **ユビキタス言語の表現**:
   - 型定義を使って、ドメインで使われる言葉を直接コードに反映できる
   - カスタム型（type aliases, enum,
     interface）を活用し、業務用語を明確に表現できる

4. **自己文書化**:
   - 型定義により、コードが自己文書化されるため理解しやすい
   - JSDocと組み合わせることで、ドメインの意図を明確にドキュメント化できる

## 2. 基本的な実装パターン

### 2.1 値オブジェクト (Value Object)

値オブジェクトは以下の特性を持つオブジェクトです：

- イミュータブル（不変）
- 同一性がない（値のみで等価性を判断）
- 代替可能（値が同じなら交換可能）

#### 基本的な実装

```typescript
// シンプルな値オブジェクト
class Email {
  constructor(private readonly value: string) {
    // 値の検証
    if (!this.isValid(value)) {
      throw new Error("Invalid email format");
    }
  }

  private isValid(email: string): boolean {
    // メールアドレスのバリデーション
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

// 複合値オブジェクト
class Address {
  constructor(
    private readonly street: string,
    private readonly city: string,
    private readonly zipCode: string,
    private readonly country: string,
  ) {
    // 値の検証
    if (!zipCode.match(/^[0-9]{5}$/)) {
      throw new Error("Invalid zip code format");
    }
  }

  equals(other: Address): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.zipCode === other.zipCode &&
      this.country === other.country
    );
  }

  toString(): string {
    return `${this.street}, ${this.city}, ${this.zipCode}, ${this.country}`;
  }
}
```

### 2.2 エンティティ (Entity)

エンティティは以下の特性を持つオブジェクトです：

- ID（識別子）を持つ
- ライフサイクルがある
- 状態が変化しても同一性が保たれる

#### 基本的な実装

```typescript
// IDクラス
class CustomerId {
  constructor(private readonly id: string) {
    if (!id) {
      throw new Error("Customer ID cannot be empty");
    }
  }

  equals(other: CustomerId): boolean {
    return this.id === other.id;
  }

  toString(): string {
    return this.id;
  }
}

// エンティティ
class Customer {
  private _email: Email;
  private _address: Address;
  private _name: string;

  constructor(
    private readonly id: CustomerId,
    email: Email,
    name: string,
    address: Address,
  ) {
    this._email = email;
    this._name = name;
    this._address = address;
  }

  // IDによる等価性
  equals(other: Customer): boolean {
    return this.id.equals(other.id);
  }

  // 状態を変更するメソッド
  changeName(name: string): void {
    this._name = name;
  }

  changeEmail(email: Email): void {
    this._email = email;
  }

  // ゲッター
  get name(): string {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get address(): Address {
    return this._address;
  }

  get customerId(): CustomerId {
    return this.id;
  }
}
```

### 2.3 集約 (Aggregate)

集約はエンティティと値オブジェクトをまとめたグループで、整合性を保証する境界を形成します：

- 集約ルート（ルートエンティティ）を持つ
- 外部からのアクセスは集約ルートを通してのみ行う
- 集約内部の整合性は集約自身が保証する

#### 基本的な実装

```typescript
// 注文明細（値オブジェクト）
class OrderLine {
  constructor(
    private readonly productId: string,
    private readonly quantity: number,
    private readonly unitPrice: number,
  ) {
    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }
    if (unitPrice <= 0) {
      throw new Error("Unit price must be positive");
    }
  }

  get total(): number {
    return this.quantity * this.unitPrice;
  }

  get productIdentifier(): string {
    return this.productId;
  }

  get orderQuantity(): number {
    return this.quantity;
  }

  get price(): number {
    return this.unitPrice;
  }
}

// 注文ID（値オブジェクト）
class OrderId {
  constructor(private readonly id: string) {
    if (!id) {
      throw new Error("Order ID cannot be empty");
    }
  }

  equals(other: OrderId): boolean {
    return this.id === other.id;
  }

  toString(): string {
    return this.id;
  }
}

// 注文（集約ルート）
class Order {
  private readonly _orderLines: OrderLine[] = [];
  private _status: "pending" | "paid" | "shipped" | "cancelled" = "pending";

  constructor(
    private readonly id: OrderId,
    private readonly customerId: CustomerId,
  ) {}

  // 注文明細の追加
  addOrderLine(productId: string, quantity: number, unitPrice: number): void {
    // ビジネスルール：注文がキャンセルや発送済みの場合は注文明細を追加できない
    if (this._status === "cancelled" || this._status === "shipped") {
      throw new Error("Cannot modify a cancelled or shipped order");
    }

    // 既存の注文明細をチェック（同じ商品の場合は追加しない）
    const existingLine = this._orderLines.find(
      (line) => line.productIdentifier === productId,
    );
    if (existingLine) {
      throw new Error("Product already exists in order");
    }

    // 新しい注文明細を追加
    this._orderLines.push(new OrderLine(productId, quantity, unitPrice));
  }

  // 注文の支払い処理
  markAsPaid(): void {
    // ビジネスルール：注文に明細がない場合は支払い処理できない
    if (this._orderLines.length === 0) {
      throw new Error("Cannot pay for an empty order");
    }
    // ビジネスルール：キャンセルされた注文は支払い処理できない
    if (this._status === "cancelled") {
      throw new Error("Cannot pay a cancelled order");
    }
    // ビジネスルール：すでに支払い済みの注文は再度支払い処理できない
    if (this._status === "paid" || this._status === "shipped") {
      throw new Error("Order is already paid");
    }

    this._status = "paid";
  }

  // 注文の発送処理
  markAsShipped(): void {
    // ビジネスルール：支払い済みの注文のみ発送処理できる
    if (this._status !== "paid") {
      throw new Error("Can only ship paid orders");
    }
    this._status = "shipped";
  }

  // 注文のキャンセル処理
  cancel(): void {
    // ビジネスルール：発送済みの注文はキャンセルできない
    if (this._status === "shipped") {
      throw new Error("Cannot cancel a shipped order");
    }
    this._status = "cancelled";
  }

  // 合計金額の計算
  get total(): number {
    return this._orderLines.reduce((sum, line) => sum + line.total, 0);
  }

  get orderLines(): OrderLine[] {
    // 配列のコピーを返して不変性を保つ
    return [...this._orderLines];
  }

  get status(): string {
    return this._status;
  }

  get orderId(): OrderId {
    return this.id;
  }

  get customerIdentifier(): CustomerId {
    return this.customerId;
  }
}
```

### 2.4 リポジトリ (Repository)

リポジトリはエンティティや集約のコレクションを管理し、永続化や検索の詳細を隠蔽するインターフェースです：

- ドメイン層にはインターフェースのみを定義
- 実装はインフラ層に置く
- コレクションライクなインターフェースを提供

#### インターフェースの定義

```typescript
// リポジトリのインターフェース
interface CustomerRepository {
  findById(id: CustomerId): Promise<Customer | null>;
  findByEmail(email: Email): Promise<Customer | null>;
  save(customer: Customer): Promise<void>;
  remove(customer: Customer): Promise<void>;
  findAll(): Promise<Customer[]>;
}

// リポジトリのインターフェース
interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findByCustomerId(customerId: CustomerId): Promise<Order[]>;
  save(order: Order): Promise<void>;
  remove(order: Order): Promise<void>;
}
```

### 2.5 ドメインサービス (Domain Service)

ドメインサービスは特定のエンティティや値オブジェクトに属さない業務ロジック（特に複数のエンティティにまたがる処理）を実装します：

- ステートレス
- 特定のエンティティに属さない振る舞い
- 判断や計算に使用する

#### 基本的な実装

```typescript
// ドメインサービス
class PricingService {
  // 価格計算ロジック（例：割引やキャンペーンを適用）
  calculateFinalPrice(
    order: Order,
    discountPolicy: DiscountPolicy,
  ): number {
    // ベース価格を取得
    const basePrice = order.total;

    // 割引を適用
    const discount = discountPolicy.calculateDiscount(order);

    // 最終価格を計算
    return basePrice - discount;
  }
}

// 割引ポリシーのインターフェース
interface DiscountPolicy {
  calculateDiscount(order: Order): number;
}

// 具体的な割引ポリシーの実装
class VolumeDiscountPolicy implements DiscountPolicy {
  calculateDiscount(order: Order): number {
    // 注文の合計金額によって割引額を計算
    const total = order.total;

    if (total >= 1000) {
      return total * 0.1; // 10%割引
    } else if (total >= 500) {
      return total * 0.05; // 5%割引
    }

    return 0; // 割引なし
  }
}
```

### 2.6 ドメインイベント (Domain Event)

ドメインイベントはドメイン内で発生した重要な出来事を表し、システム内の他の部分に通知するために使用します：

- 発生した事実を表現
- 時制は過去形で命名（例：OrderPlaced）
- イミュータブル

#### 基本的な実装

```typescript
// ドメインイベント基底インターフェース
interface DomainEvent {
  readonly occurredAt: Date;
}

// 具体的なドメインイベント
class OrderPlaced implements DomainEvent {
  readonly occurredAt: Date;

  constructor(
    readonly orderId: OrderId,
    readonly customerId: CustomerId,
    readonly orderTotal: number,
  ) {
    this.occurredAt = new Date();
  }
}

class OrderPaid implements DomainEvent {
  readonly occurredAt: Date;

  constructor(
    readonly orderId: OrderId,
    readonly paidAmount: number,
  ) {
    this.occurredAt = new Date();
  }
}

// ドメインイベントを発行・購読するためのサービス
interface DomainEventPublisher {
  publish<T extends DomainEvent>(event: T): void;
  subscribe<T extends DomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: (event: T) => void,
  ): void;
}

// 集約へのドメインイベント統合（集約ルートの拡張）
abstract class AggregateRoot {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}

// ドメインイベントを発行する注文クラス
class OrderWithEvents extends AggregateRoot {
  private readonly _orderLines: OrderLine[] = [];
  private _status: "pending" | "paid" | "shipped" | "cancelled" = "pending";

  constructor(
    private readonly id: OrderId,
    private readonly customerId: CustomerId,
  ) {
    super();
    // 注文作成時にイベント発行
    this.addDomainEvent(
      new OrderPlaced(this.id, this.customerId, 0),
    );
  }

  // 支払い処理
  markAsPaid(): void {
    // ビジネスルールのチェック...

    this._status = "paid";

    // 支払い完了イベントを発行
    this.addDomainEvent(
      new OrderPaid(this.id, this.total),
    );
  }

  // 他のメソッド...

  get total(): number {
    return this._orderLines.reduce((sum, line) => sum + line.total, 0);
  }
}
```

## 3. アプリケーション層の実装

アプリケーション層はドメイン層とユーザーインターフェースの間に位置し、ユースケースを実装します：

- ドメインオブジェクトの操作と調整
- トランザクション制御
- 認可と認証
- インフラへの依存注入

```typescript
// アプリケーションサービス
class OrderApplicationService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly pricingService: PricingService,
    private readonly discountPolicy: DiscountPolicy,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  // ユースケース：注文を作成する
  async createOrder(
    customerId: string,
    items: Array<{ productId: string; quantity: number; unitPrice: number }>,
  ): Promise<string> {
    // 顧客の存在確認
    const customerIdObj = new CustomerId(customerId);
    const customer = await this.customerRepository.findById(customerIdObj);

    if (!customer) {
      throw new Error("Customer not found");
    }

    // 注文の作成
    const orderId = new OrderId(generateUniqueId());
    const order = new OrderWithEvents(orderId, customerIdObj);

    // 注文明細の追加
    for (const item of items) {
      order.addOrderLine(
        item.productId,
        item.quantity,
        item.unitPrice,
      );
    }

    // 注文の保存
    await this.orderRepository.save(order);

    // ドメインイベントの発行
    const events = order.clearEvents();
    events.forEach((event) => this.eventPublisher.publish(event));

    return orderId.toString();
  }

  // ユースケース：注文の支払いを処理する
  async payOrder(orderId: string): Promise<void> {
    // 注文の取得
    const orderIdObj = new OrderId(orderId);
    const order = await this.orderRepository.findById(orderIdObj);

    if (!order) {
      throw new Error("Order not found");
    }

    // 支払い処理
    order.markAsPaid();

    // 注文の保存
    await this.orderRepository.save(order);

    // ドメインイベントの発行
    const events = order.clearEvents();
    events.forEach((event) => this.eventPublisher.publish(event));
  }

  // ユースケース：注文の最終価格を計算する
  async calculateOrderTotal(orderId: string): Promise<number> {
    // 注文の取得
    const orderIdObj = new OrderId(orderId);
    const order = await this.orderRepository.findById(orderIdObj);

    if (!order) {
      throw new Error("Order not found");
    }

    // ドメインサービスを使用して価格を計算
    return this.pricingService.calculateFinalPrice(order, this.discountPolicy);
  }
}

// ヘルパー関数
function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

## 4. インフラストラクチャ層の実装

インフラストラクチャ層は永続化、メッセージング、外部サービスとの統合などの技術的な詳細を担当します：

- リポジトリの実装
- データベースアクセス
- 外部APIクライアント
- イベント発行の実装

```typescript
// リポジトリの実装（メモリ内）
class InMemoryCustomerRepository implements CustomerRepository {
  private customers: Map<string, Customer> = new Map();

  async findById(id: CustomerId): Promise<Customer | null> {
    const customer = this.customers.get(id.toString());
    return customer || null;
  }

  async findByEmail(email: Email): Promise<Customer | null> {
    for (const customer of this.customers.values()) {
      if (customer.email.equals(email)) {
        return customer;
      }
    }
    return null;
  }

  async save(customer: Customer): Promise<void> {
    this.customers.set(customer.customerId.toString(), customer);
  }

  async remove(customer: Customer): Promise<void> {
    this.customers.delete(customer.customerId.toString());
  }

  async findAll(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }
}

// リポジトリの実装（メモリ内）
class InMemoryOrderRepository implements OrderRepository {
  private orders: Map<string, Order> = new Map();

  async findById(id: OrderId): Promise<Order | null> {
    const order = this.orders.get(id.toString());
    return order || null;
  }

  async findByCustomerId(customerId: CustomerId): Promise<Order[]> {
    const result: Order[] = [];
    for (const order of this.orders.values()) {
      if (order.customerIdentifier.equals(customerId)) {
        result.push(order);
      }
    }
    return result;
  }

  async save(order: Order): Promise<void> {
    this.orders.set(order.orderId.toString(), order);
  }

  async remove(order: Order): Promise<void> {
    this.orders.delete(order.orderId.toString());
  }
}

// ドメインイベントパブリッシャーの実装
class SimpleDomainEventPublisher implements DomainEventPublisher {
  private handlers: Map<string, Array<(event: DomainEvent) => void>> =
    new Map();

  publish<T extends DomainEvent>(event: T): void {
    const eventType = event.constructor.name;
    const eventHandlers = this.handlers.get(eventType) || [];

    for (const handler of eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error handling event ${eventType}:`, error);
      }
    }
  }

  subscribe<T extends DomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: (event: T) => void,
  ): void {
    const eventName = eventType.name;
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }

    this.handlers.get(eventName)!.push(handler as any);
  }
}
```

## 5. テストの書き方

DDDの各要素をテストするアプローチを紹介します：

### 値オブジェクトのテスト

```typescript
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("Email - 有効なメールアドレスで作成できる", () => {
  const email = new Email("test@example.com");
  expect(email.toString()).toBe("test@example.com");
});

test("Email - 無効なメールアドレスでエラーを投げる", () => {
  expect(() => new Email("invalid-email")).toThrow();
});

test("Email - 同値性の比較ができる", () => {
  const email1 = new Email("test@example.com");
  const email2 = new Email("test@example.com");
  const email3 = new Email("other@example.com");

  expect(email1.equals(email2)).toBe(true);
  expect(email1.equals(email3)).toBe(false);
});
```

### エンティティのテスト

```typescript
test("Customer - IDによる等価性が判断される", () => {
  const id = new CustomerId("1");
  const email1 = new Email("test1@example.com");
  const email2 = new Email("test2@example.com");
  const address = new Address("Street", "City", "12345", "Country");

  const customer1 = new Customer(id, email1, "John", address);
  const customer2 = new Customer(id, email2, "Jane", address);

  expect(customer1.equals(customer2)).toBe(true);
});

test("Customer - 状態が変更できる", () => {
  const id = new CustomerId("1");
  const email = new Email("test@example.com");
  const address = new Address("Street", "City", "12345", "Country");

  const customer = new Customer(id, email, "John", address);
  customer.changeName("Jane");

  expect(customer.name).toBe("Jane");
});
```

### 集約のテスト

```typescript
test("Order - 注文明細を追加できる", () => {
  const orderId = new OrderId("1");
  const customerId = new CustomerId("c1");
  const order = new Order(orderId, customerId);

  order.addOrderLine("p1", 2, 100);

  expect(order.orderLines.length).toBe(1);
  expect(order.total).toBe(200);
});

test("Order - キャンセルされた注文には明細を追加できない", () => {
  const order = new Order(new OrderId("1"), new CustomerId("c1"));
  order.cancel();

  expect(() => order.addOrderLine("p1", 2, 100)).toThrow();
});

test("Order - 支払い済みの注文は発送処理ができる", () => {
  const order = new Order(new OrderId("1"), new CustomerId("c1"));
  order.addOrderLine("p1", 2, 100);
  order.markAsPaid();
  order.markAsShipped();

  expect(order.status).toBe("shipped");
});
```

### アプリケーションサービスのテスト

```typescript
test("OrderApplicationService - 注文を作成できる", async () => {
  // リポジトリなどをモックまたはスタブ化
  const orderRepo = new InMemoryOrderRepository();
  const customerRepo = new InMemoryCustomerRepository();
  const pricingService = new PricingService();
  const discountPolicy = new VolumeDiscountPolicy();
  const eventPublisher = new SimpleDomainEventPublisher();

  // テスト用のデータを設定
  const customerId = new CustomerId("c1");
  const customer = new Customer(
    customerId,
    new Email("test@example.com"),
    "Test Customer",
    new Address("Street", "City", "12345", "Country"),
  );
  await customerRepo.save(customer);

  // テスト対象のサービスを作成
  const service = new OrderApplicationService(
    orderRepo,
    customerRepo,
    pricingService,
    discountPolicy,
    eventPublisher,
  );

  // イベント検証用のハンドラー
  let eventReceived = false;
  eventPublisher.subscribe(OrderPlaced, () => {
    eventReceived = true;
  });

  // テスト実行
  const orderId = await service.createOrder("c1", [
    { productId: "p1", quantity: 2, unitPrice: 100 },
  ]);

  // 検証
  expect(orderId).toBeDefined();
  expect(eventReceived).toBe(true);

  const order = await orderRepo.findById(new OrderId(orderId));
  expect(order).not.toBeNull();
  expect(order?.total).toBe(200);
});
```

## 6. よくあるパターンとベストプラクティス

### 6.1 型安全を高める

```typescript
// 文字列リテラル型を使用して列挙型の代わりに
type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";

// Result型を使用して成功/失敗をより明示的に表現
interface Result<T, E = Error> {
  isSuccess: boolean;
  value?: T;
  error?: E;
}

function success<T>(value: T): Result<T> {
  return { isSuccess: true, value };
}

function failure<E extends Error>(error: E): Result<never, E> {
  return { isSuccess: false, error };
}

// 使用例
function placeOrder(order: Order): Result<OrderId, Error> {
  try {
    // 注文処理...
    return success(order.orderId);
  } catch (e) {
    return failure(e instanceof Error ? e : new Error(String(e)));
  }
}
```

### 6.2 インターフェースを活用する

```typescript
// 実装から分離されたリッチなドメインモデル
interface IOrder {
  readonly orderId: OrderId;
  readonly customerId: CustomerId;
  readonly status: OrderStatus;
  readonly total: number;
  readonly orderLines: ReadonlyArray<OrderLine>;

  addOrderLine(productId: string, quantity: number, unitPrice: number): void;
  markAsPaid(): void;
  markAsShipped(): void;
  cancel(): void;
}

// リードモデルとライトモデルの分離（CQRS的なアプローチ）
interface OrderReadModel {
  readonly id: string;
  readonly customerName: string;
  readonly status: OrderStatus;
  readonly total: number;
  readonly items: ReadonlyArray<{
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

// リードモデルの実装
class OrderReadService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async getOrderDetails(orderId: string): Promise<OrderReadModel | null> {
    // 実装...
  }
}
```

### 6.3 依存性の注入

```typescript
// 依存性の注入（インターフェースベース）
interface Logger {
  log(message: string): void;
  error(message: string, error?: Error): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }

  error(message: string, error?: Error): void {
    console.error(message, error);
  }
}

// DIコンテナを使用した依存性の注入
class DIContainer {
  private services: Map<string, any> = new Map();

  register<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service ${key} not registered`);
    }
    return service as T;
  }
}

// 使用例
const container = new DIContainer();
container.register<Logger>("logger", new ConsoleLogger());
container.register<CustomerRepository>(
  "customerRepository",
  new InMemoryCustomerRepository(),
);

const logger = container.resolve<Logger>("logger");
const customerRepo = container.resolve<CustomerRepository>(
  "customerRepository",
);
```

### 6.4 ファイル構造とモジュール分割

DDDを実装する際の推奨ファイル構造：

```
src/
├── domain/             # ドメイン層
│   ├── customer/       # 顧客集約
│   │   ├── customer.ts # 顧客エンティティ
│   │   ├── email.ts    # メール値オブジェクト
│   │   ├── address.ts  # 住所値オブジェクト
│   │   └── index.ts    # 集約のエクスポート
│   ├── order/          # 注文集約
│   │   ├── order.ts    # 注文エンティティ
│   │   ├── order-line.ts # 注文明細値オブジェクト
│   │   ├── events/     # ドメインイベント
│   │   └── index.ts    # 集約のエクスポート
│   └── services/       # ドメインサービス
│       └── pricing-service.ts
├── application/        # アプリケーション層
│   ├── customer/       # 顧客ユースケース
│   ├── order/          # 注文ユースケース
│   └── interfaces/     # アプリケーションインターフェース
├── infrastructure/     # インフラストラクチャ層
│   ├── persistence/    # 永続化
│   ├── messaging/      # メッセージング
│   └── services/       # 外部サービス
└── interface/          # インターフェース層
    ├── api/            # REST API
    ├── cli/            # コマンドライン
    └── dto/            # データ転送オブジェクト
```

### 6.5 バリデーション戦略

```typescript
// ドメインバリデーション
abstract class ValueObject<T> {
  constructor(protected readonly value: T) {
    this.validate();
    Object.freeze(this); // イミュータブル化
  }

  protected abstract validate(): void;

  public equals(other: ValueObject<T>): boolean {
    return JSON.stringify(this.value) === JSON.stringify(other.value);
  }
}

class ZipCode extends ValueObject<string> {
  protected validate(): void {
    if (!this.value.match(/^[0-9]{5}$/)) {
      throw new Error("Invalid zip code format");
    }
  }

  toString(): string {
    return this.value;
  }
}

// アプリケーション層でのバリデーション（DTOレベル）
interface CreateOrderDto {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

function validateCreateOrderDto(dto: CreateOrderDto): string[] {
  const errors: string[] = [];

  if (!dto.customerId) {
    errors.push("Customer ID is required");
  }

  if (!dto.items || dto.items.length === 0) {
    errors.push("Order must have at least one item");
  } else {
    for (const [index, item] of dto.items.entries()) {
      if (!item.productId) {
        errors.push(`Item ${index}: Product ID is required`);
      }

      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index}: Quantity must be positive`);
      }

      if (!item.unitPrice || item.unitPrice <= 0) {
        errors.push(`Item ${index}: Unit price must be positive`);
      }
    }
  }

  return errors;
}
```

### 6.6 エラー処理

```typescript
// ドメイン例外
class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

class InvalidEmailError extends DomainError {
  constructor(email: string) {
    super(`Invalid email format: ${email}`);
  }
}

class OrderError extends DomainError {
  constructor(message: string, public readonly orderId?: OrderId) {
    super(message);
  }
}

class OrderCannotBeModifiedError extends OrderError {
  constructor(orderId: OrderId) {
    super(
      `Order ${orderId.toString()} cannot be modified in its current state`,
      orderId,
    );
  }
}

// エラー処理パターン
function createEmail(email: string): Result<Email, InvalidEmailError> {
  try {
    return success(new Email(email));
  } catch (error) {
    return failure(new InvalidEmailError(email));
  }
}

// アプリケーション層でのエラーハンドリング
class OrderApplicationService {
  // ...

  async markOrderAsPaid(orderId: string): Promise<Result<void, Error>> {
    try {
      const orderIdObj = new OrderId(orderId);
      const order = await this.orderRepository.findById(orderIdObj);

      if (!order) {
        return failure(new Error(`Order with ID ${orderId} not found`));
      }

      order.markAsPaid();
      await this.orderRepository.save(order);

      const events = order.clearEvents();
      events.forEach((event) => this.eventPublisher.publish(event));

      return success(void 0);
    } catch (error) {
      if (error instanceof OrderError) {
        return failure(error);
      }
      return failure(new Error(`Failed to mark order as paid: ${error}`));
    }
  }
}
```

このドキュメントは、TypeScriptを使用したDDDの実装方法の概要を提供しています。実際のプロジェクトでは、ビジネスドメインやアプリケーションの要件に応じて適宜調整することが重要です。
