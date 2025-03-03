/**
 * タスク管理アプリケーション
 */

import type {
  Priority,
  Task,
  TaskFilter,
  TaskId,
  TaskStatus,
  UserId,
} from "./domain/types.ts";
import {
  changeTaskDescription,
  changeTaskPriority,
  changeTaskStatus,
  changeTaskTitle,
  createTask,
  generateTaskId,
} from "./domain/task.ts";
import type { TaskRepository } from "./domain/taskRepository.ts";
import { err, ok, type Result } from "./core/result.ts";

/**
 * タスク管理アプリケーション
 */
export class TaskApp {
  constructor(private repository: TaskRepository) {}

  /**
   * 新しいタスクを作成する
   */
  async createNewTask(
    title: string,
    priority: Priority,
    userId: UserId,
    description?: string,
  ): Promise<Result<Task, Error>> {
    try {
      // タスクIDの生成
      const taskId = generateTaskId();

      // ドメインロジックでタスクを作成
      const taskResult = createTask(
        taskId,
        title,
        priority,
        userId,
        description,
      );
      if (!taskResult.ok) return taskResult;

      // リポジトリに保存
      const saveResult = await this.repository.save(taskResult.value);
      if (!saveResult.ok) return saveResult;

      return ok(taskResult.value);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスク作成エラー: ${message}`));
    }
  }

  /**
   * タスクのステータスを変更する
   */
  async updateTaskStatus(
    taskId: TaskId,
    newStatus: TaskStatus,
  ): Promise<Result<Task, Error>> {
    try {
      // タスクを取得
      const taskResult = await this.repository.findById(taskId);
      if (!taskResult.ok) return taskResult;

      const task = taskResult.value;
      if (!task) return err(new Error(`タスクが見つかりません: ${taskId}`));

      // ドメインロジックでステータスを変更
      const updatedTaskResult = changeTaskStatus(task, newStatus);
      if (!updatedTaskResult.ok) return updatedTaskResult;

      // 更新したタスクを保存
      const saveResult = await this.repository.save(updatedTaskResult.value);
      if (!saveResult.ok) return saveResult;

      return ok(updatedTaskResult.value);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスクステータス更新エラー: ${message}`));
    }
  }

  /**
   * タスクの優先度を変更する
   */
  async updateTaskPriority(
    taskId: TaskId,
    newPriority: Priority,
  ): Promise<Result<Task, Error>> {
    try {
      // タスクを取得
      const taskResult = await this.repository.findById(taskId);
      if (!taskResult.ok) return taskResult;

      const task = taskResult.value;
      if (!task) return err(new Error(`タスクが見つかりません: ${taskId}`));

      // ドメインロジックで優先度を変更
      const updatedTaskResult = changeTaskPriority(task, newPriority);
      if (!updatedTaskResult.ok) return updatedTaskResult;

      // 更新したタスクを保存
      const saveResult = await this.repository.save(updatedTaskResult.value);
      if (!saveResult.ok) return saveResult;

      return ok(updatedTaskResult.value);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスク優先度更新エラー: ${message}`));
    }
  }

  /**
   * タスクの内容を更新する
   */
  async updateTaskContent(
    taskId: TaskId,
    title?: string,
    description?: string,
  ): Promise<Result<Task, Error>> {
    try {
      // タスクを取得
      const taskResult = await this.repository.findById(taskId);
      if (!taskResult.ok) return taskResult;

      const task = taskResult.value;
      if (!task) return err(new Error(`タスクが見つかりません: ${taskId}`));

      // タイトルの更新（指定された場合）
      let updatedTask = task;
      if (title !== undefined) {
        const titleResult = changeTaskTitle(updatedTask, title);
        if (!titleResult.ok) return titleResult;
        updatedTask = titleResult.value;
      }

      // 説明の更新（指定された場合）
      if (description !== undefined) {
        const descResult = changeTaskDescription(updatedTask, description);
        if (!descResult.ok) return descResult;
        updatedTask = descResult.value;
      }

      // 変更がない場合は早期リターン
      if (updatedTask === task) {
        return ok(task);
      }

      // 更新したタスクを保存
      const saveResult = await this.repository.save(updatedTask);
      if (!saveResult.ok) return saveResult;

      return ok(updatedTask);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスク内容更新エラー: ${message}`));
    }
  }

  /**
   * タスクを削除する
   */
  async deleteTask(taskId: TaskId): Promise<Result<void, Error>> {
    try {
      return await this.repository.delete(taskId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスク削除エラー: ${message}`));
    }
  }

  /**
   * タスクを検索する
   */
  async findTasks(filter: TaskFilter): Promise<Result<Task[], Error>> {
    try {
      return await this.repository.findByFilter(filter);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスク検索エラー: ${message}`));
    }
  }

  /**
   * すべてのタスクを取得する
   */
  async getAllTasks(): Promise<Result<Task[], Error>> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスク全件取得エラー: ${message}`));
    }
  }

  /**
   * 指定IDのタスクを取得する
   */
  async getTaskById(taskId: TaskId): Promise<Result<Task | null, Error>> {
    try {
      return await this.repository.findById(taskId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`タスク取得エラー: ${message}`));
    }
  }
}
