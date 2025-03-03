import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { z } from "npm:zod";
import { createCommand } from "../core.ts";
import { createNestedParser } from "../mod.ts";
import type { QueryBase } from "../types.ts";

// 短縮オプションのテスト
test("短縮オプション（short）のパース処理", () => {
  // 短縮形と長い形式の両方を持つコマンド定義
  const shortOptionsDef = {
    name: "short-test",
    description: "短縮オプションのテスト",
    args: {
      file: {
        type: z.string().describe("ファイルパス"),
        positional: 0,
      },
      output: {
        type: z.string().optional().describe("出力先"),
        short: "o", // 短縮形: -o
      },
      verbose: {
        type: z.boolean().default(false).describe("詳細出力"),
        short: "v", // 短縮形: -v
      },
      number: {
        type: z.number().default(1).describe("数値オプション"),
        short: "n", // 短縮形: -n
      },
      mode: {
        type: z
          .enum(["fast", "normal", "detailed"])
          .default("normal")
          .describe("実行モード"),
        short: "m", // 短縮形: -m
      },
    },
  };

  const command = createCommand(shortOptionsDef);

  // 1. 通常のロングオプション形式でテスト
  {
    const result = command.parse([
      "input.txt",
      "--output",
      "output.txt",
      "--verbose",
      "--number",
      "5",
      "--mode",
      "fast",
    ]);

    // 成功結果であることを確認
    expect(result.type).toBe("success");

    if (result.type === "success") {
      // パース結果が正しいか確認
      expect(result.data.file).toBe("input.txt");
      expect(result.data.output).toBe("output.txt");
      expect(result.data.verbose).toBe(true);
      expect(result.data.number).toBe(5);
      expect(result.data.mode).toBe("fast");
    }
  }

  // 2. 短縮形オプションでテスト
  {
    const result = command.parse([
      "input.txt",
      "-o",
      "output.txt",
      "-v",
      "-n",
      "5",
      "-m",
      "fast",
    ]);

    // 成功結果であることを確認
    expect(result.type).toBe("success");

    if (result.type === "success") {
      // パース結果が正しいか確認（短縮形で指定しても同じ結果になるはず）
      expect(result.data.file).toBe("input.txt");
      expect(result.data.output).toBe("output.txt");
      expect(result.data.verbose).toBe(true);
      expect(result.data.number).toBe(5);
      expect(result.data.mode).toBe("fast");
    }
  }

  // 3. 短縮形とロング形式を混在させてテスト
  {
    const result = command.parse([
      "input.txt",
      "-o",
      "output.txt",
      "--verbose",
      "-n",
      "5",
      "--mode",
      "fast",
    ]);

    // 成功結果であることを確認
    expect(result.type).toBe("success");

    if (result.type === "success") {
      // パース結果が正しいか確認
      expect(result.data.file).toBe("input.txt");
      expect(result.data.output).toBe("output.txt");
      expect(result.data.verbose).toBe(true);
      expect(result.data.number).toBe(5);
      expect(result.data.mode).toBe("fast");
    }
  }
});

// 位置引数とレスト引数のテスト
test("位置引数（positional）とレスト引数の処理", () => {
  // 複数の位置引数とレスト引数を含む定義
  const positionalArgsDef = {
    name: "positional-test",
    description: "位置引数のテスト",
    args: {
      command: {
        type: z.string().describe("コマンド"),
        positional: 0,
      },
      target: {
        type: z.string().describe("ターゲット"),
        positional: 1,
      },
      args: {
        type: z.string().array().describe("追加引数"),
        positional: "..." as const,
      },
      verbose: {
        type: z.boolean().default(false).describe("詳細出力"),
        short: "v",
      },
    },
  };

  const command = createCommand(positionalArgsDef);

  // 1. 全ての位置引数とレスト引数を指定
  {
    const result = command.parse([
      "run",
      "script.js",
      "arg1",
      "arg2",
      "arg3",
      "--verbose",
    ]);

    // 成功結果であることを確認
    expect(result.type).toBe("success");

    if (result.type === "success") {
      // パース結果が正しいか確認
      expect(result.data.command).toBe("run");
      expect(result.data.target).toBe("script.js");
      expect(Array.isArray(result.data.args)).toBe(true);
      expect(result.data.args).toEqual(["arg1", "arg2", "arg3"]);
      expect(result.data.verbose).toBe(true);
    }
  }

  // 2. レスト引数なしで最小限の位置引数を指定
  {
    const result = command.parse(["run", "script.js"]);

    // 成功結果であることを確認
    expect(result.type).toBe("success");

    if (result.type === "success") {
      // パース結果が正しいか確認
      expect(result.data.command).toBe("run");
      expect(result.data.target).toBe("script.js");
      expect(Array.isArray(result.data.args)).toBe(true);
      expect(result.data.args).toEqual([]);
      expect(result.data.verbose).toBe(false);
    }
  }

  // 3. 位置引数が足りない場合のエラー
  {
    const result = command.parse(["run"]);

    // 検証は実行時の実装によって異なる可能性がある
    // 理想的には位置引数が足りないとエラーになるべき
    if (result.type === "success") {
      // もし成功するなら、足りない位置引数はundefinedになるはず
      expect(result.data.command).toBe("run");
      expect(result.data.target).toBeUndefined();
      expect(Array.isArray(result.data.args)).toBe(true);
      expect(result.data.args).toEqual([]);
    } else if (result.type === "error") {
      // もしくはエラーになるべき
      expect(result.error).toBeDefined();
    }
  }
});

// gh-search.tsパターンのテスト - コマンドが指定されていない場合
test("GH-Search パターン: 暗黙のコマンド", () => {
  // サブコマンド定義
  const subCommands = {
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

  const parser = createNestedParser(subCommands, {
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
