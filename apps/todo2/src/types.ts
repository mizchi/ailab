import { z } from "npm:zod";
import type { chatHistory, todos } from "../db/schema.ts";
import type { InferSelectModel } from "drizzle-orm";

/**
 * DrizzleのTodo型
 */
export type DrizzleTodo = InferSelectModel<typeof todos>;

/**
 * DrizzleのChatHistory型
 */
export type DrizzleChatHistory = InferSelectModel<typeof chatHistory>;

/**
 * TODOタスクのZodスキーマ
 */
export const todoSchema = z.object({
  /** タスクのID */
  id: z.string().uuid(),
  /** タスクの内容 */
  text: z.string().min(1, "タスクの内容は必須です"),
  /** タスクが完了しているかどうか */
  completed: z.boolean().default(false),
  /** タスクの作成日時 */
  createdAt: z.string().datetime(),
  /** タスクの更新日時 */
  updatedAt: z.string().datetime(),
});

/**
 * TODOタスクの型
 */
export type Todo = z.infer<typeof todoSchema>;

/**
 * 新しいTODO作成用のスキーマ（IDと日付は自動生成）
 */
export const newTodoSchema = todoSchema.pick({ text: true });

/**
 * 新しいTODO作成用の型
 */
export type NewTodo = z.infer<typeof newTodoSchema>;

/**
 * TODOリストのスキーマ
 */
export const todoListSchema = z.object({
  todos: z.array(todoSchema),
});

/**
 * TODOリストの型
 */
export type TodoList = z.infer<typeof todoListSchema>;

/**
 * TODOの更新用のスキーマ
 */
export const todoUpdateSchema = todoSchema.partial().pick({
  text: true,
  completed: true,
});

/**
 * TODOの更新用の型
 */
export type TodoUpdate = z.infer<typeof todoUpdateSchema>;

/**
 * チャット履歴のZodスキーマ
 */
export const chatHistorySchema = z.object({
  /** チャット履歴のID */
  id: z.string().uuid(),
  /** ユーザーの入力プロンプト */
  userPrompt: z.string(),
  /** AIの応答 */
  aiResponse: z.string(),
  /** 会話が行われた日時 */
  timestamp: z.string().datetime(),
});

/**
 * チャット履歴の型
 */
export type ChatHistory = z.infer<typeof chatHistorySchema>;

/**
 * DrizzleとZodの型を変換するヘルパー関数
 */
export function drizzleTodoToTodo(todo: DrizzleTodo): Todo {
  return {
    id: todo.id,
    text: todo.text,
    completed: todo.completed,
    createdAt: todo.created_at.toISOString(),
    updatedAt: todo.updated_at.toISOString(),
  };
}

/**
 * DrizzleとZodの型を変換するヘルパー関数（ChatHistory用）
 */
export function drizzleChatHistoryToChatHistory(
  history: DrizzleChatHistory,
): ChatHistory {
  return {
    id: history.id,
    userPrompt: history.user_prompt,
    aiResponse: history.ai_response,
    timestamp: history.timestamp.toISOString(),
  };
}
