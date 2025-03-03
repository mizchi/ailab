import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { z } from "npm:zod";
import { createNestedParser } from "../mod.ts";

/**
 * デフォルトコマンドと自動検出に関するテスト
 *
 * このテストは、gh-search.tsで使用されている以下のパターンを検証します：
 * - コマンドが明示的に指定されていない場合のデフォルトコマンドへの変換
 * - デフォルトコマンドと位置引数の組み合わせの処理
 * - 後方互換性のための特殊な引数処理
 */

// 基本的なデフォルトコマンド処理のテスト
test("デフォルトコマンドの処理", () => {
  // 2つのコマンドを持つ定義（1つをデフォルトに設定）
  const commandDefs = {
    search: {
      name: "search",
      description: "検索コマンド",
      args: {
        query: {
          type: z.string().describe("検索クエリ"),
          positional: 0,
        },
        limit: {
          type: z.number().default(10).describe("結果数の制限"),
          short: "l",
        },
      },
    },
    list: {
      name: "list",
      description: "一覧表示コマンド",
      args: {
        path: {
          type: z.string().describe("パス"),
          positional: 0,
        },
        format: {
          type: z.string().default("text").describe("出力フォーマット"),
          short: "f",
        },
      },
    },
  };

  const parser = createNestedParser(commandDefs, {
    name: "test-cmd",
    description: "テストコマンド",
    default: "search", // searchをデフォルトコマンドに設定
  });

  // 1. 明示的にコマンドを指定する場合
  {
    const result = parser.parse(["search", "keyword", "-l", "5"]);
    expect(result.command).toBe("search");

    // 型アサーションを使用
    if (result.command === "search") {
      const searchData = result.data as { query: string; limit: number };
      expect(searchData.query).toBe("keyword");
      expect(searchData.limit).toBe(5);
    }
  }

  // 2. コマンドを省略する場合（デフォルトコマンドが使用される）
  {
    const result = parser.parse(["keyword", "-l", "5"]);
    expect(result.command).toBe("search"); // searchがデフォルトコマンド

    // 型アサーションを使用
    if (result.command === "search") {
      const searchData = result.data as { query: string; limit: number };
      expect(searchData.query).toBe("keyword");
      expect(searchData.limit).toBe(5);
    }
  }

  // 3. 明示的に別のコマンドを指定する場合
  {
    const result = parser.parse(["list", "/path/to/dir", "-f", "json"]);
    expect(result.command).toBe("list");

    // 型アサーションを使用
    if (result.command === "list") {
      const listData = result.data as { path: string; format: string };
      expect(listData.path).toBe("/path/to/dir");
      expect(listData.format).toBe("json");
    }
  }
});

// gh-search.tsパターンのテスト
test("gh-search.tsパターン: コマンド自動検出", () => {
  // gh-search.tsの実装に近いサブコマンド定義
  const ghsCommands = {
    search: {
      name: "search",
      description: "リポジトリ内を検索",
      args: {
        repoUrl: {
          type: z.string().describe("リポジトリURL"),
          positional: 0,
        },
        pattern: {
          type: z.string().describe("検索パターン"),
          positional: 1,
        },
        branch: {
          type: z.string().optional().describe("ブランチを指定"),
          short: "b",
        },
      },
    },
    files: {
      name: "files",
      description: "ファイル一覧を表示",
      args: {
        repoUrl: {
          type: z.string().describe("リポジトリURL"),
          positional: 0,
        },
        branch: {
          type: z.string().optional().describe("ブランチを指定"),
          short: "b",
        },
      },
    },
    vacuum: {
      name: "vacuum",
      description: "古いリポジトリを削除",
      args: {},
    },
  };

  const parser = createNestedParser(ghsCommands, {
    name: "ghs",
    description: "GitHub検索ツール",
    default: "search",
  });

  // gh-search.tsの実装パターン:
  // コマンドが明示されておらず、かつ最初の引数がcommandでなければsearchとみなす処理

  // 1. 明示的なコマンド指定
  {
    const result = parser.parse(["search", "github/repo", "pattern"]);
    expect(result.command).toBe("search");

    if (result.command === "search") {
      const data = result.data as {
        repoUrl: string;
        pattern: string;
      };

      expect(data.repoUrl).toBe("github/repo");
      expect(data.pattern).toBe("pattern");
    }
  }

  // 2. コマンドを省略（デフォルトが使用される）
  {
    const result = parser.parse(["github/repo", "pattern"]);
    expect(result.command).toBe("search"); // searchがデフォルトになる

    if (result.command === "search") {
      const data = result.data as {
        repoUrl: string;
        pattern: string;
      };

      expect(data.repoUrl).toBe("github/repo");
      expect(data.pattern).toBe("pattern");
    }
  }

  // 3. 別のコマンドを明示的に指定
  {
    const result = parser.parse(["files", "github/repo"]);
    expect(result.command).toBe("files");

    if (result.command === "files") {
      const data = result.data as {
        repoUrl: string;
      };

      expect(data.repoUrl).toBe("github/repo");
    }
  }

  // 4. 引数なしのコマンド
  {
    const result = parser.parse(["vacuum"]);
    expect(result.command).toBe("vacuum");
  }
});

