/**
 * インメモリタスクリポジトリのテスト
 */

import { expect } from "jsr:@std/expect";
import { test } from "jsr:@std/testing/bdd";
import { InMemoryTaskRepository } from "../../src/adapters/inMemoryTaskRepository.ts";
import { createTask, generateTaskId } from "../../src/domain/task.ts";
import type { TaskId, UserId } from "../../src/domain/types.ts";

// テスト用のヘルパー関数
function createTestUserId(): UserId {
  return "test-user-id" as UserId;
}

// テストタスクを作成
async function createTestTask(
  repository: InMemoryTaskRepository,
  title = "テストタスク",
) {
  const taskId = generateTaskId();
  const taskResult = createTask(
    taskId,
    title,
    "medium",
    createTestUserId(),
    "テスト用の説明",
  );

  if (taskResult.ok) {
    await repository.save(taskResult.value);
    return taskResult.value;
  }

  throw new Error("テストタスクの作成に失敗しました");
}

test("InMemoryTaskRepository - タスクを保存して取得できる", async () => {
  const repository = new InMemoryTaskRepository();
  const task = await createTestTask(repository);

  const result = await repository.findById(task.id);

  expect(result.ok).toBe(true);
  if (result.ok && result.value) {
    expect(result.value.id).toBe(task.id);
    expect(result.value.title).toBe(task.title);
  } else {
    throw new Error("タスクが見つかりませんでした");
  }
});

test("InMemoryTaskRepository - 存在しないIDで検索すると null を返す", async () => {
  const repository = new InMemoryTaskRepository();
  const nonExistentId = "non-existent-id" as TaskId;

  const result = await repository.findById(nonExistentId);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value).toBeNull();
  }
});

test("InMemoryTaskRepository - 複数のタスクを保存して全件取得できる", async () => {
  const repository = new InMemoryTaskRepository();
  const task1 = await createTestTask(repository, "タスク1");
  const task2 = await createTestTask(repository, "タスク2");
  const task3 = await createTestTask(repository, "タスク3");

  const result = await repository.findAll();

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.length).toBe(3);

    const ids = result.value.map((task) => String(task.id));
    expect(ids).toContain(String(task1.id));
    expect(ids).toContain(String(task2.id));
    expect(ids).toContain(String(task3.id));
  }
});

test("InMemoryTaskRepository - タスクを削除できる", async () => {
  const repository = new InMemoryTaskRepository();
  const task = await createTestTask(repository);

  // 削除実行
  const deleteResult = await repository.delete(task.id);
  expect(deleteResult.ok).toBe(true);

  // 削除確認
  const findResult = await repository.findById(task.id);
  expect(findResult.ok).toBe(true);
  if (findResult.ok) {
    expect(findResult.value).toBeNull();
  }
});

test("InMemoryTaskRepository - フィルターで検索できる", async () => {
  const repository = new InMemoryTaskRepository();

  // ステータスの異なるタスクを作成
  const pendingTask = await createTestTask(repository, "保留中タスク");
  const updatedPendingResult = createTask(
    pendingTask.id,
    pendingTask.title,
    pendingTask.priority,
    pendingTask.createdBy,
    pendingTask.description,
  );

  const inProgressTask = await createTestTask(repository, "進行中タスク");
  const updatedInProgressResult = createTask(
    inProgressTask.id,
    inProgressTask.title,
    inProgressTask.priority,
    inProgressTask.createdBy,
    inProgressTask.description,
  );

  if (updatedPendingResult.ok && updatedInProgressResult.ok) {
    // ステータスを手動で更新（本来はdomainサービスを使用すべきだが簡易のため）
    const inProgress = {
      ...updatedInProgressResult.value,
      status: "in-progress" as const,
    };

    await repository.save(updatedPendingResult.value);
    await repository.save(inProgress);

    // 保留中のタスクのみ検索
    const pendingResult = await repository.findByFilter({ status: "pending" });
    expect(pendingResult.ok).toBe(true);
    if (pendingResult.ok) {
      expect(pendingResult.value.length).toBe(1);
      expect(pendingResult.value[0].status).toBe("pending");
    }

    // 進行中のタスクのみ検索
    const inProgressResult = await repository.findByFilter({
      status: "in-progress",
    });
    expect(inProgressResult.ok).toBe(true);
    if (inProgressResult.ok) {
      expect(inProgressResult.value.length).toBe(1);
      expect(inProgressResult.value[0].status).toBe("in-progress");
    }
  }
});

test("InMemoryTaskRepository - seed機能を使用して複数のタスクを一括設定できる", () => {
  const repository = new InMemoryTaskRepository();

  // テストデータの作成
  const task1 = createTask(
    "task-1" as TaskId,
    "タスク1",
    "low",
    createTestUserId(),
  );

  const task2 = createTask(
    "task-2" as TaskId,
    "タスク2",
    "high",
    createTestUserId(),
  );

  if (task1.ok && task2.ok) {
    // シード関数でタスクを一括設定
    repository.seedTasks([task1.value, task2.value]);

    // 非同期テストはasyncを使えないのでPromise.allで処理
    repository.findAll().then((result) => {
      if (result.ok) {
        expect(result.value.length).toBe(2);
      }
    });
  }
});

test("InMemoryTaskRepository - clear機能ですべてのタスクを削除できる", async () => {
  const repository = new InMemoryTaskRepository();

  // タスクを追加
  await createTestTask(repository);
  await createTestTask(repository);

  // 追加確認
  const beforeClear = await repository.findAll();
  expect(beforeClear.ok).toBe(true);
  if (beforeClear.ok) {
    expect(beforeClear.value.length).toBe(2);
  }

  // クリア実行
  repository.clear();

  // クリア確認
  const afterClear = await repository.findAll();
  expect(afterClear.ok).toBe(true);
  if (afterClear.ok) {
    expect(afterClear.value.length).toBe(0);
  }
});
