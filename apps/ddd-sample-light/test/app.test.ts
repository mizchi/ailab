/**
 * アプリケーションのテスト
 */

import { expect } from "jsr:@std/expect";
import { test } from "jsr:@std/testing/bdd";
import { TaskApp } from "../src/app.ts";
import { InMemoryTaskRepository } from "../src/adapters/inMemoryTaskRepository.ts";
import type { TaskId, UserId } from "../src/domain/types.ts";
import type { generateTaskId } from "../src/domain/task.ts";

// テスト用のヘルパー関数
function createTestUserId(): UserId {
  return "test-user-id" as UserId;
}

// アプリケーションのテスト
test("TaskApp - タスクを作成できる", async () => {
  const repository = new InMemoryTaskRepository();
  const app = new TaskApp(repository);

  const result = await app.createNewTask(
    "テストタスク",
    "medium",
    createTestUserId(),
    "テスト用の説明",
  );

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.title).toBe("テストタスク");
    expect(result.value.description).toBe("テスト用の説明");
    expect(result.value.status).toBe("pending");
    expect(result.value.priority).toBe("medium");
  }
});

test("TaskApp - タスクステータスを更新できる", async () => {
  const repository = new InMemoryTaskRepository();
  const app = new TaskApp(repository);

  // タスク作成
  const createResult = await app.createNewTask(
    "テストタスク",
    "medium",
    createTestUserId(),
  );

  expect(createResult.ok).toBe(true);
  if (!createResult.ok) return;

  const taskId = createResult.value.id;

  // ステータス更新
  const updateResult = await app.updateTaskStatus(taskId, "in-progress");

  expect(updateResult.ok).toBe(true);
  if (updateResult.ok) {
    expect(updateResult.value.id).toBe(taskId);
    expect(updateResult.value.status).toBe("in-progress");
  }
});

test("TaskApp - タスク優先度を更新できる", async () => {
  const repository = new InMemoryTaskRepository();
  const app = new TaskApp(repository);

  // タスク作成
  const createResult = await app.createNewTask(
    "テストタスク",
    "low",
    createTestUserId(),
  );

  expect(createResult.ok).toBe(true);
  if (!createResult.ok) return;

  const taskId = createResult.value.id;

  // 優先度更新
  const updateResult = await app.updateTaskPriority(taskId, "high");

  expect(updateResult.ok).toBe(true);
  if (updateResult.ok) {
    expect(updateResult.value.id).toBe(taskId);
    expect(updateResult.value.priority).toBe("high");
  }
});

test("TaskApp - タスク内容を更新できる", async () => {
  const repository = new InMemoryTaskRepository();
  const app = new TaskApp(repository);

  // タスク作成
  const createResult = await app.createNewTask(
    "元のタイトル",
    "medium",
    createTestUserId(),
    "元の説明",
  );

  expect(createResult.ok).toBe(true);
  if (!createResult.ok) return;

  const taskId = createResult.value.id;

  // 内容更新
  const updateResult = await app.updateTaskContent(
    taskId,
    "新しいタイトル",
    "新しい説明",
  );

  expect(updateResult.ok).toBe(true);
  if (updateResult.ok) {
    expect(updateResult.value.id).toBe(taskId);
    expect(updateResult.value.title).toBe("新しいタイトル");
    expect(updateResult.value.description).toBe("新しい説明");
  }
});

test("TaskApp - タスク内容の部分更新ができる", async () => {
  const repository = new InMemoryTaskRepository();
  const app = new TaskApp(repository);

  // タスク作成
  const createResult = await app.createNewTask(
    "元のタイトル",
    "medium",
    createTestUserId(),
    "元の説明",
  );

  expect(createResult.ok).toBe(true);
  if (!createResult.ok) return;

  const taskId = createResult.value.id;

  // タイトルのみ更新
  const titleUpdateResult = await app.updateTaskContent(
    taskId,
    "新しいタイトル",
    undefined, // 説明は変更しない
  );

  expect(titleUpdateResult.ok).toBe(true);
  if (titleUpdateResult.ok) {
    expect(titleUpdateResult.value.title).toBe("新しいタイトル");
    expect(titleUpdateResult.value.description).toBe("元の説明");
  }

  // 説明のみ更新
  const descUpdateResult = await app.updateTaskContent(
    taskId,
    undefined, // タイトルは変更しない
    "新しい説明",
  );

  expect(descUpdateResult.ok).toBe(true);
  if (descUpdateResult.ok) {
    expect(descUpdateResult.value.title).toBe("新しいタイトル"); // 前の更新から
    expect(descUpdateResult.value.description).toBe("新しい説明");
  }
});

