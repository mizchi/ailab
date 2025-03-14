import { createLogger, type LogLevel } from "../mod.ts";

// サンプルデータ
const sampleObject = {
  user: {
    id: 1,
    name: "ずんだもん",
    email: "zunda@example.com",
    preferences: {
      theme: "dark",
      notifications: true,
    },
  },
  items: [
    { id: 101, name: "アイテム1", price: 1000 },
    { id: 102, name: "アイテム2", price: 2000 },
    { id: 103, name: "アイテム3", price: 3000 },
  ],
};

console.log("=== タイムスタンプ表示のデモ ===\n");

// デフォルト設定（タイムスタンプなし）
const defaultLogger = createLogger("default");
console.log("デフォルト設定（タイムスタンプなし）:");
defaultLogger.log("これはデフォルト設定のログです", sampleObject);

// タイムスタンプあり（時間のみ）
const timeOnlyLogger = createLogger("time-only", { showTimestamp: true });
console.log("\nタイムスタンプあり（時間のみ）:");
timeOnlyLogger.log("これは時間のみのタイムスタンプ付きログです", sampleObject);

// タイムスタンプあり（ISO形式）
const isoTimeLogger = createLogger("iso-time", {
  showTimestamp: true,
  timeOnly: false,
});
console.log("\nタイムスタンプあり（ISO形式）:");
isoTimeLogger.log("これはISO形式のタイムスタンプ付きログです", sampleObject);

// 一時的な設定でタイムスタンプを表示
console.log("\n一時的な設定でタイムスタンプを表示:");
defaultLogger.with({ showTimestamp: true }).log(
  "一時的にタイムスタンプを表示しています",
  sampleObject,
);

// 一時的な設定でタイムスタンプを非表示
console.log("\n一時的な設定でタイムスタンプを非表示:");
timeOnlyLogger.with({ showTimestamp: false }).log(
  "一時的にタイムスタンプを非表示にしています",
  sampleObject,
);
