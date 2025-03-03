import { and, desc, eq, like } from "drizzle-orm";
import { db } from "../db/client.ts";
import { chatHistory, todos } from "../db/schema.ts";
import {
  type ChatHistory,
  drizzleChatHistoryToChatHistory,
  drizzleTodoToTodo,
  type Todo,
  type TodoUpdate,
} from "./types.ts";
import { ensureDirSync } from "jsr:@std/fs";
import { join } from "jsr:@std/path";

// データディレクトリの確保
const HOME_DIR = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "";
const TODO_DIR = join(HOME_DIR, ".todo2");

// 起動時にディレクトリが確実に存在するようにする
ensureDirSync(TODO_DIR);

/**
 * 新しいTODOを追加する
 * @param text TODOの内容
 * @returns 追加されたTODO
 */
export async function addTodo(text: string): Promise<Todo> {
  const now = new Date();
  const todoId = crypto.randomUUID();

  const newTodo = {
    id: todoId,
    text,
    completed: false,
    created_at: now,
    updated_at: now,
  };

  await db.insert(todos).values(newTodo);

  return drizzleTodoToTodo(newTodo);
}

/**
 * TODOを完了/未完了に切り替える
 * @param id TODOのID（完全なIDまたは部分的なID）
 * @returns 更新されたTODO、見つからない場合はnull
 */
export async function toggleTodo(id: string): Promise<Todo | null> {
  // IDで検索（完全一致または部分一致）
  const todoItems = await db
    .select()
    .from(todos)
    .where(
      id.length === 36
        ? eq(todos.id, id) // 完全一致
        : like(todos.id, `%${id}%`), // 部分一致
    );

  if (todoItems.length === 0) {
    return null;
  }

  const todo = todoItems[0];
  const todoId = todo.id;
  const newStatus = !todo.completed;
  const now = new Date();

  // 更新を実行
  await db
    .update(todos)
    .set({ completed: newStatus, updated_at: now })
    .where(eq(todos.id, todoId));

  return drizzleTodoToTodo({
    ...todo,
    completed: newStatus,
    updated_at: now,
  });
}

/**
 * TODOを更新する
 * @param id TODOのID
 * @param update 更新内容
 * @returns 更新されたTODO、見つからない場合はnull
 */
export async function updateTodo(
  id: string,
  update: TodoUpdate,
): Promise<Todo | null> {
  // 現在のTODOを取得
  const todoItems = await db.select().from(todos).where(eq(todos.id, id));

  if (todoItems.length === 0) {
    return null;
  }

  const todo = todoItems[0];
  const now = new Date();

  // 更新用オブジェクトを準備
  const updateData: Partial<typeof todo> = {
    updated_at: now,
  };

  if (update.text !== undefined) {
    updateData.text = update.text;
  }

  if (update.completed !== undefined) {
    updateData.completed = update.completed;
  }

  // 更新を実行
  await db.update(todos).set(updateData).where(eq(todos.id, id));

  // 更新されたTODOを返す
  return drizzleTodoToTodo({
    ...todo,
    ...updateData,
  });
}

/**
 * TODOを削除する
 * @param id TODOのID
 * @returns 削除に成功したかどうか
 */
export async function removeTodo(id: string): Promise<boolean> {
  // 削除前に存在確認
  const todoItems = await db
    .select({ id: todos.id })
    .from(todos)
    .where(eq(todos.id, id));

  if (todoItems.length === 0) {
    return false;
  }

  // 削除を実行
  await db.delete(todos).where(eq(todos.id, id));

  return true;
}

/**
 * すべてのTODOを取得する
 * @param showCompleted 完了したTODOを含めるかどうか
 * @returns TODOのリスト
 */
export async function listTodos(showCompleted = true): Promise<Todo[]> {
  let result;

  if (!showCompleted) {
    result = await db
      .select()
      .from(todos)
      .where(eq(todos.completed, false))
      .orderBy(desc(todos.created_at));
  } else {
    result = await db.select().from(todos).orderBy(desc(todos.created_at));
  }

  return result.map(drizzleTodoToTodo);
}

/**
 * IDでTODOを取得する
 * @param id TODOのID
 * @returns TODOまたはnull
 */
export async function getTodo(id: string): Promise<Todo | null> {
  // IDで検索（完全一致または部分一致）
  const todoItems = await db
    .select()
    .from(todos)
    .where(
      id.length === 36
        ? eq(todos.id, id) // 完全一致
        : like(todos.id, `%${id}%`), // 部分一致
    );

  if (todoItems.length === 0) {
    return null;
  }

  return drizzleTodoToTodo(todoItems[0]);
}

/**
 * テキストでTODOを検索する
 * @param searchText 検索するテキスト
 * @param showCompleted 完了したTODOを含めるかどうか
 * @returns 検索結果のTODOリスト
 */
export async function searchTodos(
  searchText: string,
  showCompleted = true,
): Promise<Todo[]> {
  const searchPattern = `%${searchText}%`;
  let result;

  if (!showCompleted) {
    result = await db
      .select()
      .from(todos)
      .where(and(like(todos.text, searchPattern), eq(todos.completed, false)))
      .orderBy(desc(todos.created_at));
  } else {
    result = await db
      .select()
      .from(todos)
      .where(like(todos.text, searchPattern))
      .orderBy(desc(todos.created_at));
  }

  return result.map(drizzleTodoToTodo);
}

/**
 * TODOの統計情報を取得する
 * @returns 統計情報（総数、完了数、未完了数）
 */
export async function getTodoStats(): Promise<{
  total: number;
  completed: number;
  active: number;
}> {
  // 総数
  const allTodos = await db.select().from(todos);
  const totalCount = allTodos.length;

  // 完了数
  const completedTodos = allTodos.filter((todo) => todo.completed);
  const completedCount = completedTodos.length;

  return {
    total: totalCount,
    completed: completedCount,
    active: totalCount - completedCount,
  };
}

/**
 * 完了したTODOをすべて削除する
 * @returns 削除された項目の数
 */
export async function removeCompletedTodos(): Promise<number> {
  // 削除前に完了済みTODOの数を取得
  const completedTodos = await db
    .select()
    .from(todos)
    .where(eq(todos.completed, true));
  const count = completedTodos.length;

  if (count > 0) {
    // 削除を実行
    await db.delete(todos).where(eq(todos.completed, true));
  }

  return count;
}

/**
 * 新しい会話履歴を追加する
 * @param userPrompt ユーザーの入力プロンプト
 * @param aiResponse AIの応答
 * @returns 追加された会話履歴
 */
export async function addChatHistory(
  userPrompt: string,
  aiResponse: string,
): Promise<ChatHistory> {
  const now = new Date();
  const chatId = crypto.randomUUID();

  const newChat = {
    id: chatId,
    user_prompt: userPrompt,
    ai_response: aiResponse,
    timestamp: now,
  };

  await db.insert(chatHistory).values(newChat);

  return drizzleChatHistoryToChatHistory(newChat);
}

/**
 * 直近の会話履歴を取得する
 * @param limit 取得する履歴の数（デフォルト:5）
 * @returns 会話履歴のリスト
 */
export async function getRecentChatHistory(limit = 5): Promise<ChatHistory[]> {
  const result = await db
    .select()
    .from(chatHistory)
    .orderBy(desc(chatHistory.timestamp))
    .limit(limit);

  return result.map(drizzleChatHistoryToChatHistory);
}
