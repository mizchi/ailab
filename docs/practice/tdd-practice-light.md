# 軽量TDDと関数型アプローチの実践ガイド

このドキュメントでは、小〜中規模のプロジェクトやプロトタイピングに適した、軽量なテスト駆動開発と関数型アプローチの実践方法をまとめています。

## 基本理念

- **シンプルさ優先**: 余計な複雑さを避け、最小限の構造で実装
- **関数型アプローチ**: 純粋関数とデータ変換を中心に設計
- **実用的TDD**: 「Red-Green-Refactor」サイクルを柔軟に適用
- **Adapterパターン軽量版**: 外部依存を抽象化するが厳密な層分けはしない

## 軽量な実装構造

```
src/
├── core/                  # コアユーティリティ
│   └── result.ts          # Result型の実装
├── domain/                # ビジネスロジック
│   ├── types.ts           # 型定義
│   └── models.ts          # ドメインモデルと関数
├── adapters/              # 外部依存の抽象化
│   └── storage.ts         # ストレージアダプタなど
└── app.ts                 # アプリケーションのエントリーポイント
```

## 1. 軽量なResult型の使用

関数型プログラミングの基本として`Result`型を使用しますが、軽量化した実装を採用します。

```typescript
// core/result.ts
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// 汎用エラー型
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// 便利なヘルパー関数
export function combineResults<T>(results: Result<T, any>[]): Result<T[], any> {
  const values: T[] = [];

  for (const result of results) {
    if (!result.ok) return result as Result<never, any>;
    values.push(result.value);
  }

  return ok(values);
}
```

## 2. シンプルな型定義

ドメインモデルの型をシンプルに定義します。

```typescript
// domain/types.ts
export type UserId = string;
export type TaskId = string;
export type TaskStatus = "pending" | "in-progress" | "completed";

export interface Task {
  id: TaskId;
  title: string;
  description?: string;
  status: TaskStatus;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: UserId;
  name: string;
  email: string;
}
```

## 3. 関数ベースのドメインモデル

クラスではなく関数ベースでドメインモデルを実装します。

```typescript
// domain/models.ts
import { Task, TaskId, TaskStatus, UserId } from "./types.ts";
import { AppError, err, ok, Result } from "../core/result.ts";

// タスク作成
export function createTask(
  id: TaskId,
  title: string,
  createdBy: UserId,
): Result<Task, AppError> {
  if (!title.trim()) {
    return err(new AppError("タスクのタイトルは必須です"));
  }

  const now = new Date();

  return ok({
    id,
    title,
    status: "pending" as TaskStatus,
    createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

// タスクステータス更新
export function updateTaskStatus(
  task: Task,
  newStatus: TaskStatus,
): Result<Task, AppError> {
  if (task.status === "completed" && newStatus !== "completed") {
    return err(new AppError("完了したタスクは再開できません"));
  }

  return ok({
    ...task,
    status: newStatus,
    updatedAt: new Date(),
  });
}

// タスク完了チェック
export function isTaskCompleted(task: Task): boolean {
  return task.status === "completed";
}

// タスク検索条件
export type TaskFilter = {
  status?: TaskStatus;
  createdBy?: UserId;
};

// タスクフィルタリング
export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  return tasks.filter((task) => {
    if (filter.status && task.status !== filter.status) return false;
    if (filter.createdBy && task.createdBy !== filter.createdBy) return false;
    return true;
  });
}
```

## 4. 軽量なアダプターパターン

外部依存（ストレージなど）を抽象化するための軽量なアダプターを実装します。

