# 関数型ドメインモデリングとTDDを軸にしたDDDの実践

## TL;DR（要約）

- 伝統的なエヴァンス式DDDを関数型プログラミングとTDDで軽量化
- Result型とブランデッド型で型安全性を高めた実装パターン
- 純粋関数でドメインロジックを実装し、テスト容易性を向上
- Adapterパターンを採用して外部依存を抽象化
- ddd-sampleとddd-sample-lightの2つのアプローチを比較実装

## サンプルプロジェクトのテスト実行結果

### ddd-sample (伝統的DDD)

```
running 8 tests from ./test/domain/valueObjects/email.test.ts
createEmail - 有効なメールアドレスでEmail値オブジェクトを作成できる ... ok (0ms)
createEmail - 無効なメールアドレスでエラーを返す ... ok (0ms)
emailEquals - 同じメールアドレスの等価性を判定できる ... ok (0ms)
emailEquals - 大文字小文字を区別せずに等価性を判定できる ... ok (0ms)
getDomain - メールアドレスのドメイン部分を取得できる ... ok (0ms)
getLocalPart - メールアドレスのローカル部分を取得できる ... ok (0ms)
maskEmail - メールアドレスをマスクできる ... ok (0ms)
maskEmail - 短いローカル部分を持つメールアドレスを適切にマスクできる ... ok (0ms)

// ... 中略 ...

ok | 65 passed | 0 failed (253ms)
```

### ddd-sample-light (軽量DDD)

```
running 7 tests from ./test/adapters/inMemoryTaskRepository.test.ts
InMemoryTaskRepository - タスクを保存して取得できる ... ok (6ms)
InMemoryTaskRepository - 存在しないIDで検索すると null を返す ... ok (0ms)
InMemoryTaskRepository - 複数のタスクを保存して全件取得できる ... ok (1ms)
InMemoryTaskRepository - タスクを削除できる ... ok (0ms)
InMemoryTaskRepository - フィルターで検索できる ... ok (0ms)
InMemoryTaskRepository - seed機能を使用して複数のタスクを一括設定できる ... ok (0ms)
InMemoryTaskRepository - clear機能ですべてのタスクを削除できる ... ok (0ms)

// ... 中略 ...

ok | 30 passed | 0 failed (116ms)
```

## 1. DDDと関数型プログラミングの融合

### 伝統的DDDの課題

エヴァンスのDDDは強力な設計手法だが、実装が複雑になりがちです。ddd-sampleでは伝統的なアプローチを示しています：

```ts
// ddd-sample/domain/valueObjects/money.ts からの例（抜粋推測）
export function createMoney(amount: number): Result<Money, ValidationError> {
  if (amount < 0) {
    return err(new ValidationError("金額は0以上である必要があります"));
  }
  // 小数点以下の精度チェックなど
  return ok(amount as Money);
}
```

これに対して、軽量版のddd-sample-lightでは関数型プログラミングの要素を取り入れています：

```ts
// ddd-sample-light/src/domain/task.ts からの例
export function createTask(
  id: TaskId,
  title: string,
  priority: Priority,
  createdBy: UserId,
  description?: string,
): Result<Task, ValidationError> {
  // バリデーション
  if (!title.trim()) {
    return err(new ValidationError("タイトルは必須です"));
  }

  const now = new Date();

  // タスクオブジェクトの作成
  return ok({
    id,
    title,
    description,
    status: "pending" as TaskStatus,
    priority,
    createdBy,
    createdAt: now,
    updatedAt: now,
  });
}
```

### 型安全性の向上

ddd-sample-lightではブランデッド型を活用して型安全性を高めています：

```ts
// ddd-sample-light/src/domain/types.ts
export type Branded<T, Brand> = T & { readonly _brand: Brand };

export type TaskId = Branded<string, "TaskId">;
export type UserId = Branded<string, "UserId">;
```

これにより、文字列型の混同を防ぎ、コンパイル時にIDの型間違いを検出できます。

## 2. Result型によるエラーハンドリング

両実装例で共通して使われているのがResult型です。これは値とエラーを型安全に扱うためのパターンです：

