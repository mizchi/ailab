/**
 * スタックトレース機能のデモ
 *
 * このサンプルでは、ロガーのスタックトレース機能を使用して、
 * ログメッセージの呼び出し元の情報を表示する方法を示します。
 */

import { createLogger } from "../mod.ts";

// 通常のロガー
const normalLogger = createLogger("normal");

// スタックトレース情報を表示するロガー（短い形式）
const shortStackLogger = createLogger("short-stack", {
  showCaller: true,
});

// スタックトレース情報を表示するロガー（詳細な形式）
const detailedStackLogger = createLogger("detailed-stack", {
  showCaller: true,
  detailedCaller: true,
});

// 直接呼び出し
function directCall() {
  console.log("\n--- 直接呼び出し ---");
  normalLogger.info("通常のログ（スタックトレースなし）");
  shortStackLogger.info("短いスタックトレース付きログ");
  detailedStackLogger.info("詳細なスタックトレース付きログ");
}

// ネストされた呼び出し
function nestedFunction() {
  anotherFunction();
}

function anotherFunction() {
  deepestFunction();
}

function deepestFunction() {
  console.log("\n--- ネストされた呼び出し ---");
  normalLogger.info("通常のログ（スタックトレースなし）");
  shortStackLogger.info("短いスタックトレース付きログ");
  detailedStackLogger.info("詳細なスタックトレース付きログ");
}

// 一時的な設定を使用した呼び出し
function temporaryConfig() {
  console.log("\n--- 一時的な設定 ---");
  normalLogger.with({ showCaller: true }).info(
    "一時的にスタックトレースを有効化",
  );
  shortStackLogger.with({ detailedCaller: true }).info(
    "一時的に詳細なスタックトレースを有効化",
  );
  detailedStackLogger.with({ showCaller: false }).info(
    "一時的にスタックトレースを無効化",
  );
}

// 実行
directCall();
nestedFunction();
temporaryConfig();

// エラーログでのスタックトレース
console.log("\n--- エラーログでのスタックトレース ---");
try {
  throw new Error("テストエラー");
} catch (error) {
  normalLogger.error("エラーが発生しました", error);
  shortStackLogger.error("エラーが発生しました（スタックトレース付き）", error);
  detailedStackLogger.error(
    "エラーが発生しました（詳細なスタックトレース付き）",
    error,
  );
}
