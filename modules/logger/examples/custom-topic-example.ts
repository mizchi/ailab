// カスタムトピック機能の例
// 実行方法: LOG=info deno run -A examples/custom-topic-example.ts

import { createLogger, type LogLevel } from "../mod.ts";

// 環境変数からログレベルを取得（デフォルトはerror）
console.log(`現在のログレベル: ${Deno.env.get("LOG") ?? "error"}`);

// showTopics を true に設定してロガーを作成
const logger = createLogger("app", {
  showTopics: true,
  // logLevel: LogLevel.INFO  // 環境変数が設定されていない場合は明示的に設定することもできます
});

// メインロガーでログを出力
logger.info("アプリケーションを起動しています");

// カスタムトピックロガーを作成
const dbLogger = logger.custom("database");
const apiLogger = logger.custom("api");
const uiLogger = logger.custom("ui");

// 各トピックでログを出力
dbLogger.info("データベースに接続しています");
dbLogger.error("データベース接続エラー: タイムアウト");

apiLogger.warn("APIレート制限に近づいています");
apiLogger.log("APIリクエスト: GET /users");

uiLogger.debug("UIコンポーネントをレンダリングしています");
uiLogger.info("ユーザーがログインしました");

// 注意: カスタムトピックの表示形式が [app] [database] から [app:database] に変更されました
console.log("\nカスタムトピックの表示形式が [app:database] になりました");

// カスタムトピックは LOG 環境変数が設定されている場合、
// または createLogger で showTopics: true を設定した場合のみ表示されます
console.log("\n環境変数を設定して実行してみてください:");
console.log("LOG=debug deno run -A examples/custom-topic-example.ts");
console.log("LOG=info deno run -A examples/custom-topic-example.ts");
