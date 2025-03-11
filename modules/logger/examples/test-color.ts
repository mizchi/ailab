// プレフィックスの色付けテスト

import { createLogger } from "./logger.ts";

// 基本的なロガー
console.log("\n=== 基本的なロガー ===");
const basicLogger = createLogger("basic");
basicLogger.debug("デバッグメッセージ");
basicLogger.info("情報メッセージ");
basicLogger.log("通常のログメッセージ");
basicLogger.warn("警告メッセージ");
basicLogger.error("エラーメッセージ");

// タイムスタンプ付きロガー
console.log("\n=== タイムスタンプ付きロガー ===");
const timeLogger = createLogger("time", { showTimestamp: true });
timeLogger.debug("デバッグメッセージ");
timeLogger.info("情報メッセージ");
timeLogger.log("通常のログメッセージ");
timeLogger.warn("警告メッセージ");
timeLogger.error("エラーメッセージ");

// 呼び出し元情報付きロガー
console.log("\n=== 呼び出し元情報付きロガー ===");
const callerLogger = createLogger("caller", { showCaller: true });
callerLogger.debug("デバッグメッセージ");
callerLogger.info("情報メッセージ");
callerLogger.log("通常のログメッセージ");
callerLogger.warn("警告メッセージ");
callerLogger.error("エラーメッセージ");

// タイムスタンプと呼び出し元情報の両方
console.log("\n=== タイムスタンプと呼び出し元情報の両方 ===");
const fullLogger = createLogger("full", {
  showTimestamp: true,
  showCaller: true,
});
fullLogger.debug("デバッグメッセージ");
fullLogger.info("情報メッセージ");
fullLogger.log("通常のログメッセージ");
fullLogger.warn("警告メッセージ");
fullLogger.error("エラーメッセージ");

// オブジェクト引数付き
console.log("\n=== オブジェクト引数付き ===");
const objLogger = createLogger("object");
objLogger.info("オブジェクト:", { id: 1, name: "テスト" });
objLogger.info({ id: 2, name: "オブジェクトのみ" });

// 一時的な設定変更
console.log("\n=== 一時的な設定変更 ===");
const tempLogger = createLogger("temp");
tempLogger.info("通常の情報メッセージ");
tempLogger.with({ showTimestamp: true }).info(
  "タイムスタンプ付き情報メッセージ",
);

// カスタムトピック
console.log("\n=== カスタムトピック ===");
const appLogger = createLogger("app", { showTopics: true });
const dbTopic = appLogger.custom("db");
const authTopic = appLogger.custom("auth");

appLogger.info("アプリケーションの情報メッセージ");
dbTopic.info("データベースの情報メッセージ");
authTopic.warn("認証の警告メッセージ");
