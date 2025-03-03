/**
 * ドメインモデルの基本型定義
 */

// ブランデッド型を作成するためのユーティリティ型
export type Branded<T, Brand> = T & { readonly _brand: Brand };

// ID型
export type TaskId = Branded<string, "TaskId">;
export type UserId = Branded<string, "UserId">;

// 値オブジェクト型
export type Priority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in-progress" | "completed" | "cancelled";

// タスクエンティティ
export interface Task {
  readonly id: TaskId;
  readonly title: string;
  readonly description?: string;
  readonly status: TaskStatus;
  readonly priority: Priority;
  readonly createdBy: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ユーザーエンティティ
export interface User {
  readonly id: UserId;
  readonly name: string;
  readonly email: string;
}

// タスク検索フィルター
export interface TaskFilter {
  readonly status?: TaskStatus;
  readonly priority?: Priority;
  readonly createdBy?: UserId;
}
