# 関数型ドメインモデリング（Functional Domain Modeling）

## 目次

1. [関数型ドメインモデリングとは](#1-関数型ドメインモデリングとは)
2. [関数型プログラミングとDDDの融合](#2-関数型プログラミングとdddの融合)
3. [TypeScriptにおける関数型ドメインモデリング](#3-typescriptにおける関数型ドメインモデリング)
4. [主要な実装パターン](#4-主要な実装パターン)
5. [オニオンアーキテクチャとの組み合わせ](#5-オニオンアーキテクチャとの組み合わせ)
6. [メリットとデメリット](#6-メリットとデメリット)
7. [実装例](#7-実装例)
8. [参考リソース](#8-参考リソース)

## 1. 関数型ドメインモデリングとは

関数型ドメインモデリングは、ドメイン駆動設計（DDD）の考え方を関数型プログラミング（FP）のパラダイムで実現するアプローチです。Scott
Wlashinの著書「Domain Modeling Made
Functional」で体系化された方法論で、以下の特徴があります：

### 1.1 基本概念

- **ドメインロジックを型と関数で表現する**：
  - ビジネスプロセスをワークフローとして純粋関数で表現
  - データ構造をイミュータブルな型で表現
  - 代数的データ型（ADT）を活用したモデリング

- **型駆動開発（Type Driven Development）**：
  - 型を先に設計し、それに導かれる形で実装を進める
  - 「不正な状態を表現できないようにする」（make illegal states
    unrepresentable）

- **イミュータブル**：
  - 状態の変更ではなく、状態遷移を関数適用として表現
  - オブジェクトは変更せず、新しいオブジェクトを返す

### 1.2 従来のDDDとの違い

従来のオブジェクト指向ベースのDDDと比較した関数型DDDの特徴：

| 側面           | オブジェクト指向DDD              | 関数型DDD                  |
| -------------- | -------------------------------- | -------------------------- |
| 状態管理       | 可変状態（ミュータブル）         | 不変状態（イミュータブル） |
| 振る舞い       | メソッド                         | 純粋関数                   |
| カプセル化     | クラス内部に状態と振る舞いを隠蔽 | 型と関数を明示的に分離     |
| 副作用         | ドメイン内に分散                 | 境界に押し出す             |
| モデリング手法 | クラス図など                     | 型定義と関数シグネチャ     |
| エラー処理     | 例外                             | 型で表現（Result型など）   |

## 2. 関数型プログラミングとDDDの融合

### 2.1 なぜ関数型プログラミングとDDDを組み合わせるのか

1. **型の活用**：
   - 静的型付け言語の利点を最大限に活かす
   - 型によるドメイン知識の表現と検証
   - コンパイル時の型チェックによるエラー検出

2. **保守性の向上**：
   - 副作用を分離し、純粋関数に集中することで予測可能性が高まる
   - イミュータブルな設計により、状態変化に関連する複雑さを減少

3. **テスト容易性**：
   - 純粋関数は入力と出力の関係が明確で、テストが容易
   - 副作用の分離により、ドメインロジックのみをテストできる

### 2.2 関数型DDDの核となる要素

1. **ユビキタス言語の重視**：
   - 型定義を通じて、ドメインの概念を明確に表現
   - プリミティブ型の代わりに、ドメイン固有の型を使用

2. **イベントとワークフローへのフォーカス**：
   - データ構造よりもイベントとワークフローを重視
   - ワークフローをパイプラインとして表現

3. **自然言語ベースのモデリング**：
   - UMLなどのダイアグラムよりも、自然言語を書式化した表現を使用
   - プログラマ以外の関係者と認識を共有しやすい

## 3. TypeScriptにおける関数型ドメインモデリング

TypeScriptは静的型付け言語としての特性を持ちながら、関数型プログラミングの要素も取り入れられるため、関数型ドメインモデリングの実践に適しています。

### 3.1 TypeScriptでの型表現

TypeScriptでは以下の機能を使って関数型DDDの型を表現できます：

1. **インターフェース/型エイリアス**：
   - ドメインオブジェクトの構造を定義
   - 値オブジェクトやエンティティを表現

```typescript
// 値オブジェクトの例
type Email = string & { readonly _brand: unique symbol };

function createEmail(value: string): Email | Error {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return new Error("Invalid email format");
  }
  return value as Email;
}

// エンティティの例
interface Customer {
  readonly id: CustomerId;
  readonly name: string;
  readonly email: Email;
  readonly archived: boolean;
}
```

2. **判別共用体（Discriminated Unions）**：
   - 代数的データ型のOR型（直和型）を表現
   - 状態の遷移や複数の選択肢を型安全に表現

```typescript
// 支払い方法の表現
type PaymentMethod =
  | { kind: "creditCard"; cardNumber: string; expiryDate: string }
  | { kind: "bankTransfer"; accountNumber: string; bankCode: string }
  | { kind: "cash" };

// 注文状態の表現
type OrderStatus =
  | { kind: "pending" }
  | { kind: "paid"; paidAt: Date }
  | { kind: "shipped"; shippedAt: Date }
  | { kind: "delivered"; deliveredAt: Date }
  | { kind: "cancelled"; cancelledAt: Date; reason: string };
```

3. **読み取り専用型**：
   - イミュータビリティを強制
   - オブジェクトを不変にすることで、予測可能性を向上

```typescript
// イミュータブルなコレクション
type OrderLine = Readonly<{
  productId: string;
  quantity: number;
  unitPrice: number;
}>;

// イミュータブルな配列
type OrderLines = ReadonlyArray<OrderLine>;
```

### 3.2 TypeScriptでのResult型と関数合成

TypeScriptには組み込みのResult型がないため、サードパーティライブラリを使用するのが一般的です：

1. **Result型の実装**：
   - `neverthrow`、`fp-ts`、`effect`などのライブラリを使用
   - 成功と失敗を明示的に表現する型

```typescript
import { err, ok, Result } from "neverthrow";

// Result型を返す関数
function validateCustomer(customer: Customer): Result<Customer, Error> {
  if (!customer.email) {
    return err(new Error("Email is required"));
  }
  return ok(customer);
}
```

2. **関数合成**：
   - 小さな関数を組み合わせてワークフローを構築
   - Railwayパターン（Railway Oriented Programming）

```typescript
// 関数合成によるワークフロー
const createOrderWorkflow = (
  command: CreateOrderCommand,
): Result<Order, Error> => {
  return validateOrder(command)
    .andThen(extractCustomerInfo)
    .andThen(calculateTotalPrice)
    .andThen(createOrderEntity);
};
```

## 4. 主要な実装パターン

### 4.1 イミュータブルな状態遷移

オブジェクトの状態変更を、新しいオブジェクトを返す関数として実装します：

```typescript
// × 直接変更するのではなく
function archiveCustomer(customer: Customer): void {
  customer.archived = true; // ミュータブル
}

// ○ 新しいオブジェクトを返す
function archiveCustomer(customer: Customer): Customer {
  return { ...customer, archived: true }; // イミュータブル
}
```

### 4.2 Railway Oriented Programming

エラー処理をResult型を使って、ワークフローを中断せずに流れるように実装します：

```typescript
// 関数合成で「線路」を構築
const placeOrderWorkflow = (
  command: PlaceOrderCommand,
): Result<OrderId, Error> => {
  return validateOrder(command)
    .andThen(reserveInventory)
    .andThen(processPayment)
    .andThen(createOrder)
    .andThen(notifyCustomer);
};
```

### 4.3 型による不正状態の排除

型システムを活用して、不正な状態を表現できないようにします：

```typescript
// × 不正な状態が表現可能
interface Email {
  address: string;
  isValid: boolean; // 有効かどうかをbool値で表現
}

// ○ 不正な状態を表現できない
type Email = string & { readonly _brand: unique symbol };

function createEmail(value: string): Result<Email, Error> {
  if (!isValidEmail(value)) {
    return err(new Error("Invalid email"));
  }
  return ok(value as Email);
}
```

### 4.4 純粋関数と副作用の分離

ドメインロジックを純粋関数として実装し、I/Oなどの副作用を境界に押し出します：

```typescript
// 純粋なドメイン関数
function calculateTotalPrice(orderLines: OrderLine[]): number {
  return orderLines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
}

// 副作用を含む関数（外部に分離）
async function saveOrder(order: Order): Promise<void> {
  await orderRepository.save(order);
}
```

## 5. オニオンアーキテクチャとの組み合わせ

関数型ドメインモデリングは、オニオンアーキテクチャ（クリーンアーキテクチャ）と非常に相性が良いです。

### 5.1 レイヤー構成

1. **ドメイン層**：
   - 純粋関数として実装されたビジネスロジック
   - イミュータブルな型で表現されたドメインオブジェクト
   - 副作用を含まない

2. **アプリケーション層**：
   - ユースケースを実装
   - ドメイン層への依存を注入
   - ワークフローとして実装

3. **インフラストラクチャ層**：
   - 永続化、メッセージング、外部APIなど
   - 副作用を含む処理
   - ドメイン層へのアダプター

### 5.2 依存性の注入

関数型プログラミングにおける依存性の注入は、部分適用を使って実現することが多いです：

```typescript
// 依存性を受け取る関数
function createOrderWorkflow(
  customerRepository: CustomerRepository,
  inventoryService: InventoryService,
) {
  // 依存性を部分適用した関数を返す
  return (command: CreateOrderCommand): Result<Order, Error> => {
    // 実装
    return validateOrder(command)
      .andThen((customer) => customerRepository.findById(customer.id))
      .andThen((customer) =>
        inventoryService.checkAvailability(customer, command.items)
      )
      .andThen(createOrder);
  };
}
```

## 6. メリットとデメリット

### 6.1 メリット

1. **型安全性の向上**：
   - 型システムの力を最大限に活用
   - コンパイル時にエラーを検出
   - 不正な状態を表現できないように設計

2. **テストの簡素化**：
   - 純粋関数は入出力の関係が明確で、テストしやすい
   - 副作用の分離により、モックの必要性が減少
   - 型による検証で一部のユニットテストが不要に

3. **保守性と拡張性の向上**：
   - イミュータブルな設計により副作用が限定され、変更の影響範囲が明確
   - 関数合成によるワークフローは、新しいステップの追加が容易
   - ドメインモデルの変更が型システムによって検証される

4. **ビジネスルールの明示的な表現**：
   - 型と関数シグネチャでビジネスルールを表現
   - ドメインの言語を型システムに落とし込む
   - コードがドキュメントとしても機能

### 6.2 デメリット

1. **TypeScriptでの実装の複雑さ**：
   - Result型などがネイティブサポートされていない
   - 関数合成が冗長になりがちで「Result型パズル」が発生
   - 文脈付き計算の簡潔な表現（HaskellのDoやF#のComputationExpressionに相当するもの）がない

2. **学習曲線**：
   - 関数型プログラミングの概念理解が必要
   - 従来の命令型/オブジェクト指向からの切替えコスト
   - チーム全体での理解と実践が必要

3. **外部ライブラリへの依存**：
   - Result型やその他の関数型構造のためにサードパーティライブラリが必要
   - 将来のライブラリサポート状況によるリスク

4. **実行時のオーバーヘッド**：
   - イミュータブルな操作による新オブジェクト生成のコスト
   - 大量のデータを扱う場合のパフォーマンス懸念

## 7. 実装例

TypeScriptでの関数型ドメインモデリングの実装例として、簡単な注文処理システムを見てみましょう。

### 7.1 ドメインモデル

```typescript
// ======= 値オブジェクト =======
type CustomerId = string & { readonly _brand: unique symbol };
type OrderId = string & { readonly _brand: unique symbol };
type ProductId = string & { readonly _brand: unique symbol };

type Money = number & { readonly _brand: unique symbol };
function createMoney(amount: number): Result<Money, Error> {
  if (amount < 0) {
    return err(new Error("Money amount cannot be negative"));
  }
  return ok(amount as Money);
}

// ======= エンティティ =======
interface OrderLine {
  readonly productId: ProductId;
  readonly quantity: number;
  readonly unitPrice: Money;
}

interface Order {
  readonly id: OrderId;
  readonly customerId: CustomerId;
  readonly orderLines: ReadonlyArray<OrderLine>;
  readonly status: OrderStatus;
  readonly totalAmount: Money;
  readonly createdAt: Date;
}

// ======= 代数的データ型（直和型） =======
type OrderStatus =
  | { kind: "pending" }
  | { kind: "paid"; paidAt: Date }
  | { kind: "shipped"; shippedAt: Date }
  | { kind: "cancelled"; reason: string };
```

### 7.2 状態遷移関数

```typescript
// OrderStatusの状態遷移関数
function payOrder(order: Order, paymentDate: Date): Result<Order, Error> {
  if (order.status.kind !== "pending") {
    return err(new Error(`Cannot pay order in ${order.status.kind} status`));
  }

  return ok({
    ...order,
    status: { kind: "paid", paidAt: paymentDate },
  });
}

function shipOrder(order: Order, shipmentDate: Date): Result<Order, Error> {
  if (order.status.kind !== "paid") {
    return err(new Error(`Cannot ship order in ${order.status.kind} status`));
  }

  return ok({
    ...order,
    status: { kind: "shipped", shippedAt: shipmentDate },
  });
}

function cancelOrder(order: Order, reason: string): Result<Order, Error> {
  if (order.status.kind === "shipped") {
    return err(new Error("Cannot cancel shipped order"));
  }

  return ok({
    ...order,
    status: { kind: "cancelled", reason },
  });
}
```

### 7.3 ワークフロー実装

```typescript
import { err, ok, Result } from "neverthrow";

// コマンド（入力）
interface PlaceOrderCommand {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

// ステップ関数
function validateOrder(
  command: PlaceOrderCommand,
): Result<PlaceOrderCommand, Error> {
  if (!command.customerId) {
    return err(new Error("Customer ID is required"));
  }
  if (!command.items || command.items.length === 0) {
    return err(new Error("Order must have at least one item"));
  }
  return ok(command);
}

function getCustomer(customerRepository: CustomerRepository) {
  return (
    command: PlaceOrderCommand,
  ): Result<{ command: PlaceOrderCommand; customer: Customer }, Error> => {
    const customerIdResult = createCustomerId(command.customerId);
    if (customerIdResult.isErr()) {
      return err(customerIdResult.error);
    }

    const customerId = customerIdResult.value;
    const customerResult = customerRepository.findById(customerId);
    if (customerResult.isErr()) {
      return err(customerResult.error);
    }

    if (!customerResult.value) {
      return err(new Error("Customer not found"));
    }

    return ok({
      command,
      customer: customerResult.value,
    });
  };
}

function getProductDetails(productRepository: ProductRepository) {
  return (data: { command: PlaceOrderCommand; customer: Customer }): Result<{
    command: PlaceOrderCommand;
    customer: Customer;
    orderLines: OrderLine[];
  }, Error> => {
    // 商品情報の取得とOrderLine配列への変換
    const orderLinesResult = data.command.items.reduce(
      (acc: Result<OrderLine[], Error>, item) => {
        if (acc.isErr()) {
          return acc;
        }

        const productIdResult = createProductId(item.productId);
        if (productIdResult.isErr()) {
          return err(productIdResult.error);
        }

        const productResult = productRepository.findById(productIdResult.value);
        if (productResult.isErr()) {
          return err(productResult.error);
        }

        if (!productResult.value) {
          return err(new Error(`Product not found: ${item.productId}`));
        }

        const product = productResult.value;
        const moneyResult = createMoney(product.price);
        if (moneyResult.isErr()) {
          return err(moneyResult.error);
        }

        const orderLine: OrderLine = {
          productId: productIdResult.value,
          quantity: item.quantity,
          unitPrice: moneyResult.value,
        };

        return ok([...acc.value, orderLine]);
      },
      ok([] as OrderLine[]),
    );

    if (orderLinesResult.isErr()) {
      return err(orderLinesResult.error);
    }

    return ok({
      command: data.command,
      customer: data.customer,
      orderLines: orderLinesResult.value,
    });
  };
}

function calculateTotalAmount(data: {
  command: PlaceOrderCommand;
  customer: Customer;
  orderLines: OrderLine[];
}): Result<{
  command: PlaceOrderCommand;
  customer: Customer;
  orderLines: OrderLine[];
  totalAmount: Money;
}, Error> {
  const total = data.orderLines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );

  const totalAmountResult = createMoney(total);
  if (totalAmountResult.isErr()) {
    return err(totalAmountResult.error);
  }

  return ok({
    ...data,
    totalAmount: totalAmountResult.value,
  });
}

function createOrderEntity(data: {
  command: PlaceOrderCommand;
  customer: Customer;
  orderLines: OrderLine[];
  totalAmount: Money;
}): Result<Order, Error> {
  const orderIdResult = generateOrderId();
  if (orderIdResult.isErr()) {
    return err(orderIdResult.error);
  }

  const order: Order = {
    id: orderIdResult.value,
    customerId: data.customer.id,
    orderLines: data.orderLines,
    status: { kind: "pending" },
    totalAmount: data.totalAmount,
    createdAt: new Date(),
  };

  return ok(order);
}

// ワークフロー関数
function placeOrderWorkflow(
  customerRepository: CustomerRepository,
  productRepository: ProductRepository,
) {
  return (command: PlaceOrderCommand): Result<Order, Error> => {
    return validateOrder(command)
      .andThen(getCustomer(customerRepository))
      .andThen(getProductDetails(productRepository))
      .andThen(calculateTotalAmount)
      .andThen(createOrderEntity);
  };
}
```

### 7.4 アプリケーション層とインフラストラクチャ層の統合

```typescript
// アプリケーションサービス
class OrderApplicationService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly productRepository: ProductRepository,
    private readonly orderRepository: OrderRepository,
  ) {}

  async placeOrder(command: PlaceOrderCommand): Promise<Result<string, Error>> {
    // ワークフローの実行
    const workflowResult = placeOrderWorkflow(
      this.customerRepository,
      this.productRepository,
    )(command);

    if (workflowResult.isErr()) {
      return err(workflowResult.error);
    }

    // 注文の保存（副作用）
    const saveResult = await this.orderRepository.save(workflowResult.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(workflowResult.value.id.toString());
  }
}

// GraphQLリゾルバー（インフラストラクチャ層の例）
const orderResolvers = {
  Mutation: {
    placeOrder: async (
      _: any,
      { input }: { input: PlaceOrderInput },
      context: Context,
    ) => {
      const command: PlaceOrderCommand = {
        customerId: input.customerId,
        items: input.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const result = await context.orderService.placeOrder(command);

      if (result.isErr()) {
        throw new Error(result.error.message);
      }

      return {
        orderId: result.value,
      };
    },
  },
};
```

## 8. 参考リソース

1. **書籍**:
   - "Domain Modeling Made Functional" by Scott Wlaschin
   - "Functional and Reactive Domain Modeling" by Debasish Ghosh

2. **ライブラリ**:
   - [neverthrow](https://github.com/supermacro/neverthrow) -
     TypeScriptでのResult型の実装
   - [fp-ts](https://github.com/gcanti/fp-ts) -
     TypeScriptのための関数型プログラミングライブラリ
   - [Effect](https://effect.website/) -
     TypeScriptでの関数型プログラミングのためのライブラリ

3. **記事**:
   - [関数型DDD〜Domain Modeling Made Functional まとめ](https://qiita.com/yasuabe2613/items/5ab33e103e4105630e4c)
   - [ドメイン駆動+関数型プログラミング](https://qiita.com/pman-taichi/items/3b89c9e5e6057cdf3ab8)

4. **動画**:
   - [Domain Modeling Made Functional - Scott Wlaschin](https://www.youtube.com/watch?v=PLFl95c-IiU)
   - [Railway Oriented Programming](https://vimeo.com/113707214)