// 後方互換性のための特殊処理テスト
test("後方互換性のための特殊処理", () => {
  // gh-search.tsのような特殊な後方互換性処理を検証
  const ghsCommands = {
    search: {
      name: "search",
      description: "リポジトリ内を検索",
      args: {
        repoUrl: {
          type: z.string().describe("リポジトリURL"),
          positional: 0,
        },
        pattern: {
          type: z.string().describe("検索パターン"),
          positional: 1,
        },
        listFiles: {
          type: z.boolean().default(false).describe("ファイル一覧を表示"),
          short: "l",
        },
      },
    },
    files: {
      name: "files",
      description: "ファイル一覧を表示",
      args: {
        repoUrl: {
          type: z.string().describe("リポジトリURL"),
          positional: 0,
        },
      },
    },
  };

  const parser = createNestedParser(ghsCommands, {
    name: "ghs",
    description: "GitHub検索ツール",
    default: "search",
  });

  // gh-search.tsでは、--list-filesオプションがあったら
  // search コマンドを files コマンドに変換する処理がある。
  // そのような特殊処理を検証するテスト

  // 1. 明示的なsearchコマンドで--list-filesオプションあり
  const searchArgs = ["search", "github/repo", "pattern", "--listFiles"];
  const searchResult = parser.parse(searchArgs);

  expect(searchResult.command).toBe("search");

  if (searchResult.command === "search") {
    const data = searchResult.data as {
      repoUrl: string;
      pattern: string;
      listFiles: boolean;
    };

    expect(data.repoUrl).toBe("github/repo");
    expect(data.pattern).toBe("pattern");
    expect(data.listFiles).toBe(true);

    // gh-search.tsでは、ここで以下のような変換が行われる：
    // return { command: "files", data: result.data };
  }

  // 2. コマンド省略時の--list-filesオプション
  const implicitArgs = ["github/repo", "pattern", "--listFiles"];
  const implicitResult = parser.parse(implicitArgs);

  expect(implicitResult.command).toBe("search"); // デフォルトコマンド

  if (implicitResult.command === "search") {
    const data = implicitResult.data as {
      repoUrl: string;
      pattern: string;
      listFiles: boolean;
    };

    expect(data.repoUrl).toBe("github/repo");
    expect(data.pattern).toBe("pattern");
    expect(data.listFiles).toBe(true);

    // gh-search.tsでは、ここで以下のような変換が行われる：
    // return { command: "files", data: result.data };
  }
});

// ヘルプフラグの特殊処理テスト
test("ヘルプフラグの処理", () => {
  const commandDefs = {
    run: {
      name: "run",
      description: "コマンド実行",
      args: {
        script: {
          type: z.string().describe("スクリプト名"),
          positional: 0,
        },
      },
    },
    build: {
      name: "build",
      description: "ビルド実行",
      args: {
        target: {
          type: z.string().describe("ビルドターゲット"),
          positional: 0,
        },
      },
    },
  };

  const parser = createNestedParser(commandDefs, {
    name: "tool",
    description: "CLIツール",
    default: "run",
  });

  // 1. 引数なしの場合（ヘルプが表示されるべき）
  try {
    parser.parse([]);
    // ここには到達しないはず（ヘルプ表示でエラーになる）
    expect(true).toBe(false);
  } catch (error: unknown) {
    expect(error instanceof Error).toBe(true);
    if (error instanceof Error) {
      expect(error.message).toContain("Help requested");
    }
  }

  // 2. --helpフラグの場合
  try {
    parser.parse(["--help"]);
    // ここには到達しないはず（ヘルプ表示でエラーになる）
    expect(true).toBe(false);
  } catch (error: unknown) {
    expect(error instanceof Error).toBe(true);
    if (error instanceof Error) {
      expect(error.message).toContain("Help requested");
    }
  }

  // 3. -hフラグの場合
  try {
    parser.parse(["-h"]);
    // ここには到達しないはず（ヘルプ表示でエラーになる）
    expect(true).toBe(false);
  } catch (error: unknown) {
    expect(error instanceof Error).toBe(true);
    if (error instanceof Error) {
      expect(error.message).toContain("Help requested");
    }
  }

  // 4. コマンド指定後の--helpフラグ
  try {
    parser.parse(["run", "--help"]);
    // ここには到達しないはず（ヘルプ表示でエラーになる）
    expect(true).toBe(false);
  } catch (error: unknown) {
    expect(error instanceof Error).toBe(true);
    if (error instanceof Error) {
      expect(error.message).toContain("Help requested");
    }
  }
});
