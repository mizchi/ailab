import {
  addChatHistory,
  addTodo,
  getRecentChatHistory,
  getTodoStats,
  listTodos,
  type removeTodo,
  searchTodos,
  toggleTodo,
  type updateTodo,
} from "./db.ts";
import { ask } from "./ask.ts";

// todoParserのヘルプメソッドだけを使用するためのシンプルなインターフェース
interface HelpProvider {
  help(): string;
}

// 実際のtodoParserオブジェクトは実行時に注入する
let _todoParser: HelpProvider | null = null;

// todoParserを設定する関数
export function setTodoParserForHelp(parser: HelpProvider): void {
  _todoParser = parser;
}

// ヘルプを取得するための関数
function getTodoHelp(): string {
  if (!_todoParser) {
    return "TODOアプリのヘルプは現在利用できません。";
  }
  return _todoParser.help();
}

/**
 * AIにTODOアプリのコマンドを決定させる
 * （簡易版：実際のAI機能は使わず、簡単な応答を返す）
 * @param prompt ユーザーの入力プロンプト
 * @returns AIの応答
 */
export async function processChatCommand(prompt: string): Promise<void> {
  console.log("思考中...");

  try {
    // 直近の会話履歴を取得
    const recentHistory = await getRecentChatHistory(5);
    let historyContext = "";

    if (recentHistory.length > 0) {
      historyContext = "\n\n直近の会話履歴:\n";
      recentHistory.forEach((chat, index) => {
        historyContext += `${index + 1}. ユーザー: ${chat.userPrompt}\n   AI: ${
          chat.aiResponse.substring(0, 100)
        }${chat.aiResponse.length > 100 ? "..." : ""}\n\n`;
      });

      console.log(historyContext);
    }

    // このシンプル版のAIチャットでは、いくつかのキーワードに基づいて応答を生成します
    let aiResponse = "";
    const promptLower = prompt.toLowerCase();

    // コマンドを実行
    if (promptLower.includes("ヘルプ") || promptLower.includes("使い方")) {
      // ヘルプを表示
      const helpText = getTodoHelp();
      console.log(helpText);
      aiResponse = `TODOアプリの使い方は以下の通りです：\n${helpText}`;
    } else if (
      promptLower.includes("タスク一覧") ||
      promptLower.includes("リスト")
    ) {
      // タスク一覧を表示
      const todos = await listTodos(true);
      if (todos.length === 0) {
        console.log("TODOは登録されていません。");
        aiResponse =
          "現在、TODOは登録されていません。「タスクを追加して」と言ってタスクを追加できます。";
      } else {
        console.log(`${todos.length}件のTODOがあります：`);
        todos.forEach((todo) => {
          const status = todo.completed ? "✓" : "□";
          console.log(`${status} ${todo.id.substring(0, 8)}: ${todo.text}`);
        });
        aiResponse =
          `${todos.length}件のTODOが登録されています。詳細を見るには「list」コマンドを使ってください。`;
      }
    } else if (promptLower.includes("追加") || promptLower.includes("登録")) {
      // タスク追加
      const taskMatch = prompt.match(/[「『](.+?)[」』]/);
      let taskText;

      if (taskMatch && taskMatch[1]) {
        taskText = taskMatch[1];
      } else {
        // 「〜を追加」という形式から抽出
        const addMatch = prompt.match(/(.+?)を(追加|登録)/);
        if (addMatch && addMatch[1]) {
          taskText = addMatch[1];
        } else {
          // 直接ユーザーに尋ねる
          taskText = await ask("追加するタスクの内容を教えてください");
        }
      }

      if (taskText && taskText.trim()) {
        const newTodo = await addTodo(taskText);
        console.log(
          `✓ 新しいTODOを追加しました: ${newTodo.text} (ID: ${
            newTodo.id.substring(0, 8)
          })`,
        );
        aiResponse = `「${taskText}」というタスクを追加しました。`;
      } else {
        aiResponse = "タスクの追加をキャンセルしました。";
      }
    } else if (promptLower.includes("完了") || promptLower.includes("済み")) {
      // タスク完了
      const idMatch = prompt.match(/ID:([a-zA-Z0-9]+)/i);
      let todoId;

      if (idMatch && idMatch[1]) {
        todoId = idMatch[1];
      } else {
        // タスクのリストを表示
        const todos = await listTodos(false); // 未完了のみ
        if (todos.length === 0) {
          console.log("完了できる未完了のタスクはありません。");
          aiResponse =
            "完了できる未完了のタスクはありません。「list」コマンドですべてのタスクを確認できます。";
          await addChatHistory(prompt, aiResponse);
          console.log(aiResponse);
          return;
        }

        console.log("未完了のタスク一覧：");
        todos.forEach((todo, index) => {
          console.log(
            `${index + 1}. ID:${todo.id.substring(0, 8)} - ${todo.text}`,
          );
        });

        // ユーザーに選択してもらう
        const answer = await ask(
          "完了にするタスクのIDまたは番号を入力してください",
        );
        const num = parseInt(answer, 10);

        if (!isNaN(num) && num > 0 && num <= todos.length) {
          // 番号で選択された場合
          todoId = todos[num - 1].id;
        } else {
          // IDで指定された場合
          todoId = answer;
        }
      }

      // タスクを完了に
      if (todoId) {
        const updatedTodo = await toggleTodo(todoId);
        if (updatedTodo) {
          console.log(`✓ タスク「${updatedTodo.text}」を完了にしました。`);
          aiResponse = `タスク「${updatedTodo.text}」を完了にしました。`;
        } else {
          console.log(`✗ ID:${todoId}のタスクは見つかりませんでした。`);
          aiResponse =
            `指定されたIDのタスクは見つかりませんでした。「list」コマンドでタスク一覧を確認してください。`;
        }
      } else {
        aiResponse = "タスクの完了をキャンセルしました。";
      }
    } else if (promptLower.includes("検索")) {
      // タスク検索
      const searchMatch = prompt.match(/[「『](.+?)[」』]/);
      let searchText;

      if (searchMatch && searchMatch[1]) {
        searchText = searchMatch[1];
      } else {
        // 「〜を検索」という形式から抽出
        const searchForMatch = prompt.match(/(.+?)を検索/);
        if (searchForMatch && searchForMatch[1]) {
          searchText = searchForMatch[1];
        } else {
          // 直接ユーザーに尋ねる
          searchText = await ask("検索するキーワードを入力してください");
        }
      }

      if (searchText && searchText.trim()) {
        const results = await searchTodos(searchText);
        if (results.length > 0) {
          console.log(`「${searchText}」の検索結果: ${results.length}件`);
          results.forEach((todo) => {
            const status = todo.completed ? "✓" : "□";
            console.log(`${status} ${todo.id.substring(0, 8)}: ${todo.text}`);
          });
          aiResponse =
            `「${searchText}」に関連するタスクが${results.length}件見つかりました。`;
        } else {
          console.log(
            `「${searchText}」に一致するTODOは見つかりませんでした。`,
          );
          aiResponse =
            `「${searchText}」に一致するタスクは見つかりませんでした。`;
        }
      } else {
        aiResponse = "検索をキャンセルしました。";
      }
    } else if (promptLower.includes("統計") || promptLower.includes("状況")) {
      // 統計情報
      const stats = await getTodoStats();
      console.log("TODOの統計情報:");
      console.log(`総タスク数: ${stats.total}`);
      console.log(`完了: ${stats.completed}`);
      console.log(`未完了: ${stats.active}`);
      console.log(
        `完了率: ${
          (stats.total > 0 ? (stats.completed / stats.total) * 100 : 0).toFixed(
            1,
          )
        }%`,
      );

      aiResponse =
        `現在のTODO状況: 総タスク数${stats.total}件、完了${stats.completed}件、未完了${stats.active}件、完了率${
          (stats.total > 0 ? (stats.completed / stats.total) * 100 : 0).toFixed(
            1,
          )
        }%です。`;
    } else {
      // その他の入力
      console.log("その他の入力を受け取りました。");
      aiResponse =
        "こんにちは！TODOアプリのチャット機能です。\n「ヘルプ」と言うとコマンドの一覧が表示されます。\n「タスク一覧」でタスクを確認、「タスクを追加」でタスクを追加できます。";
    }

    console.log(aiResponse);

    // 会話履歴をデータベースに保存
    await addChatHistory(prompt, aiResponse);
    console.log("会話履歴を保存しました");
  } catch (error) {
    console.error(
      `チャット処理中にエラーが発生しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
