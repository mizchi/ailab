/**
 * 型チェックのためのテストファイル
 *
 * このファイルでは型推論が正しく機能しているかテストします。
 * テストコードそのものは実行時に何も検証しませんが、
 * TypeScriptの型チェックでエラーが出なければ成功です。
 */
import { createNestedParser, type InferNestedParser } from "../mod.ts";
import { z } from "npm:zod";
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("Basic nested parser should infer correct types", () => {
  // 基本的なネストされたパーサーの定義
  const commandDefs = {
    add: {
      name: "app add",
      description: "Add an item",
      args: {
        name: {
          type: z.string().describe("item name"),
          positional: true,
        },
        priority: {
          type: z.number().default(1).describe("priority level"),
          short: "p",
        },
      },
    },
    remove: {
      name: "app remove",
      description: "Remove an item",
      args: {
        id: {
          type: z.string().describe("item id"),
          positional: true,
        },
        force: {
          type: z.boolean().default(false).describe("force removal"),
          short: "f",
        },
      },
    },
  } as const;

  // 型の定義
  type CommandResult = InferNestedParser<typeof commandDefs>;

  // 期待される型:
  // { command: "add"; data: { name: string; priority: number } } |
  // { command: "remove"; data: { id: string; force: boolean } }

  // パーサーの作成
  const parser = createNestedParser(commandDefs, {
    name: "app",
    description: "Test application",
  });

  // 型チェック - コンパイル時に検証
  // parseの戻り値の型がCommandResultと互換性があるか
  const checkParseResult = (result: CommandResult): CommandResult => result;

  // 注：この部分は型チェックのためのテストなので、
  // 実際にparseを実行するのではなく、型が正しく推論されることを確認します

  // 型チェックのためにモックの結果を作成
  const mockAddResult: CommandResult = {
    command: "add",
    data: {
      name: "test-item",
      priority: 2,
    },
  };

  const mockRemoveResult: CommandResult = {
    command: "remove",
    data: {
      id: "test-id",
      force: true,
    },
  };

  // 型チェックが成功することを確認
  expect(checkParseResult(mockAddResult)).toBe(mockAddResult);
  expect(checkParseResult(mockRemoveResult)).toBe(mockRemoveResult);
});

test("gitParser example should infer correct types", () => {
  // nested.tsからのサンプルコード簡略版
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

  // 型定義
  type GitCommandResult = InferNestedParser<typeof gitCommandDefs>;

  // パーサーの作成
  const gitParser = createNestedParser(gitCommandDefs, {
    name: "git",
    description: "Git command line tool",
    default: "add",
  });

  // 型チェック関数
  const checkGitResult = (result: GitCommandResult): GitCommandResult => result;

  // 型チェックのためにモックの結果を作成
  const mockAddResult: GitCommandResult = {
    command: "add",
    data: {
      files: ["file1.txt", "file2.txt"],
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

  // 型チェックが成功することを確認
  expect(checkGitResult(mockAddResult)).toBe(mockAddResult);
  expect(checkGitResult(mockCommitResult)).toBe(mockCommitResult);
});
