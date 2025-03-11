// ログレベルの設定例
// 実行方法: LOG=debug deno run -A examples/log-level-example.ts

import { createLogger, LogLevel } from "../mod.ts";

// 環境変数からログレベルを取得（デフォルトはerror）
console.log(`現在のログレベル: ${Deno.env.get("LOG") ?? "error"}`);

// 基本的なロガーを作成
const logger = createLogger("main");

// 各レベルでログを出力
logger.debug("これはデバッグメッセージです"); // 最も低いレベル
logger.info("これは情報メッセージです");
logger.log("これは通常のログメッセージです");
logger.warn("これは警告メッセージです");
logger.error("これはエラーメッセージです"); // 最も高いレベル

// 明示的にログレベルを設定したロガー
const verboseLogger = createLogger("verbose", { logLevel: LogLevel.DEBUG });
verboseLogger.debug("このデバッグメッセージは常に表示されます");

// ログレベルを変更するには環境変数を設定します:
// LOG=debug deno run -A examples/log-level-example.ts
// LOG=info deno run -A examples/log-level-example.ts
// LOG=log deno run -A examples/log-level-example.ts
// LOG=warn deno run -A examples/log-level-example.ts
// LOG=error deno run -A examples/log-level-example.ts
