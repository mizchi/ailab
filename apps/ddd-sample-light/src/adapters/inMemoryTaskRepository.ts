/**
 * タスクリポジトリのインメモリ実装
 * テストや開発時に使用する簡易的な実装
 */

import type { Task, TaskFilter, TaskId } from "../domain/types.ts";
import type { TaskRepository } from "../domain/taskRepository.ts";
import { err, ok, type Result } from "../core/result.ts";
import { filterTasks } from "../domain/task.ts";

export class InMemoryTaskRepository implements TaskRepository {
  // インメモリストレージ
  private tasks: Map<string, Task> = new Map();

  // 指定IDのタスクを取得
  async findById(id: TaskId): Promise<Result<Task | null, Error>> {
    try {
      const task = this.tasks.get(String(id)) || null;
      return ok(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスク取得エラー: ${message}`));
    }
  }

  // 全タスクを取得
  async findAll(): Promise<Result<Task[], Error>> {
    try {
      return ok(Array.from(this.tasks.values()));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスク全件取得エラー: ${message}`));
    }
  }

  // フィルターに基づくタスク取得
  async findByFilter(filter: TaskFilter): Promise<Result<Task[], Error>> {
    try {
      const allTasks = Array.from(this.tasks.values());
      const filteredTasks = filterTasks(allTasks, filter);
      return ok(filteredTasks);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスク検索エラー: ${message}`));
    }
  }

  // タスク保存（新規/更新）
  async save(task: Task): Promise<Result<void, Error>> {
    try {
      this.tasks.set(String(task.id), task);
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスク保存エラー: ${message}`));
    }
  }

  // タスク削除
  async delete(id: TaskId): Promise<Result<void, Error>> {
    try {
      this.tasks.delete(String(id));
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスク削除エラー: ${message}`));
    }
  }

  // テスト用：リポジトリをクリア
  clear(): void {
    this.tasks.clear();
  }

  // テスト用：複数タスクを一括設定
  seedTasks(tasks: Task[]): void {
    for (const task of tasks) {
      this.tasks.set(String(task.id), task);
    }
  }
}
