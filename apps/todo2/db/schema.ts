import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// 既存のusersテーブル
export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
});

// todosテーブル
export const todos = pgTable("todos", {
  // SQLiteではUUID文字列でしたが、ここではSerialとして実装
  id: varchar({ length: 36 }).primaryKey().notNull(),
  text: text().notNull(),
  completed: boolean().default(false).notNull(),
  created_at: timestamp().notNull(),
  updated_at: timestamp().notNull(),
});

// chat_historyテーブル
export const chatHistory = pgTable("chat_history", {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  user_prompt: text().notNull(),
  ai_response: text().notNull(),
  timestamp: timestamp().notNull(),
});
