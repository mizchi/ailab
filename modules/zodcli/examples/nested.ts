#!/usr/bin/env -S deno run -A
/**
 * zodcli 新しいインターフェースの使用例
 */
import {
  createNestedParser,
  type InferArgs,
  type InferNestedParser,
  type InferParser,
  isHelp,
} from "../mod.ts";
import { z } from "npm:zod";

// サブコマンドパーサーの定義例

// git addコマンドのスキーマ定義
const gitAddSchema = {
  name: "git add",
  description: "Add files to git staging",
  args: {
    files: {
      type: z.string().array().describe("files to add"),
      positional: "...",
    },
    all: {
      type: z.boolean().default(false).describe("add all files"),
      short: "a",
    },
  },
} as const;

// InferArgsを使ってgit addコマンドの引数の型を推論
type GitAddArgs = InferArgs<typeof gitAddSchema.args.files.type>; // string[]

// gitコマンドのサブコマンド定義
const gitCommandDefs = {
  add: gitAddSchema,
  commit: {
    name: "git commit",
    description: "Commit staged changes",
    args: {
      message: {
        type: z.string().describe("commit message"),
        positional: true,
      },
      amend: {
        type: z.boolean().default(false).describe("amend previous commit"),
        short: "a",
      },
    },
  },
} as const;

// サブコマンドパーサーの作成（新しいインターフェース）
const gitParser = createNestedParser(gitCommandDefs, {
  name: "git",
  description: "Git command line tool",
  default: "add", // addをデフォルトコマンドに設定
});

// InferNestedParserを使ってサブコマンドの型を正確に推論
type GitCommandResult = InferNestedParser<typeof gitCommandDefs>;

// 型チェックのための関数
function assertType<T>(value: T): T {
  return value;
}

// 動作確認
const mockAddResult: GitCommandResult = {
  command: "add",
  data: {
    files: ["file1.txt"],
    all: true,
  },
};

const mockCommitResult: GitCommandResult = {
  command: "commit",
  data: {
    message: "Initial commit",
    amend: false,
  },
};

// 型チェック - compile時に検証
const checkResult = assertType<GitCommandResult>(mockAddResult);

// gitParser.parseの型推論を確認
function testParseTypeInference() {
  // gitParser.parseが正しい型を返すことを確認
  const parseResult = gitParser.parse([
    "add",
    "file1.txt",
    "file2.txt",
    "--all",
  ]);

  // 型推論が正しく動作していることを確認
  // 型を明示的に指定した場合と、parseの戻り値の型が一致するかをチェック
  const typeCheck: GitCommandResult = parseResult;

  // 正しい型推論が行われていることを確認
  const typedResult = assertType<GitCommandResult>(parseResult);

  if (typedResult.command === "add") {
    // filesとallプロパティにアクセスできる
    console.log(typedResult.data.files, typedResult.data.all);
  } else if (typedResult.command === "commit") {
    // messageとamendプロパティにアクセスできる
    console.log(typedResult.data.message, typedResult.data.amend);
  }
}

if (import.meta.main) {
  // ----- isHelp関数のサブコマンドでの使用例 -----
  console.log("\n1. NestedParserでのisHelp関数の使用例:");

  const args = Deno.args.length > 0 ? Deno.args : ["--help"]; // 引数がない場合は--helpを使用

  // isHelp関数を使ってヘルプフラグをチェック
  if (isHelp(args)) {
    console.log("ヘルプフラグが検出されました。ヘルプを表示して終了します。");
    console.log("-".repeat(50));
    console.log(gitParser.help());
    console.log("-".repeat(50));
    console.log(
      "プログラムを終了します (isHelpデモのため実際には終了しません)",
    );
    // 実際のアプリケーションではここでDeno.exit(0)を呼び出します
  } else {
    console.log("ヘルプフラグは検出されませんでした。処理を続行します。");
  }

  // サブコマンドパーサーのデモ
  console.log("\n2. サブコマンドパーサーの使用例:");
  try {
    const mockSubArgs = ["add", "file1.txt", "file2.txt", "--all"];
    console.log(`  コマンド: ${mockSubArgs.join(" ")}`);

    // 引数のパース
    const { command, data } = gitParser.parse(mockSubArgs);
    console.log(`  サブコマンド [${command}] パース成功!`);

    // 型安全な分岐処理
    if (command === "add") {
      console.log(
        `  ファイル: ${data.files.join(", ")}, 全ファイル追加: ${data.all}`,
      );
    } else if (command === "commit") {
      console.log(`  メッセージ: ${data.message}, アメンド: ${data.amend}`);
    }
  } catch (error) {
    console.error(
      "  パースエラー:",
      error instanceof Error ? error.message : String(error),
    );
  }

  // デフォルトコマンドのデモ
  console.log("\n3. デフォルトコマンドの使用例:");
  try {
    // サブコマンドを省略して直接引数を渡す
    const mockDefaultArgs = ["file1.txt", "file2.txt", "--all"];
    console.log(`  引数: ${mockDefaultArgs.join(" ")}`);
    console.log(
      `  (サブコマンドなしで実行。デフォルトは '${gitParser.defaultCommand}')`,
    );

    // 引数のパース - サブコマンドが省略されているがデフォルトが使用される
    const { command, data } = gitParser.parse(mockDefaultArgs);
    console.log(`  サブコマンド [${command}] が使用されました!`);

    // データの表示
    if (command === "add") {
      console.log(
        `  ファイル: ${data.files.join(", ")}, 全ファイル追加: ${data.all}`,
      );
    }
  } catch (error) {
    console.error(
      "  パースエラー:",
      error instanceof Error ? error.message : String(error),
    );
  }

  // サブコマンドパーサーのsafeParseデモ
  console.log("\n4. サブコマンドパーサーのsafeParse使用例:");
  const mockSubArgs2 = ["unknown-command"];
  console.log(`  コマンド: ${mockSubArgs2.join(" ")}`);

  const subResult = gitParser.safeParse(mockSubArgs2);

  if (subResult.ok) {
    console.log(`  サブコマンド [${subResult.data.command}] パース成功!`);
    console.log("  データ:", subResult.data.data);
  } else {
    console.error("  パースエラー:", subResult.error.message);
  }

  // サブコマンドのヘルプ表示例
  console.log("\n5. 特定のサブコマンドのヘルプ表示例:");
  try {
    // add --helpのパース
    const mockHelpArgs = ["add", "--help"];
    console.log(`  コマンド: ${mockHelpArgs.join(" ")}`);
    gitParser.parse(mockHelpArgs);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Help requested")) {
      console.log("  add コマンドのヘルプが要求されました");
      console.log("-".repeat(50));
      // 実際のアプリケーションでは該当するサブコマンドのヘルプだけを表示
      console.log(gitParser.help());
      console.log("-".repeat(50));
    } else {
      console.error(
        "  予期しないエラー:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // 利用可能なコマンド一覧表示
  console.log("\n6. 利用可能なコマンド一覧:");
  console.log(`  コマンド名: ${Array.from(gitParser.commandNames).join(", ")}`);
  console.log(`  デフォルトコマンド: ${gitParser.defaultCommand || "なし"}`);
}
