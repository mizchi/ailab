/* @script */
/**
 * ripgrepを使って検索し、マッチしたファイル名だけを表示するスクリプト
 */

async function searchFiles(
  pattern: string,
  path = ".",
  options: string[] = [],
): Promise<string[]> {
  const cmd = ["rg", "-l", pattern, path, ...options];

  const process = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "piped",
    stderr: "piped",
  });

  const { stdout, stderr, success } = await process.output();

  if (!success) {
    const errorMessage = new TextDecoder().decode(stderr);
    console.error(`検索エラー: ${errorMessage}`);
    return [];
  }

  const output = new TextDecoder().decode(stdout);
  return output.trim().split("\n").filter(Boolean);
}

// メイン処理
if (import.meta.main) {
  const args = Deno.args;

  if (args.length < 1) {
    console.log(
      "使用法: deno run -A poc/search-files.ts <検索パターン> [検索パス] [追加オプション...]",
    );
    Deno.exit(1);
  }

  const pattern = args[0];
  const path = args[1] || ".";
  const options = args.slice(2);

  console.log(`"${pattern}" を ${path} で検索中...`);
  const files = await searchFiles(pattern, path, options);

  if (files.length === 0) {
    console.log("マッチするファイルが見つかりませんでした。");
  } else {
    console.log("\n--- マッチしたファイル ---");
    files.forEach((file) => console.log(file));
    console.log(`\n合計: ${files.length}件のファイルが見つかりました。`);
  }
}

/// test
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("searchFiles が正しい形式の結果を返すこと", async () => {
  // モック用の関数で実際のコマンド実行を上書き
  const originalCommand = Deno.Command;

  try {
    // Deno.Command をモックに置き換え
    // @ts-ignore モックのための型無視
    Deno.Command = class MockCommand {
      constructor() {
        /* do nothing */
      }

      async output() {
        return {
          success: true,
          stdout: new TextEncoder().encode("file1.ts\nfile2.ts\nfile3.ts"),
          stderr: new Uint8Array(0),
        };
      }
    };

    const result = await searchFiles("test");
    expect(result).toEqual(["file1.ts", "file2.ts", "file3.ts"]);
  } finally {
    // テスト後に元に戻す
    Deno.Command = originalCommand;
  }
});
