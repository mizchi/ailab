import type { z } from "npm:zod";

// 基本的なクエリ定義型
export type QueryBase<ArgType extends z.ZodTypeAny> = {
  type: ArgType;
  positional?: number | "...";
  short?: string;
  description?: string;
};

// 引数の型を抽出するヘルパー型
export type InferZodType<T extends z.ZodTypeAny> = z.infer<T>;
export type InferQueryType<T extends Record<string, QueryBase<any>>> = {
  [K in keyof T]: InferZodType<T[K]["type"]>;
};

/**
 * Zodスキーマから引数オブジェクトの型を推論します
 * @example
 * const schema = z.object({ name: z.string(), age: z.number() });
 * type Args = InferArgs<typeof schema>; // { name: string, age: number }
 */
export type InferArgs<Schema extends z.ZodTypeAny> = z.infer<Schema>;

/**
 * パーサーオブジェクトから返される型を推論します
 * @example
 * const parser = createParser({...});
 * type ParsedResult = InferParser<typeof parser>; // パースした結果の型
 */
export type InferParser<P extends { parse: (args: string[]) => any }> =
  P extends { parse: (args: string[]) => infer R } ? R : never;

/**
 * NestedParserの結果の型を推論します。各サブコマンドとそのデータの型を正確に推論します。
 * この型はサブコマンドオブジェクト定義から直接型を推論します。
 * @example
 * const subCommands = {
 *   add: { args: { files: { type: z.string().array() } } },
 *   commit: { args: { message: { type: z.string() } } }
 * };
 * type GitResult = InferNestedParser<typeof subCommands>;
 * // { command: "add"; data: { files: string[] } } | { command: "commit"; data: { message: string } }
 */
export type InferNestedParser<T extends Record<string, CommandSchema<any>>> = {
  [K in keyof T]: {
    command: K extends string ? K : never;
    data: InferQueryType<T[K]["args"]>;
  };
}[keyof T];

// コマンド定義型
export type CommandSchema<T extends Record<string, QueryBase<any>>> = {
  name: string;
  description: string;
  args: T;
};

// ネストコマンド定義型
export type NestedCommandMap = Record<string, CommandSchema<any>>;

// ネストされたコマンドのオプション
export interface NestedCommandOptions {
  name: string;
  description?: string;
  default?: string;
}

// 実行結果の型定義
export type CommandResult<T> =
  | { type: "success"; data: T }
  | { type: "help"; helpText: string }
  | { type: "error"; error: Error | z.ZodError; helpText: string };

export type NestedCommandResult =
  | { type: "subcommand"; name: string; result: CommandResult<any> }
  | { type: "help"; helpText: string }
  | { type: "error"; error: Error; helpText: string };

// Node.jsのparseArgsと互換性のある型定義
export interface ParseArgsOptionConfig {
  type: "string" | "boolean";
  short?: string;
  multiple?: boolean;
}

export interface ParseArgsConfig {
  args?: string[];
  options?: Record<string, ParseArgsOptionConfig>;
  strict?: boolean;
  allowPositionals?: boolean;
}

// Zodスタイルの成功結果
export type ParseSuccess<T> = {
  ok: true;
  data: T;
};

// Zodスタイルのエラー結果
export type ParseError = {
  ok: false;
  error: Error | z.ZodError;
};

// Zodスタイルのパース結果
export type SafeParseResult<T> = ParseSuccess<T> | ParseError;

// ネストコマンドのZodスタイル成功結果
export type NestedCommandParseSuccess<T = any> = {
  ok: true;
  data: T;
};

// ネストコマンドのZodスタイルパース結果
export type NestedCommandSafeParseResult<T = any> =
  | NestedCommandParseSuccess<T>
  | ParseError;
