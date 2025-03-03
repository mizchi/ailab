import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { z } from "npm:zod";
import { createCommand } from "../core.ts";
import { createNestedParser } from "../mod.ts";
import type { QueryBase } from "../types.ts";

/**
 * 短縮オプション（short）の処理に関する詳細テスト
 *
 * このテストでは、gh-search.tsで使用されているパターンに特化して、
 * 短縮オプションの処理が正しく行われることを確認します。
 */

// 基本的な短縮オプションのテスト
test("基本的な短縮オプションのパース", () => {
  // gh-search.tsの一部に似た定義
  const commandDef = {
    name: "search",
    description: "リポジトリ検索",
    args: {
      repoUrl: {
        type: z.string().describe("リポジトリURL"),
        positional: 0,
      },
      branch: {
        type: z.string().optional().describe("ブランチ"),
        short: "b",
      },
      verbose: {
        type: z.boolean().default(false).describe("詳細出力"),
        short: "v",
      },
      maxCount: {
        type: z.number().default(10).describe("最大件数"),
        short: "m",
      },
    },
  };

  const command = createCommand(commandDef);

  // 1. 長いオプション名でパース
  {
    const result = command.parse([
      "github/repo",
      "--branch",
      "main",
      "--verbose",
      "--maxCount",
      "5",
    ]);

    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data.repoUrl).toBe("github/repo");
      expect(result.data.branch).toBe("main");
      expect(result.data.verbose).toBe(true);
      expect(result.data.maxCount).toBe(5);
    }
  }

  // 2. 短いオプション名でパース
  {
    const result = command.parse([
      "github/repo",
      "-b",
      "main",
      "-v",
      "-m",
      "5",
    ]);

    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data.repoUrl).toBe("github/repo");
      expect(result.data.branch).toBe("main");
      expect(result.data.verbose).toBe(true);
      expect(result.data.maxCount).toBe(5);
    }
  }

  // 3. 混合オプション名でパース
  {
    const result = command.parse([
      "github/repo",
      "-b",
      "main",
      "--verbose",
      "-m",
      "5",
    ]);

    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data.repoUrl).toBe("github/repo");
      expect(result.data.branch).toBe("main");
      expect(result.data.verbose).toBe(true);
      expect(result.data.maxCount).toBe(5);
    }
  }
});

// ネストされたコマンドでの短縮オプションのテスト
test("ネストされたコマンドでの短縮オプション", () => {
  // gh-search.tsの実際のパターンに近いサブコマンド定義
  const subCommandDefs = {
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
          type: z.string().optional().describe("ブランチ"),
          short: "b",
        },
        files: {
          type: z.boolean().default(false).describe("ファイル名のみ表示"),
          short: "f",
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
          type: z.string().optional().describe("ブランチ"),
          short: "b",
        },
        glob: {
          type: z.string().optional().describe("ファイルパターン"),
          short: "g",
        },
      },
    },
  };

  const parser = createNestedParser(subCommandDefs, {
    name: "ghs",
    description: "GitHub検索ツール",
    default: "search",
  });

  // 1. 明示的なコマンド指定で短縮オプション
  {
    const result = parser.parse([
      "search",
      "github/repo",
      "pattern",
      "-b",
      "main",
      "-f",
    ]);

    expect(result.command).toBe("search");

    if (result.command === "search") {
      const data = result.data as {
        repoUrl: string;
        pattern: string;
        branch?: string;
        files: boolean;
      };

      expect(data.repoUrl).toBe("github/repo");
      expect(data.pattern).toBe("pattern");
      expect(data.branch).toBe("main");
      expect(data.files).toBe(true);
    }
  }

  // 2. デフォルトコマンドで短縮オプション
  {
    const result = parser.parse([
      "github/repo",
      "pattern",
      "-b",
      "main",
      "-f",
    ]);

    expect(result.command).toBe("search"); // デフォルトコマンド

    if (result.command === "search") {
      const data = result.data as {
        repoUrl: string;
        pattern: string;
        branch?: string;
        files: boolean;
      };

      expect(data.repoUrl).toBe("github/repo");
      expect(data.pattern).toBe("pattern");
      expect(data.branch).toBe("main");
      expect(data.files).toBe(true);
    }
  }

  // 3. 別のコマンドで短縮オプション
  {
    const result = parser.parse([
      "files",
      "github/repo",
      "-b",
      "dev",
      "-g",
      "*.ts",
    ]);

    expect(result.command).toBe("files");

    if (result.command === "files") {
      const data = result.data as {
        repoUrl: string;
        branch?: string;
        glob?: string;
      };

      expect(data.repoUrl).toBe("github/repo");
      expect(data.branch).toBe("dev");
      expect(data.glob).toBe("*.ts");
    }
  }
});

// ブーリアンオプションの特殊処理テスト
test("ブーリアンオプションの短縮形式", () => {
  const booleanOptionsDef = {
    name: "boolean-test",
    description: "ブーリアンオプションのテスト",
    args: {
      source: {
        type: z.string().describe("ソースパス"),
        positional: 0,
      },
      verbose: {
        type: z.boolean().default(false).describe("詳細出力"),
        short: "v",
      },
      force: {
        type: z.boolean().default(false).describe("強制実行"),
        short: "f",
      },
      quiet: {
        type: z.boolean().default(false).describe("出力抑制"),
        short: "q",
      },
    },
  };

  const command = createCommand(booleanOptionsDef);

  // 1. 長い形式でブーリアンオプション
  {
    const result = command.parse([
      "path/to/source",
      "--verbose",
      "--force",
    ]);

    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data.source).toBe("path/to/source");
      expect(result.data.verbose).toBe(true);
      expect(result.data.force).toBe(true);
      expect(result.data.quiet).toBe(false);
    }
  }

  // 2. 短い形式でブーリアンオプション
  {
    const result = command.parse([
      "path/to/source",
      "-v",
      "-f",
    ]);

    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data.source).toBe("path/to/source");
      expect(result.data.verbose).toBe(true);
      expect(result.data.force).toBe(true);
      expect(result.data.quiet).toBe(false);
    }
  }

  // 3. 混合形式でブーリアンオプション
  {
    const result = command.parse([
      "path/to/source",
      "-v",
      "--force",
      "-q",
    ]);

    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data.source).toBe("path/to/source");
      expect(result.data.verbose).toBe(true);
      expect(result.data.force).toBe(true);
      expect(result.data.quiet).toBe(true);
    }
  }
});

