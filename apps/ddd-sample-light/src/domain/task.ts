/**
 * タスクのドメインロジック
 */

import type { Priority, Task, TaskId, TaskStatus, UserId } from "./types.ts";
import { err, ok, type Result, ValidationError } from "../core/result.ts";

/**
 * 新しいタスクを作成する
 */
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

/**
 * タスクのステータスを変更する
 */
export function changeTaskStatus(
  task: Task,
  newStatus: TaskStatus,
): Result<Task, ValidationError> {
  // 業務ルール: 完了したタスクはキャンセルできるが、それ以外に変更できない
  if (task.status === "completed" && newStatus !== "cancelled") {
    return err(new ValidationError("完了したタスクは再開できません"));
  }

  // 業務ルール: キャンセルされたタスクは変更できない
  if (task.status === "cancelled") {
    return err(new ValidationError("キャンセルされたタスクは変更できません"));
  }

  // 不変更新パターン: 新しいオブジェクトを返す
  return ok({
    ...task,
    status: newStatus,
    updatedAt: new Date(),
  });
}

/**
 * タスクの優先度を変更する
 */
export function changeTaskPriority(
  task: Task,
  newPriority: Priority,
): Result<Task, ValidationError> {
  // 業務ルール: 完了またはキャンセルされたタスクは変更できない
  if (task.status === "completed" || task.status === "cancelled") {
    return err(
      new ValidationError(`${task.status}状態のタスクは変更できません`),
    );
  }

  // 不変更新パターン
  return ok({
    ...task,
    priority: newPriority,
    updatedAt: new Date(),
  });
}

/**
 * タスクのタイトルを変更する
 */
export function changeTaskTitle(
  task: Task,
  newTitle: string,
): Result<Task, ValidationError> {
  // バリデーション
  if (!newTitle.trim()) {
    return err(new ValidationError("タイトルは必須です"));
  }

  // 業務ルール: 完了またはキャンセルされたタスクは変更できない
  if (task.status === "completed" || task.status === "cancelled") {
    return err(
      new ValidationError(`${task.status}状態のタスクは変更できません`),
    );
  }

  // 不変更新パターン
  return ok({
    ...task,
    title: newTitle,
    updatedAt: new Date(),
  });
}

/**
 * タスクの説明を変更する
 */
export function changeTaskDescription(
  task: Task,
  newDescription?: string,
): Result<Task, ValidationError> {
  // 業務ルール: 完了またはキャンセルされたタスクは変更できない
  if (task.status === "completed" || task.status === "cancelled") {
    return err(
      new ValidationError(`${task.status}状態のタスクは変更できません`),
    );
  }

  // 不変更新パターン
  return ok({
    ...task,
    description: newDescription,
    updatedAt: new Date(),
  });
}

/**
 * タスクのフィルタリング関数
 */
export function filterTasks(tasks: Task[], filter: Partial<Task>): Task[] {
  return tasks.filter((task) => {
    // 各フィルター条件をチェック
    if (filter.status && task.status !== filter.status) return false;
    if (filter.priority && task.priority !== filter.priority) return false;
    if (filter.createdBy && task.createdBy !== filter.createdBy) return false;
    return true;
  });
}

/**
 * IDを生成する
 */
export function generateTaskId(): TaskId {
  return crypto.randomUUID() as TaskId;
}

/**
 * タスクがアクティブかどうかを判定
 */
export function isTaskActive(task: Task): boolean {
  return task.status === "pending" || task.status === "in-progress";
}
