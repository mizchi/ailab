# プログラミング実践ガイド: DDD + TDD + FP

## 基本原則

### 関数型プログラミング (FP)

- 純粋関数を優先
- 不変データ構造の使用
- 副作用の分離
- 型安全性の重視

### ドメイン駆動設計 (DDD)

- ユビキタス言語の採用
- 境界づけられたコンテキスト
- 値オブジェクトとエンティティの区別
- リポジトリによるデータアクセス抽象化

### テスト駆動開発 (TDD)

- Red-Green-Refactorサイクル
- 小さな単位でのインクリメンタルな開発
- テストをドキュメントとして活用
- 継続的なリファクタリング

## 実装パターン

### 軽量実装構造

```
src/
├── core/            # 基本ユーティリティ
├── domain/          # ドメインモデル
├── adapters/        # 外部依存抽象化
└── app.ts           # エントリーポイント
```

### Result型の活用

```typescript
// 成功と失敗を表現する型
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// ヘルパー関数
function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

### ブランド付き型

```typescript
// 型安全性を高めるブランド付き型
type Branded<T, Brand> = T & { readonly _brand: Brand };
type Money = Branded<number, "Money">;
type Email = Branded<string, "Email">;

// 作成関数
function createMoney(amount: number): Result<Money, Error> {
  if (amount < 0) return err(new Error("金額は0以上必須"));
  return ok(amount as Money);
}
```

### 値オブジェクト実装

```typescript
// 値オブジェクトとその操作関数
function addMoney(a: Money, b: Money): Money {
  return (a + b) as Money;
}

function moneyEquals(a: Money, b: Money): boolean {
  return a === b;
}

// 値オブジェクトの不変更新
function changePrice(product: Product, newPrice: Money): Product {
  return { ...product, price: newPrice };
}
```

### Adapterパターン

```typescript
// リポジトリインターフェース
interface Repository<T, ID> {
  findById(id: ID): Promise<Result<T | null, Error>>;
  save(entity: T): Promise<Result<void, Error>>;
}

// インメモリ実装（テスト用）
class InMemoryRepository<T, ID> implements Repository<T, ID> {
  private items = new Map<ID, T>();

  async findById(id: ID): Promise<Result<T | null, Error>> {
    return ok(this.items.get(id) || null);
  }

  async save(entity: T): Promise<Result<void, Error>> {
    this.items.set((entity as any).id, entity);
    return ok(undefined);
  }
}
```

### TDDの実践

```typescript
// 先にテストを書く
test("createMoney - 正の金額で作成できる", () => {
  const result = createMoney(100);
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value).toBe(100);
});

test("createMoney - 負の金額でエラーを返す", () => {
  const result = createMoney(-100);
  expect(result.ok).toBe(false);
});
```

## 実装戦略

### 関数型アプローチ

1. **型優先設計**
   - まず型を定義してから実装に進む
   - 複雑な型は小さな型の組み合わせで構築

2. **純粋関数設計**
   ```typescript
   // 純粋関数の例
   function calculateTax(amount: Money): Money {
     return ((amount * 1.1) as Money);
   }

   // 副作用を含む関数はPromiseを返す
   async function saveOrder(order: Order): Promise<Result<void, Error>> {
     // 外部との通信など
   }
   ```

3. **不変更新パターン**
   ```typescript
   // 状態変更ではなく新しいオブジェクトを返す
   function updateStatus(task: Task, newStatus: Status): Task {
     return { ...task, status: newStatus };
   }
   ```

### テスト戦略

1. **単体テスト優先**
   - ドメイン層の純粋関数を先にテスト
   - モックは最小限に使用

2. **テストファーストの実践**
   ```
   1. 失敗するテストを書く
   2. 最小限の実装でテストを通す
   3. リファクタリングする
   4. 次の機能に進む
   ```

3. **リファクタリング指針**
   - 重複の除去
   - 関心事の分離
   - 変更理由の単一化

### ドメインモデリング

1. **値オブジェクトの識別**
   - 同一性が値に基づく（等価比較）
   - 不変性を持つ
   - 自己検証能力を持つ

2. **エンティティの識別**
   - 同一性がIDに基づく（ID比較）
   - 可変だが制御された変更
   - ライフサイクルを持つ

3. **集約の設計**
   - 関連するエンティティのグループ
   - トランザクション境界を形成
   - ルートエンティティを通じてのみアクセス

## 実装例: タスク管理

### 型定義

```typescript
type TaskId = Branded<string, "TaskId">;
type Status = "pending" | "in-progress" | "completed";

interface Task {
  readonly id: TaskId;
  readonly title: string;
  readonly status: Status;
}
```

### ドメイン関数

```typescript
function createTask(id: TaskId, title: string): Result<Task, Error> {
  if (!title.trim()) return err(new Error("タイトル必須"));

  return ok({
    id,
    title,
    status: "pending",
  });
}

function changeStatus(task: Task, status: Status): Result<Task, Error> {
  if (task.status === "completed" && status !== "completed") {
    return err(new Error("完了タスクは再開不可"));
  }

  return ok({ ...task, status });
}
```

### リポジトリ

```typescript
interface TaskRepository {
  findById(id: TaskId): Promise<Result<Task | null, Error>>;
  save(task: Task): Promise<Result<void, Error>>;
}
```

### テスト

```typescript
test("changeStatus - 進行中に変更できる", () => {
  // 準備
  const task = {
    id: "1" as TaskId,
    title: "テスト",
    status: "pending" as Status,
  };

  // 実行
  const result = changeStatus(task, "in-progress");

  // 検証
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value.status).toBe("in-progress");
});
```

## 実践のポイント

1. **小さく始める**
   - 複雑なドメインモデルから始めない
   - 基本的な値オブジェクトから実装

2. **段階的に発展させる**
   - 必要に応じて複雑さを追加
   - 過剰な抽象化を避ける

3. **フィードバックを得る**
   - 頻繁にテストを実行
   - コード品質を継続的に評価

4. **リファクタリングを恐れない**
   - テストの保護下で安全に改善
   - 徐々により良いモデルへ進化させる

## 注意点

- 過度に複雑なモデリングは避ける
- プロジェクト規模に合わせたアプローチを選択
- 型システムの限界を理解する
- テストのメンテナンスコストを考慮する

## まとめ

DDD、TDD、FPを組み合わせることで、型安全で保守性の高いコードを段階的に開発できます。プロジェクトの規模や要件に応じて、完全なDDDアプローチと軽量アプローチを使い分けることで、効率的な開発が可能になります。