test("TaskApp - タスクを削除できる", async () => {
  const repository = new InMemoryTaskRepository();
  const app = new TaskApp(repository);

  // タスク作成
  const createResult = await app.createNewTask(
    "テストタスク",
    "medium",
    createTestUserId(),
  );

  expect(createResult.ok).toBe(true);
  if (!createResult.ok) return;

  const taskId = createResult.value.id;

  // 削除実行
  const deleteResult = await app.deleteTask(taskId);
  expect(deleteResult.ok).toBe(true);

  // 削除確認
  const getResult = await app.getTaskById(taskId);
  expect(getResult.ok).toBe(true);
  if (getResult.ok) {
    expect(getResult.value).toBeNull();
  }
});

test("TaskApp - タスクをフィルターで検索できる", async () => {
  const repository = new InMemoryTaskRepository();
  const app = new TaskApp(repository);
  const userId = createTestUserId();

  // 様々なタスクを作成
  await app.createNewTask("タスク1", "low", userId);
  await app.createNewTask("タスク2", "medium", userId);
  await app.createNewTask("タスク3", "high", userId);

  // 優先度でフィルタリング
  const highPriorityResult = await app.findTasks({ priority: "high" });
  expect(highPriorityResult.ok).toBe(true);
  if (highPriorityResult.ok) {
    expect(highPriorityResult.value.length).toBe(1);
    expect(highPriorityResult.value[0].priority).toBe("high");
  }

  // ユーザーIDでフィルタリング
  const userTasksResult = await app.findTasks({ createdBy: userId });
  expect(userTasksResult.ok).toBe(true);
  if (userTasksResult.ok) {
    expect(userTasksResult.value.length).toBe(3);
  }
});

test("TaskApp - 存在しないタスクIDでエラーを返す", async () => {
  const repository = new InMemoryTaskRepository();
  const app = new TaskApp(repository);

  // 存在しないタスクIDを作成
  const nonExistentId = "non-existent-id" as TaskId;

  // ステータス更新を試みる
  const result = await app.updateTaskStatus(nonExistentId, "in-progress");

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.message).toContain("見つかりません");
  }
});

test("TaskApp - タスクの状態変更ルールを守る", async () => {
  const repository = new InMemoryTaskRepository();
  const app = new TaskApp(repository);

  // タスク作成
  const createResult = await app.createNewTask(
    "テストタスク",
    "medium",
    createTestUserId(),
  );

  expect(createResult.ok).toBe(true);
  if (!createResult.ok) return;

  const taskId = createResult.value.id;

  // ステータスを完了に変更
  const completeResult = await app.updateTaskStatus(taskId, "completed");
  expect(completeResult.ok).toBe(true);

  // 完了→進行中は不可
  const invalidUpdateResult = await app.updateTaskStatus(taskId, "in-progress");
  expect(invalidUpdateResult.ok).toBe(false);

  // 完了→キャンセルは可能
  const cancelResult = await app.updateTaskStatus(taskId, "cancelled");
  expect(cancelResult.ok).toBe(true);
});

test("TaskApp - 一連のユースケースフロー", async () => {
  const repository = new InMemoryTaskRepository();
  const app = new TaskApp(repository);
  const userId = createTestUserId();

  // 1. タスク作成
  const createResult = await app.createNewTask(
    "買い物に行く",
    "medium",
    userId,
    "牛乳と卵を買う",
  );

  expect(createResult.ok).toBe(true);
  if (!createResult.ok) return;

  const taskId = createResult.value.id;

  // 2. タスクを進行中に変更
  const startResult = await app.updateTaskStatus(taskId, "in-progress");
  expect(startResult.ok).toBe(true);

  // 3. タスクの優先度を上げる
  const priorityResult = await app.updateTaskPriority(taskId, "high");
  expect(priorityResult.ok).toBe(true);

  // 4. タスクの説明を更新
  const updateResult = await app.updateTaskContent(
    taskId,
    undefined,
    "牛乳、卵、チーズを買う",
  );
  expect(updateResult.ok).toBe(true);

  // 5. タスクを完了
  const completeResult = await app.updateTaskStatus(taskId, "completed");
  expect(completeResult.ok).toBe(true);

  // 6. 状態確認
  const getResult = await app.getTaskById(taskId);
  expect(getResult.ok).toBe(true);
  if (getResult.ok && getResult.value) {
    expect(getResult.value.status).toBe("completed");
    expect(getResult.value.priority).toBe("high");
    expect(getResult.value.description).toBe("牛乳、卵、チーズを買う");
  }
});