```typescript
// adapters/storage.ts
import { Task, TaskId } from "../domain/types.ts";
import { AppError, err, ok, Result } from "../core/result.ts";

// ストレージアダプターのインターフェース
export interface TaskStorage {
  findById(id: TaskId): Promise<Result<Task | null, AppError>>;
  findAll(): Promise<Result<Task[], AppError>>;
  save(task: Task): Promise<Result<void, AppError>>;
  delete(id: TaskId): Promise<Result<void, AppError>>;
}

// インメモリ実装
export class InMemoryTaskStorage implements TaskStorage {
  private tasks: Map<TaskId, Task> = new Map();

  async findById(id: TaskId): Promise<Result<Task | null, AppError>> {
    const task = this.tasks.get(id) || null;
    return ok(task);
  }

  async findAll(): Promise<Result<Task[], AppError>> {
    return ok(Array.from(this.tasks.values()));
  }

  async save(task: Task): Promise<Result<void, AppError>> {
    this.tasks.set(task.id, task);
    return ok(undefined);
  }

  async delete(id: TaskId): Promise<Result<void, AppError>> {
    this.tasks.delete(id);
    return ok(undefined);
  }
}

// ローカルストレージ実装
export class LocalStorageTaskStorage implements TaskStorage {
  private readonly storageKey = "tasks";

  async findById(id: TaskId): Promise<Result<Task | null, AppError>> {
    try {
      const tasksJson = localStorage.getItem(this.storageKey) || "[]";
      const tasks = JSON.parse(tasksJson) as Task[];
      return ok(tasks.find((task) => task.id === id) || null);
    } catch (error) {
      return err(new AppError(`タスク検索エラー: ${error.message}`));
    }
  }

  async findAll(): Promise<Result<Task[], AppError>> {
    try {
      const tasksJson = localStorage.getItem(this.storageKey) || "[]";
      return ok(JSON.parse(tasksJson) as Task[]);
    } catch (error) {
      return err(new AppError(`タスク一覧取得エラー: ${error.message}`));
    }
  }

  async save(task: Task): Promise<Result<void, AppError>> {
    try {
      const tasksJson = localStorage.getItem(this.storageKey) || "[]";
      const tasks = JSON.parse(tasksJson) as Task[];

      const index = tasks.findIndex((t) => t.id === task.id);
      if (index >= 0) {
        tasks[index] = task;
      } else {
        tasks.push(task);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(tasks));
      return ok(undefined);
    } catch (error) {
      return err(new AppError(`タスク保存エラー: ${error.message}`));
    }
  }

  async delete(id: TaskId): Promise<Result<void, AppError>> {
    try {
      const tasksJson = localStorage.getItem(this.storageKey) || "[]";
      const tasks = JSON.parse(tasksJson) as Task[];

      const filteredTasks = tasks.filter((task) => task.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredTasks));

      return ok(undefined);
    } catch (error) {
      return err(new AppError(`タスク削除エラー: ${error.message}`));
    }
  }
}
```

## 5. アプリケーションロジック

ドメインモデルとアダプターを組み合わせて簡潔なアプリケーションロジックを実装します。

```typescript
// app.ts
import { generateId } from "./core/utils.ts";
import { createTask, filterTasks, updateTaskStatus } from "./domain/models.ts";
import {
  Task,
  TaskFilter,
  TaskId,
  TaskStatus,
  UserId,
} from "./domain/types.ts";
import { TaskStorage } from "./adapters/storage.ts";
import { AppError, err, ok, Result } from "./core/result.ts";

export class TaskApp {
  constructor(private storage: TaskStorage) {}

  async addTask(
    title: string,
    description: string | undefined,
    userId: UserId,
  ): Promise<Result<Task, AppError>> {
    // IDの生成
    const id = generateId();

    // タスクの作成
    const taskResult = createTask(id, title, userId);
    if (!taskResult.ok) return taskResult;

    // 説明の追加
    const task: Task = {
      ...taskResult.value,
      description,
    };

    // 保存
    const saveResult = await this.storage.save(task);
    if (!saveResult.ok) return saveResult;

    return ok(task);
  }

  async changeTaskStatus(
    id: TaskId,
    newStatus: TaskStatus,
  ): Promise<Result<Task, AppError>> {
    // タスクの取得
    const taskResult = await this.storage.findById(id);
    if (!taskResult.ok) return taskResult;

    const task = taskResult.value;
    if (!task) return err(new AppError(`タスクが見つかりません: ${id}`));

    // ステータスの更新
    const updatedTaskResult = updateTaskStatus(task, newStatus);
    if (!updatedTaskResult.ok) return updatedTaskResult;

    // 保存
    const saveResult = await this.storage.save(updatedTaskResult.value);
    if (!saveResult.ok) return saveResult;

    return ok(updatedTaskResult.value);
  }

  async searchTasks(filter: TaskFilter): Promise<Result<Task[], AppError>> {
    // 全タスクの取得
    const tasksResult = await this.storage.findAll();
    if (!tasksResult.ok) return tasksResult;

    // フィルタリング
    const filteredTasks = filterTasks(tasksResult.value, filter);
    return ok(filteredTasks);
  }
}
```

## 6. 実用的なTDD

軽量TDDでは、厳密なルールよりも実用性を重視します。

### テストの書き方

