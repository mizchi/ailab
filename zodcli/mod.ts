/**
 * ZodCLI - Zod を使用した型安全なコマンドラインパーサー
 *
 * このモジュールは、Zod スキーマを使用して型安全なコマンドラインインターフェースを
 * 簡単に構築するためのツールを提供します。
 *
 * @example
 * ```ts
 * import { createCliCommand, runCommand } from "./mod.ts";
 * import { z } from "npm:zod";
 *
 * const searchCommand = createCommand({
 *   name: "search",
 *   description: "Search with custom parameters",
 *   args: {
 *     query: {
 *       type: z.string().describe("search query"),
 *       positional: true,
 *     },
 *     count: {
 *       type: z.number().optional().default(5).describe("number of results"),
 *       short: "c",
 *     },
 *   },
 * });
 *
 * const result = searchCommand.parse(Deno.args);
 * runCommand(result, (data) => {
 *   console.log(`Searching for: ${data.query}, count: ${data.count}`);
 * });
 * ```
 */

// 型定義のエクスポート
export type {
  CommandSchema,
  CommandResult,
  InferQueryType,
  InferZodType,
  ParseArgsConfig,
  ParseArgsOptionConfig,
  ParseError,
  ParseSuccess,
  QueryBase,
  SafeParseResult,
  NestedCommandMap,
  NestedCommandParseSuccess,
  NestedCommandResult,
  NestedCommandSafeParseResult,
  InferArgs,
  InferParser,
  InferNestedParser,
} from "./types.ts";

// コア機能のエクスポート
export {
  createCommand,
  createParser,
  createNestedCommands,
  createSubParser,
  createZodSchema,
  resolveValues,
} from "./core.ts";

// 後方互換性のためのエイリアス
import { createSubParser } from "./core.ts";
import type { NestedCommandOptions, NestedCommandMap } from "./types.ts";

export function createNestedParser<T extends NestedCommandMap>(
  subCommands: T,
  options?: string | NestedCommandOptions,
  description?: string
) {
  return createSubParser(subCommands, options, description);
}

// ユーティリティ関数のエクスポート
export {
  convertValue,
  createTypeFromZod,
  generateHelp,
  getTypeDisplayString,
  printHelp,
  zodTypeToParseArgsType,
} from "./utils.ts";

// isHelp関数のエクスポート
export { isHelp } from "./core.ts";

// スキーマ関連のエクスポート
export { isOptionalType, zodToJsonSchema } from "./schema.ts";