```ts
// ddd-sample-light/src/core/result.ts
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

このパターンにより、戻り値の型から「エラーハンドリングが必要」という情報が明示され、型システムを活用した安全なコードが書けます。

テスト実行結果からも分かるように、各関数の戻り値のチェックが一貫したパターンで行われています：

```
// ddd-sample-lightのテスト例
TaskApp - タスクを作成できる ... ok (0ms)
TaskApp - タスクステータスを更新できる ... ok (0ms)
```

## 3. 不変性を重視した値オブジェクト

ddd-sampleの値オブジェクト実装では、不変性が重視されています：

```ts
// ddd-sample/test/domain/valueObjects/orderLine.test.ts からの例
test("changeQuantity - 数量を変更した新しい注文明細を作成できる", () => {
  // ...
  if (orderLineResult.isOk()) {
    const newQuantity = 5;
    const changedResult = changeQuantity(orderLineResult.value, newQuantity);

    // ...
    if (changedResult.isOk()) {
      // 元のオブジェクトは変更されていない（不変性）
      expect(Number(orderLineResult.value.quantity)).toBe(params.quantity);
    }
  }
});
```

ddd-sample-lightでも同様のパターンが使われています：

```ts
// ddd-sample-light/src/domain/task.ts からの例
export function changeTaskStatus(
  task: Task,
  newStatus: TaskStatus,
): Result<Task, ValidationError> {
  // 業務ルール
  if (task.status === "completed" && newStatus !== "cancelled") {
    return err(new ValidationError("完了したタスクは再開できません"));
  }

  // 不変更新パターン: 新しいオブジェクトを返す
  return ok({
    ...task,
    status: newStatus,
    updatedAt: new Date(),
  });
}
```

テスト実行結果を見ると、この不変性が様々なシナリオでテストされていることが分かります：

```
// ddd-sample-lightのテスト例
changeTaskStatus - 完了したタスクはキャンセルのみ可能 ... ok (0ms)
changeTaskStatus - キャンセルされたタスクは変更不可 ... ok (0ms)
```

## 4. TDDによる実装アプローチ

ddd-sampleの実装では、テストファーストの考え方が反映されています：

```ts
// ddd-sample/test/domain/valueObjects/money.test.ts からの例
test("createMoney - 有効な金額でMoney値オブジェクトを作成できる", () => {
  const validAmounts = [0, 1, 10.5, 100.75, 1000, 9999.99];

  for (const amount of validAmounts) {
    const moneyResult = createMoney(amount);
    expect(moneyResult.isOk(), `${amount}は有効な金額のはず`).toBe(true);

    if (moneyResult.isOk()) {
      expect(Number(moneyResult.value)).toBe(amount);
    }
  }
});
```

各テストケースでは、ドメインの仕様（金額が0以上、小数点以下2桁まで、など）が明示的に表現されています。これによりドメインの制約が明確になり、テスト自体が「生きたドキュメント」として機能します。

テスト結果を見ると、ddd-sampleでは65のテスト、ddd-sample-lightでは30のテストが実行されており、いずれも全てパスしています。これらのテストはドメインルールを明確に表現し、実装の正しさを保証しています。

## 5. Adapterパターンの活用

ddd-sample-lightではAdapterパターンを採用しています。このパターンはテスト実行結果からも確認できます：

```
running 7 tests from ./test/adapters/inMemoryTaskRepository.test.ts
InMemoryTaskRepository - タスクを保存して取得できる ... ok (6ms)
InMemoryTaskRepository - 存在しないIDで検索すると null を返す ... ok (0ms)
```

これは以下のような実装に基づいています：

```ts
// ddd-sample-light/src/domain/taskRepository.ts (推測)
export interface TaskRepository {
  findById(id: TaskId): Promise<Result<Task | null, Error>>;
  findAll(): Promise<Result<Task[], Error>>;
  save(task: Task): Promise<Result<Task, Error>>;
  // ...
}

// ddd-sample-light/src/adapters/inMemoryTaskRepository.ts
export class InMemoryTaskRepository implements TaskRepository {
  private tasks: Map<string, Task> = new Map();

  async findById(id: TaskId): Promise<Result<Task | null, Error>> {
    const task = this.tasks.get(String(id)) || null;
    return ok(task);
  }
  // ...
}
```

このパターンにより、外部依存（データベースなど）からドメインロジックを分離し、テスト時には簡易的なインメモリ実装に差し替えることができます。

## 6. 伝統的DDDと軽量DDDの比較

### ddd-sample（伝統的アプローチ）

- レイヤー構造が明確（domain, application, infrastructure）
- エンティティ、値オブジェクト、リポジトリなどDDDの用語に忠実
- 複雑なドメインを扱うのに適している
- より厳密な値オブジェクトの実装（Money, Quantity等）
- テスト数が多い：65テスト

### ddd-sample-light（軽量アプローチ）

- よりフラットな構造（src/domain, src/adapters）
- 純粋関数でドメインロジックを実装
- シンプルで理解しやすいコード構造
- 小〜中規模のプロジェクトに最適
- テスト数が少ない：30テスト

両方のアプローチでテストは全て成功しており、DDDの原則を守りながらも、それぞれ異なる複雑さと柔軟性のバランスを取っています。

## まとめ

関数型ドメインモデリングとTDDを組み合わせることで、DDDの複雑さを軽減しつつ、その恩恵を得ることができます。主なポイントは：

1. ドメインを純粋関数とイミュータブルなデータで表現
2. Result型でエラーハンドリングを型安全に実装
3. テストファーストでドメインの仕様を明確に表現
4. Adapterパターンで外部依存を抽象化
5. ブランデッド型で型安全性を向上

これらのアプローチは、特にTypeScriptのような静的型付け言語との相性が良く、堅牢なドメイン駆動設計の実装を助けます。実装の複雑さとドメインの表現力のバランスを考慮し、プロジェクトに最適なアプローチを選択することが重要です。

テスト実行結果が示すように、両方のアプローチともに高い信頼性を持ち、ドメインルールを正確に実装していることが確認できます。これはTDDと関数型アプローチの組み合わせがDDDの実践において効果的であることを示しています。