```typescript
// models.test.ts
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { createTask, updateTaskStatus } from "../domain/models.ts";
import { AppError } from "../core/result.ts";

test("createTask - 有効なパラメータでタスクを作成できる", () => {
  const taskResult = createTask("task-1", "買い物をする", "user-1");

  expect(taskResult.ok).toBe(true);
  if (taskResult.ok) {
    expect(taskResult.value.id).toBe("task-1");
    expect(taskResult.value.title).toBe("買い物をする");
    expect(taskResult.value.status).toBe("pending");
    expect(taskResult.value.createdBy).toBe("user-1");
    expect(taskResult.value.createdAt).toBeInstanceOf(Date);
  }
});

test("createTask - 空のタイトルでエラーを返す", () => {
  const taskResult = createTask("task-1", "", "user-1");

  expect(taskResult.ok).toBe(false);
  if (!taskResult.ok) {
    expect(taskResult.error).toBeInstanceOf(AppError);
    expect(taskResult.error.message).toContain("タイトルは必須");
  }
});

test("updateTaskStatus - タスクのステータスを更新できる", () => {
  // 準備: タスクを作成
  const createResult = createTask("task-1", "買い物をする", "user-1");
  expect(createResult.ok).toBe(true);
  if (!createResult.ok) return;

  const task = createResult.value;

  // 実行: ステータスを更新
  const updateResult = updateTaskStatus(task, "in-progress");

  // 検証: 更新されたタスク
  expect(updateResult.ok).toBe(true);
  if (updateResult.ok) {
    expect(updateResult.value.id).toBe(task.id);
    expect(updateResult.value.status).toBe("in-progress");
    expect(updateResult.value.updatedAt.getTime()).toBeGreaterThan(
      task.updatedAt.getTime(),
    );
  }
});
```

### インテグレーションテスト

```typescript
// app.test.ts
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { TaskApp } from "../app.ts";
import { InMemoryTaskStorage } from "../adapters/storage.ts";

test("TaskApp - タスクの追加と検索の一連の流れ", async () => {
  // 準備: アプリとストレージの初期化
  const storage = new InMemoryTaskStorage();
  const app = new TaskApp(storage);

  // 実行: タスクを追加
  const addResult = await app.addTask(
    "テスト駆動開発の学習",
    "TDDの基本を学ぶ",
    "user-123",
  );

  // 検証: タスクが正しく追加されたか
  expect(addResult.ok).toBe(true);

  // 実行: タスクを検索
  const searchResult = await app.searchTasks({ status: "pending" });

  // 検証: 検索結果
  expect(searchResult.ok).toBe(true);
  if (searchResult.ok) {
    expect(searchResult.value.length).toBe(1);
    expect(searchResult.value[0].title).toBe("テスト駆動開発の学習");
  }

  // 実行: タスクのステータスを変更
  if (addResult.ok) {
    const changeResult = await app.changeTaskStatus(
      addResult.value.id,
      "completed",
    );

    // 検証: ステータスが変更されたか
    expect(changeResult.ok).toBe(true);
    if (changeResult.ok) {
      expect(changeResult.value.status).toBe("completed");
    }
  }
});
```

## 7. プラグマティックなモック

テストで外部依存をモックする簡易的なアプローチ：

```typescript
// 簡易的なモッキング関数
function createMockStorage(): TaskStorage {
  const tasks = new Map<TaskId, Task>();

  return {
    async findById(id: TaskId) {
      return ok(tasks.get(id) || null);
    },
    async findAll() {
      return ok(Array.from(tasks.values()));
    },
    async save(task: Task) {
      tasks.set(task.id, task);
      return ok(undefined);
    },
    async delete(id: TaskId) {
      tasks.delete(id);
      return ok(undefined);
    },
  };
}

test("モックを使用したテスト", async () => {
  const mockStorage = createMockStorage();
  const app = new TaskApp(mockStorage);

  // テストコード...
});
```

## 8. 実装のステップとフロー

軽量アプローチでの実装ステップ：

1. **ドメインモデルの型定義**: まず型を定義
2. **純粋関数の実装**: 外部依存のない関数を先に実装
3. **アダプタの実装**: 外部依存を抽象化
4. **アプリケーションロジックの実装**: 上記を組み合わせる
5. **テストと改善**: 継続的にテストと改善

### 実装フロー図

```
[ドメイン型定義] → [純粋関数実装] → [テスト] → [リファクタリング]
                                     ↑         ↓
[実装完了] ← [アプリケーションロジック] ← [アダプタ実装]
```

## 9. 軽量アプローチのベストプラクティス

- **型優先**: 先に型を定義して設計を明確にする
- **純粋関数優先**: 副作用のない関数を優先的に実装
- **最小限のモック**: テストで使うモックは必要最小限に
- **段階的な複雑さ**: シンプルから始めて必要に応じて複雑化
- **リファクタリングの基準**: コードの重複と責任の混在に注目

## まとめ

軽量TDDと関数型アプローチは、厳密なDDDの構造やルールを簡略化することで、小〜中規模のプロジェクトやプロトタイピングに適した方法論です。不変性と型安全性の利点を保ちながら、より迅速な開発を可能にします。

このアプローチの主な利点：

1. **開発スピード**: 軽量な構造で迅速な開発
2. **低いオーバーヘッド**: 過剰な抽象化を避ける
3. **柔軟性**: プロジェクト要件に合わせて調整可能
4. **理解しやすさ**: 複雑な構造が少なく学習コストが低い
5. **アジャイル適合性**: 要件変更に素早く対応できる

軽量アプローチは、高い品質基準を維持しながらも、実用性とスピードを重視したい場合に適しています。
