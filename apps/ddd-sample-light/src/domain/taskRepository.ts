/**
 * タスクリポジトリのインターフェース
 */

import type { Task, TaskFilter, TaskId } from "./types.ts";
import type { Result, ValidationError } from "../core/result.ts";

// タスクリポジトリのインターフェース定義
export interface TaskRepository {
  // タスク取得メソッド
  findById(id: TaskId): Promise<Result<Task | null, Error>>;
  findAll(): Promise<Result<Task[], Error>>;
  findByFilter(filter: TaskFilter): Promise<Result<Task[], Error>>;

  // タスク操作メソッド
  save(task: Task): Promise<Result<void, Error>>;
  delete(id: TaskId): Promise<Result<void, Error>>;
}
