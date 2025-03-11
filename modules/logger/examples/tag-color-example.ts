/**
 * タグに基づく色分け機能のデモ
 *
 * このサンプルでは、タグ名からハッシュ値を生成し、
 * それに基づいて色を選択する機能を示します。
 * 同じタグは常に同じ色になります。
 */

import { createLogger } from "../mod.ts";

// 様々なタグでロガーを作成
const loggers = [
  createLogger("app"),
  createLogger("server"),
  createLogger("database"),
  createLogger("auth"),
  createLogger("api"),
  createLogger("cache"),
  createLogger("router"),
  createLogger("controller"),
  createLogger("model"),
  createLogger("view"),
  createLogger("utils"),
  createLogger("config"),
];

// 各ロガーでメッセージを出力
console.log("--- タグに基づく色分け ---");
loggers.forEach((logger, index) => {
  logger.info(`これはロガー #${index + 1} からのメッセージです`);
});

// 同じタグは常に同じ色になることを確認
console.log("\n--- 同じタグは同じ色 ---");
const appLogger = createLogger("app");
appLogger.info("1回目のメッセージ");
appLogger.info("2回目のメッセージ");
appLogger.info("3回目のメッセージ");

// 未指定の場合はランダムな色
console.log("\n--- タグ未指定はランダムな色 ---");
const randomLogger1 = createLogger("");
const randomLogger2 = createLogger("");
const randomLogger3 = createLogger("");

randomLogger1.info("ランダム色のロガー 1");
randomLogger2.info("ランダム色のロガー 2");
randomLogger3.info("ランダム色のロガー 3");

// 異なるログレベル
console.log("\n--- 異なるログレベル ---");
const levelLogger = createLogger("levels");
levelLogger.debug("デバッグメッセージ");
levelLogger.info("情報メッセージ");
levelLogger.error("エラーメッセージ");
