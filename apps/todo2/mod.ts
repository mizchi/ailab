#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

/**
 * TODOアプリのメインエントリーポイント
 *
 * このファイルは、コマンドライン引数を解析して適切なコマンドを実行します。
 *
 * 使用例:
 * ```
 * deno run --allow-read --allow-write --allow-env mod.ts add "牛乳を買う"
 * deno run --allow-read --allow-write --allow-env mod.ts list
 * deno run --allow-read --allow-write --allow-env mod.ts toggle <id>
 * deno run --allow-read --allow-write --allow-env mod.ts remove <id>
 * deno run --allow-read --allow-write --allow-env mod.ts update <id> --text "新しいテキスト"
 * ```
 */

import { executeCommand } from "./src/commands.ts";

// メイン関数
if (import.meta.main) {
  try {
    // コマンドを実行（非同期関数なので即時実行）
    (async () => {
      await executeCommand(Deno.args);
    })().catch((error) => {
      // エラーの型に応じてメッセージを表示
      if (error instanceof Error) {
        console.error("エラー:", error.message);
      } else {
        console.error("予期しないエラーが発生しました:", String(error));
      }
      Deno.exit(1);
    });
  } catch (error) {
    // 非同期処理前のエラー
    if (error instanceof Error) {
      console.error("エラー:", error.message);
    } else {
      console.error("予期しないエラーが発生しました:", String(error));
    }
    Deno.exit(1);
  }
}

// モジュールとしてインポートされた場合に公開するAPI
export { executeCommand } from "./src/commands.ts";
export {
  addTodo,
  getTodo,
  getTodoStats,
  listTodos,
  removeCompletedTodos,
  removeTodo,
  searchTodos,
  toggleTodo,
  updateTodo,
} from "./src/db.ts";
export type { NewTodo, Todo, TodoList, TodoUpdate } from "./src/types.ts";
