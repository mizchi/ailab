// 型付きトピックロガーの例
// 実行方法: LOG=debug deno run -A examples/typed-topic-example.ts

import { createLogger, LogLevel } from "../mod.ts";

// 環境変数からログレベルを取得（デフォルトはerror）
console.log(`現在のログレベル: ${Deno.env.get("LOG") ?? "error"}`);

// 基本的なロガーを作成（showTopicsをtrueに設定）
const logger = createLogger("app", {
  showTopics: true,
  logLevel: LogLevel.DEBUG, // デバッグレベルに設定
});

// 型定義
interface UserData {
  id: number;
  name: string;
  role: string;
  lastLogin: Date;
}

interface ApiResponse {
  status: number;
  message: string;
  data: unknown;
}

// 型付きトピックロガーを作成
const userLogger = logger.topic<UserData>("user");
const apiLogger = logger.topic<ApiResponse>("api");

// 型付きデータでログを出力
userLogger.info("ユーザーがログインしました", {
  id: 1001,
  name: "ずんだもん",
  role: "admin",
  lastLogin: new Date(),
});

userLogger.warn("ユーザーの権限が変更されました", {
  id: 1001,
  name: "ずんだもん",
  role: "user", // adminからuserに変更
  lastLogin: new Date(),
});

// 型チェックが効くため、以下はコンパイルエラーになる
// userLogger.info("不正なデータ", { id: "string" }); // idはnumberであるべき

// APIレスポンスのログ
apiLogger.info("APIリクエスト成功", {
  status: 200,
  message: "OK",
  data: { items: [1, 2, 3] },
});

apiLogger.error("APIリクエスト失敗", {
  status: 404,
  message: "Not Found",
  data: null,
});

// 通常のトピックロガーとの比較
const normalLogger = logger.custom("normal");
normalLogger.info("これは通常のトピックロガーです", { anyData: true });

console.log("\n型付きトピックロガーは、型安全なログ出力を提供します。");
console.log("また、トピックの表示形式が [app:topic] になっています。");
