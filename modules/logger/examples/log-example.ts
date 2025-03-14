// ロガーライブラリの使用例

import { createLogger } from "../logger.ts";
import type { LogEntry } from "../types.ts";

// 基本的な使い方
console.log("\n=== 基本的な使い方 ===");
const basicLogger = createLogger("basic");
basicLogger.debug("デバッグメッセージ");
basicLogger.info("情報メッセージ");
basicLogger.error("エラーメッセージ");

// 繰り返しメッセージのグループ化
console.log("\n=== 繰り返しメッセージのグループ化 ===");
const repeatLogger = createLogger("repeat", { maxRepeat: 3 });
for (let i = 0; i < 10; i++) {
  repeatLogger.info("これは繰り返しメッセージです");
}
repeatLogger.debug("別のメッセージ");

// 履歴機能
console.log("\n=== 履歴機能 ===");
const historyLogger = createLogger("history", { useHistory: true });
historyLogger.debug("デバッグメッセージ");
historyLogger.info("情報メッセージ");
historyLogger.error("エラーメッセージ");
const logHistory = historyLogger.flush();
console.log(
  "履歴:",
  logHistory.map((entry: LogEntry) => ({
    ...entry,
    args: entry.args, // argsをそのまま表示
    timestamp: entry.timestamp.toISOString(), // 読みやすく変換
  })),
);

// フィルター機能
console.log("\n=== フィルター機能（エラーのみ表示） ===");
const filterLogger = createLogger("filter", {
  filter: (entry) => {
    // 最初の引数が文字列で、"エラー"を含む場合のみ表示
    return entry.args.length > 0 &&
      typeof entry.args[0] === "string" &&
      entry.args[0].includes("エラー");
  },
});
filterLogger.debug("デバッグメッセージ");
filterLogger.info("情報メッセージ");
filterLogger.error("エラーメッセージ");

// JSON構造体の色付け
console.log("\n=== JSON構造体の色付け ===");
const jsonLogger = createLogger("json");
jsonLogger.info("ユーザー情報:", {
  id: 1,
  name: "ずんだもん",
  roles: ["admin", "user"],
  metadata: {
    lastLogin: "2025-03-10T22:30:00Z",
    preferences: {
      theme: "dark",
      notifications: true,
    },
  },
});

// 複数引数
console.log("\n=== 複数引数 ===");
const multiLogger = createLogger("multi");
multiLogger.debug("デバッグ情報:", 123, true, ["a", "b", "c"]);
multiLogger.info("処理結果:", "成功", { status: 200 });

// 一行表示
console.log("\n=== 一行表示 ===");
const singleLineLogger = createLogger("single", { singleLine: true });
singleLineLogger.info("ユーザー情報:", { name: "ずんだもん", id: 123 });
singleLineLogger.debug("配列データ:", [1, 2, 3, 4, 5]);

// フォーマット関数の使用
console.log("\n=== フォーマット関数の使用 ===");
const formatLogger = createLogger("format", { useHistory: true });
formatLogger.info("これはフォーマットされます");
formatLogger.error("エラーが発生しました", { code: 404, message: "Not Found" });

const history = formatLogger.flush();
console.log("カスタムフォーマット:");
history.forEach((entry: LogEntry) => {
  // display関数を使って独自の表示を行う
  const formatted = formatLogger.display(entry);
  console.log(`カスタム: ${formatted}`);
});

// 最大文字数制限
console.log("\n=== 最大文字数制限 ===");
const limitLogger = createLogger("limit", { maxLength: 20 });
limitLogger.info("これは短いメッセージです"); // 省略されない
limitLogger.info({ jsonValue: 1 }); // 省略されない

limitLogger.info("これは非常に長いメッセージです。省略されるはずです。"); // 省略される
limitLogger.debug("JSONも省略:", {
  data: "非常に長いデータ".repeat(10),
  numbers: Array.from({ length: 100 }, (_, i) => i),
});

// タグとオプションの組み合わせ
console.log("\n=== タグとオプションの組み合わせ ===");
const advancedLogger = createLogger("app", {
  maxRepeat: 2,
  useHistory: true,
  filter: (entry) => {
    // debugレベル以外、または最初の引数が"重要"を含む場合に表示
    return entry.level !== "debug" ||
      (entry.args.length > 0 &&
        typeof entry.args[0] === "string" &&
        entry.args[0].includes("重要"));
  },
});

advancedLogger.debug("通常のデバッグメッセージ"); // フィルターされる
advancedLogger.debug("重要なデバッグメッセージ"); // 表示される
advancedLogger.info("情報メッセージ1");
advancedLogger.info("情報メッセージ1"); // 繰り返し
advancedLogger.info("情報メッセージ1"); // 繰り返し、カウント表示
advancedLogger.error("エラーが発生しました");

const advancedHistory = advancedLogger.flush();
console.log(
  "\n履歴（フィルター前の全ログ）:",
  advancedHistory.map((entry: LogEntry) => ({
    ...entry,
    args: entry.args, // argsをそのまま表示
    timestamp: entry.timestamp.toISOString(), // 読みやすく変換
  })),
);