// オプショナル引数とデフォルト値の短縮形式テスト
test("オプショナル引数とデフォルト値の短縮形式", () => {
  const optionalArgsDef = {
    name: "optional-test",
    description: "オプショナル引数のテスト",
    args: {
      input: {
        type: z.string().describe("入力ファイル"),
        positional: 0,
      },
      output: {
        type: z.string().optional().describe("出力ファイル"),
        short: "o",
      },
      format: {
        type: z.enum(["json", "text", "csv"]).default("json").describe(
          "出力形式",
        ),
        short: "f",
      },
      count: {
        type: z.number().default(10).describe("件数"),
        short: "c",
      },
    },
  };

  const command = createCommand(optionalArgsDef);

  // 1. すべてのオプションを指定
  {
    const result = command.parse([
      "input.txt",
      "-o",
      "output.txt",
      "-f",
      "csv",
      "-c",
      "5",
    ]);

    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data.input).toBe("input.txt");
      expect(result.data.output).toBe("output.txt");
      expect(result.data.format).toBe("csv");
      expect(result.data.count).toBe(5);
    }
  }

  // 2. オプショナル引数を省略
  {
    const result = command.parse([
      "input.txt",
      "-f",
      "text",
    ]);

    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data.input).toBe("input.txt");
      expect(result.data.output).toBeUndefined();
      expect(result.data.format).toBe("text");
      expect(result.data.count).toBe(10); // デフォルト値
    }
  }

  // 3. 全てのオプションを省略（デフォルト値が使用される）
  {
    const result = command.parse([
      "input.txt",
    ]);

    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data.input).toBe("input.txt");
      expect(result.data.output).toBeUndefined();
      expect(result.data.format).toBe("json"); // デフォルト値
      expect(result.data.count).toBe(10); // デフォルト値
    }
  }
});

// gh-search.tsの実際のパターンを模したテスト
test("gh-search.tsパターンの短縮形式サポート", () => {
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
        files: {
          type: z.boolean().default(false).describe("ファイル名のみ表示"),
          short: "f",
        },
        ignoreCase: {
          type: z.boolean().default(false).describe("大文字小文字を区別しない"),
          short: "i",
        },
        maxCount: {
          type: z.number().default(5).describe("最大件数"),
          short: "m",
        },
        context: {
          type: z.number().optional().describe("表示する前後の行数"),
          short: "C",
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
        glob: {
          type: z.string().optional().describe("ファイルパターン"),
          short: "g",
        },
        temp: {
          type: z.boolean().default(false).describe("一時ディレクトリを使用"),
          short: "t",
        },
      },
    },
  };

  const parser = createNestedParser(ghsCommands, {
    name: "ghs",
    description: "GitHub検索ツール",
    default: "search",
  });

  // 1. 複数の短縮オプションを使用
  {
    const result = parser.parse([
      "search",
      "github/repo",
      "console.log",
      "-b",
      "main",
      "-f",
      "-i",
      "-m",
      "10",
      "-C",
      "2",
    ]);

    expect(result.command).toBe("search");

    if (result.command === "search") {
      const data = result.data as {
        repoUrl: string;
        pattern: string;
        branch?: string;
        files: boolean;
        ignoreCase: boolean;
        maxCount: number;
        context?: number;
      };

      expect(data.repoUrl).toBe("github/repo");
      expect(data.pattern).toBe("console.log");
      expect(data.branch).toBe("main");
      expect(data.files).toBe(true);
      expect(data.ignoreCase).toBe(true);
      expect(data.maxCount).toBe(10);
      expect(data.context).toBe(2);
    }
  }

  // 2. コマンド省略時のデフォルトコマンドで短縮オプション
  {
    const result = parser.parse([
      "github/repo",
      "console.log",
      "-b",
      "main",
      "-f",
      "-i",
    ]);

    expect(result.command).toBe("search"); // デフォルトコマンドが使用される

    if (result.command === "search") {
      const data = result.data as {
        repoUrl: string;
        pattern: string;
        branch?: string;
        files: boolean;
        ignoreCase: boolean;
      };

      expect(data.repoUrl).toBe("github/repo");
      expect(data.pattern).toBe("console.log");
      expect(data.branch).toBe("main");
      expect(data.files).toBe(true);
      expect(data.ignoreCase).toBe(true);
    }
  }

  // 3. 別のコマンドを明示的に指定
  {
    const result = parser.parse([
      "files",
      "github/repo",
      "-b",
      "dev",
      "-g",
      "*.ts",
      "-t",
    ]);

    expect(result.command).toBe("files");

    if (result.command === "files") {
      const data = result.data as {
        repoUrl: string;
        branch?: string;
        glob?: string;
        temp: boolean;
      };

      expect(data.repoUrl).toBe("github/repo");
      expect(data.branch).toBe("dev");
      expect(data.glob).toBe("*.ts");
      expect(data.temp).toBe(true);
    }
  }
});
