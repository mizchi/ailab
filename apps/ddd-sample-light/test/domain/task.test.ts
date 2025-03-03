/**
 * タスクドメインロジックのテスト
 */

import { expect } from "jsr:@std/expect";
import { test } from "jsr:@std/testing/bdd";
import {
  changeTaskDescription,
  changeTaskPriority,
  changeTaskStatus,
  changeTaskTitle,
  createTask,
  filterTasks,
  isTaskActive,
} from "../../src/domain/task.ts";
import type {
  Priority,
  Task,
  TaskId,
  TaskStatus,
  UserId,
} from "../../src/domain/types.ts";
import { ValidationError } from "../../src/core/result.ts";

// テスト用ヘルパー関数
function createTestTaskId(): TaskId {
  return "test-task-id" as TaskId;
}

function createTestUserId(): UserId {
  return "test-user-id" as UserId;
}

function createTestTask(
  status: TaskStatus = "pending",
  priority: Priority = "medium",
): Task {
  return {
    id: createTestTaskId(),
    title: "テストタスク",
    description: "テスト用のタスク",
    status,
    priority,
    createdBy: createTestUserId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// createTaskのテスト
test("createTask - 有効なパラメータでタスクを作成できる", () => {
  const taskResult = createTask(
    createTestTaskId(),
    "買い物をする",
    "medium",
    createTestUserId(),
    "牛乳と卵を買う",
  );

  expect(taskResult.ok).toBe(true);
  if (taskResult.ok) {
    const task = taskResult.value;
    expect(task.title).toBe("買い物をする");
    expect(task.description).toBe("牛乳と卵を買う");
    expect(task.status).toBe("pending");
    expect(task.priority).toBe("medium");
    expect(task.createdAt).toBeInstanceOf(Date);
    expect(task.updatedAt).toBeInstanceOf(Date);
  }
});

test("createTask - 空のタイトルでエラーを返す", () => {
  const taskResult = createTask(
    createTestTaskId(),
    "",
    "medium",
    createTestUserId(),
  );

  expect(taskResult.ok).toBe(false);
  if (!taskResult.ok) {
    expect(taskResult.error).toBeInstanceOf(ValidationError);
    expect(taskResult.error.message).toContain("タイトルは必須です");
  }
});

// changeTaskStatusのテスト
test("changeTaskStatus - ステータスを変更できる", () => {
  const task = createTestTask();
  const result = changeTaskStatus(task, "in-progress");

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.status).toBe("in-progress");
    expect(result.value.updatedAt.getTime()).toBeGreaterThanOrEqual(
      task.updatedAt.getTime(),
    );
  }
});

test("changeTaskStatus - 完了したタスクはキャンセルのみ可能", () => {
  const completedTask = createTestTask("completed");

  // キャンセルへの変更は可能
  const cancelResult = changeTaskStatus(completedTask, "cancelled");
  expect(cancelResult.ok).toBe(true);

  // 他のステータスへの変更は不可
  const pendingResult = changeTaskStatus(completedTask, "pending");
  expect(pendingResult.ok).toBe(false);

  const progressResult = changeTaskStatus(completedTask, "in-progress");
  expect(progressResult.ok).toBe(false);
});

test("changeTaskStatus - キャンセルされたタスクは変更不可", () => {
  const cancelledTask = createTestTask("cancelled");

  const result = changeTaskStatus(cancelledTask, "pending");

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(ValidationError);
    expect(result.error.message).toContain(
      "キャンセルされたタスクは変更できません",
    );
  }
});

// changeTaskPriorityのテスト
test("changeTaskPriority - 優先度を変更できる", () => {
  const task = createTestTask();
  const result = changeTaskPriority(task, "high");

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.priority).toBe("high");
    expect(result.value.updatedAt.getTime()).toBeGreaterThanOrEqual(
      task.updatedAt.getTime(),
    );
  }
});

test("changeTaskPriority - 完了したタスクは変更不可", () => {
  const completedTask = createTestTask("completed");
  const result = changeTaskPriority(completedTask, "high");

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(ValidationError);
    expect(result.error.message).toContain(
      "completed状態のタスクは変更できません",
    );
  }
});

// changeTaskTitleのテスト
test("changeTaskTitle - タイトルを変更できる", () => {
  const task = createTestTask();
  const newTitle = "更新されたタイトル";
  const result = changeTaskTitle(task, newTitle);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.title).toBe(newTitle);
    expect(result.value.updatedAt.getTime()).toBeGreaterThanOrEqual(
      task.updatedAt.getTime(),
    );
  }
});

test("changeTaskTitle - 空のタイトルでエラーを返す", () => {
  const task = createTestTask();
  const result = changeTaskTitle(task, "");

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(ValidationError);
    expect(result.error.message).toContain("タイトルは必須です");
  }
});

// changeTaskDescriptionのテスト
test("changeTaskDescription - 説明を変更できる", () => {
  const task = createTestTask();
  const newDescription = "更新された説明";
  const result = changeTaskDescription(task, newDescription);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.description).toBe(newDescription);
    expect(result.value.updatedAt.getTime()).toBeGreaterThanOrEqual(
      task.updatedAt.getTime(),
    );
  }
});

test("changeTaskDescription - 説明をnullに設定できる", () => {
  const task = createTestTask();
  const result = changeTaskDescription(task, undefined);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.description).toBeUndefined();
  }
});

// isTaskActiveのテスト
test("isTaskActive - アクティブなタスクを正しく判定", () => {
  expect(isTaskActive(createTestTask("pending"))).toBe(true);
  expect(isTaskActive(createTestTask("in-progress"))).toBe(true);
  expect(isTaskActive(createTestTask("completed"))).toBe(false);
  expect(isTaskActive(createTestTask("cancelled"))).toBe(false);
});

// filterTasksのテスト
test("filterTasks - タスクを正しくフィルタリングできる", () => {
  const tasks = [
    createTestTask("pending", "low"),
    createTestTask("in-progress", "medium"),
    createTestTask("completed", "high"),
    createTestTask("cancelled", "low"),
  ];

  // ステータスでフィルタリング
  const pendingTasks = filterTasks(tasks, { status: "pending" });
  expect(pendingTasks.length).toBe(1);
  expect(pendingTasks[0].status).toBe("pending");

  // 優先度でフィルタリング
  const lowPriorityTasks = filterTasks(tasks, { priority: "low" });
  expect(lowPriorityTasks.length).toBe(2);
  expect(lowPriorityTasks[0].priority).toBe("low");
  expect(lowPriorityTasks[1].priority).toBe("low");

  // 複合条件でフィルタリング
  const lowPendingTasks = filterTasks(tasks, {
    status: "pending",
    priority: "low",
  });
  expect(lowPendingTasks.length).toBe(1);
  expect(lowPendingTasks[0].status).toBe("pending");
  expect(lowPendingTasks[0].priority).toBe("low");
});
