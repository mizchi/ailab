// 色付きプレフィックスのデモ
import { createLogger } from "../mod.ts";

// 異なるタグを持つロガーを作成
const appLogger = createLogger("app");
const userLogger = createLogger("user");
const authLogger = createLogger("auth");
const dbLogger = createLogger("db");
const apiLogger = createLogger("api");
const cacheLogger = createLogger("cache");
const randomLogger = createLogger(""); // タグなし（ランダムな色）

// 各ロガーでメッセージを出力
console.log("\n異なるタグによる色分けのデモ:");
appLogger.info("アプリケーションが起動しました");
userLogger.info("ユーザーがログインしました");
authLogger.error("認証エラーが発生しました");
dbLogger.info("データベース接続が確立されました");
apiLogger.debug("APIリクエスト: GET /users");
cacheLogger.info("キャッシュがクリアされました");
randomLogger.info("タグなしのメッセージ（ランダムな色）");

// JSONオブジェクトを含むメッセージ
console.log("\nJSONオブジェクトを含むメッセージ:");
const user = {
  id: 1,
  name: "ずんだもん",
  email: "zunda@example.com",
  role: "admin",
  lastLogin: new Date(),
};

appLogger.info("ユーザー情報:", user);

// 複数行のメッセージ
console.log("\n複数行のメッセージ:");
appLogger.info(`
複数行のメッセージ例
これはプレフィックスのみに色が付き
残りのテキストは通常の色で表示されます。
タグ "app" に基づいた色が使われています。
`);

// 繰り返しメッセージ
console.log("\n繰り返しメッセージのグループ化:");
const repeatLogger = createLogger("repeat", { maxRepeat: 3 });
for (let i = 0; i < 5; i++) {
  repeatLogger.info("これは繰り返しメッセージです");
}
