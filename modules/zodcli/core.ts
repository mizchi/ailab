import { z } from "npm:zod";
import { parseArgs } from "node:util";
import type {
  CommandResult,
  CommandSchema,
  InferNestedParser,
  InferQueryType,
  NestedCommandMap,
  NestedCommandOptions,
  NestedCommandResult,
  NestedCommandSafeParseResult,
  ParseArgsConfig,
  ParseError,
  QueryBase,
  SafeParseResult,
} from "./types.ts";
import { convertValue, generateHelp, zodTypeToParseArgsType } from "./utils.ts";
import { zodToJsonSchema } from "./schema.ts";

// デバッグモードの制御
let DEBUG_MODE = false;

/**
 * デバッグモードを設定する関数
 * @param enable デバッグモードを有効にするかどうか
 */
export function setDebugMode(enable: boolean): void {
  DEBUG_MODE = enable;
}

/**
 * デバッグログを出力する関数
 * @param message ログメッセージまたはログ関数
 */
function debug(message: string | (() => string)): void {
  if (DEBUG_MODE) {
    if (typeof message === "function") {
      console.log(message());
    } else {
      console.log(message);
    }
  }
}

/**
 * 引数が "--help", "-h" フラグを含むか、または空かどうかをチェックします
 *
 * @param args チェックする引数の配列
 * @returns ヘルプフラグが含まれるか引数が空の場合はtrue、それ以外はfalse
 */
export function isHelp(args: string[]): boolean {
  return args.includes("--help") || args.includes("-h") || args.length === 0;
}

// クエリ定義からParseArgsConfigを生成
export function createParseArgsConfig<T extends Record<string, QueryBase<any>>>(
  queryDef: T,
): ParseArgsConfig {
  const options: Record<
    string,
    { type: "string" | "boolean"; short?: string; multiple?: boolean }
  > = {};

  // ヘルプオプションを追加
  options["help"] = {
    type: "boolean",
    short: "h",
  };

  // 各クエリ定義からオプションを生成
  for (const [key, def] of Object.entries(queryDef)) {
    // if (def)
    if (def.positional != null) {
      continue;
    }

    const option = {
      type: zodTypeToParseArgsType(def.type),
      short: def.short,
    } as { type: "string" | "boolean"; short?: string; multiple?: boolean };
    // avoid undefined
    if (def.short == undefined) {
      delete option.short;
    }

    // 配列の場合はmultipleをtrueに
    if (def.type instanceof z.ZodArray) {
      option.multiple = true;
    }

    options[key] = option;
  }

  return {
    options,
    allowPositionals: true,
    strict: false,
  };
}

// parseArgsの結果をZodスキーマに基づいて変換
export function resolveValues<T extends Record<string, QueryBase<any>>>(
  rawParsed: { values: Record<string, any>; positionals: string[] },
  queryDef: T,
): InferQueryType<T> {
  const result: Record<string, any> = {};

  const positionalKeys = Object.values(queryDef)
    .filter((x) => typeof x.positional === "number")
    .map((x) => x.positional)
    .sort() as number[];

  // 衝突チェック
  if (positionalKeys.length !== new Set(positionalKeys).size) {
    throw new Error("位置引数のインデックスが重複しています");
  }
  // 連番チェック
  for (let i = 0; i < positionalKeys.length; i++) {
    if (positionalKeys[i] !== i) {
      throw new Error("位置引数のインデックスが連番になっていません");
    }
  }
  // レスト引数の処理（'...'）
  // レスと引数定義の重複チェック
  const restDefs = Object.values(queryDef).filter(
    (x) => x.positional === "...",
  ) as QueryBase<any>[];
  if (restDefs.length > 1) {
    if (positionalKeys.includes(positionalKeys.length)) {
      throw new Error("multiple rest arguments");
    }
  }

  const maxPositionalIndex = Math.max(...positionalKeys);
  const restParam = Object.keys(queryDef).find(
    (key) => queryDef[key].positional === "...",
  );
  if (restParam) {
    const restValues = rawParsed.positionals.slice(maxPositionalIndex + 1) ??
      [];
    const def = queryDef[restParam];
    if (def.type instanceof z.ZodArray) {
      result[restParam] = convertValue(restValues, def.type);
    } else {
      // 配列型でない場合は自動的に配列に変換
      result[restParam] = restValues;
    }
    // 以下の行は型変換された値を上書きしてしまうので削除
    // result[restParam] = rawParsed.positionals.slice(maxPositionalIndex + 1);
  }
  // 位置引数の処理
  for (const [key, def] of Object.entries(queryDef)) {
    if (def.positional == null) {
      continue;
    }
    if (def.positional === "...") {
      continue;
    }
    const value = rawParsed.positionals[def.positional];
    if (value !== undefined) {
      result[key] = convertValue(value, def.type);
    } else if (def.type instanceof z.ZodDefault) {
      // デフォルト値を持つ場合は、値が提供されなくてもデフォルト値を適用
      result[key] = def.type._def.defaultValue();
    }
  }

  // 名前付き引数の処理
  for (const [key, def] of Object.entries(queryDef)) {
    if (def.positional != null) {
      continue;
    }
    const value = rawParsed.values[key];
    if (value !== undefined) {
      // ブーリアン型の場合は特別処理
      if (def.type instanceof z.ZodBoolean) {
        // すでにブーリアン値ならそのまま、文字列なら変換
        result[key] = typeof value === "boolean"
          ? value
          : value === "true" || value === "1" || value === ""
          ? true
          : value === "false" || value === "0"
          ? false
          : true; // その他の場合はtrue扱い
      } else {
        // それ以外はconvertValue関数で変換
        const convertedValue = convertValue(value, def.type);
        debug(
          `[resolveValues] ${key} = ${value} (${typeof value}) -> ${convertedValue} (${typeof convertedValue})`,
        );
        result[key] = convertedValue;
      }
    } else if (def.type instanceof z.ZodDefault) {
      // デフォルト値を持つ場合は、値が提供されなくてもデフォルト値を適用
      result[key] = def.type._def.defaultValue();
    }
  }
  return result as InferQueryType<T>;
}

// クエリ定義からzodスキーマを生成
export function createZodSchema<T extends Record<string, QueryBase<any>>>(
  queryDef: T,
): z.ZodObject<any> {
  const schema: Record<string, z.ZodTypeAny> = {};

  for (const [key, def] of Object.entries(queryDef)) {
    schema[key] = def.type;
  }

  return z.object(schema);
}

// コマンド定義からCLIコマンドを生成する関数
export function createCommand<T extends Record<string, QueryBase<any>>>(
  commandDef: CommandSchema<T>,
) {
  const queryDef = commandDef.args;
  const parseArgsConfig = createParseArgsConfig(queryDef);
  const zodSchema = createZodSchema(queryDef);
  const jsonSchema = zodToJsonSchema(zodSchema);
  const helpText = generateHelp(
    commandDef.name,
    commandDef.description,
    queryDef,
  );

  // ショートオプションから長いオプション名へのマッピングを作成
  const shortToLongMap = new Map<string, string>();
  const booleanOptions = new Set<string>();

  for (const [key, option] of Object.entries(parseArgsConfig.options || {})) {
    if (option.short) {
      shortToLongMap.set(`-${option.short}`, `--${key}`);
    }
    if (option.type === "boolean") {
      booleanOptions.add(`--${key}`);
      if (option.short) {
        booleanOptions.add(`-${option.short}`);
      }
    }
  }

  // parseArgsWrapper: boolean引数のための特別処理とショートオプションの解決
  function parseArgsWrapper(args: string[]) {
    // 短縮オプションを長い形式に変換する前処理
    const processedArgs = [...args];

    // -abc のような連結された短縮オプションを分解（将来的な対応）

    // 短縮オプションを長い形式に変換
    for (let i = 0; i < processedArgs.length; i++) {
      const arg = processedArgs[i];
      if (shortToLongMap.has(arg)) {
        // 短縮オプションを長い形式に置き換え
        const longOption = shortToLongMap.get(arg)!;
        processedArgs[i] = longOption;

        // boolean型のオプションかどうかを確認
        if (booleanOptions.has(longOption)) {
          // booleanオプションの場合は値を取らないので次の引数を処理しない
          continue;
        }
      }
    }

    // デバッグ用：引数をビフォー処理
    debug(() => `[parseArgsWrapper] Original args: ${JSON.stringify(args)}`);
    debug(
      () =>
        `[parseArgsWrapper] Processed args: ${JSON.stringify(processedArgs)}`,
    );

    // ブール型オプションと値を持つオプションを手動で処理
    const manualProcessedArgs: string[] = [];
    const manualValues: Record<string, string | boolean | string[]> = {};
    const manualPositionals: string[] = [];

    for (let i = 0; i < processedArgs.length; i++) {
      const arg = processedArgs[i];

      // オプションかどうかをチェック
      if (arg.startsWith("--")) {
        const optionName = arg.slice(2); // '--'を削除

        // オプションが定義されているかチェック
        if (parseArgsConfig.options && parseArgsConfig.options[optionName]) {
          const option = parseArgsConfig.options[optionName];

          if (option.type === "boolean") {
            // ブール型オプションは値を取らない
            manualValues[optionName] = true;
          } else if (
            i + 1 < processedArgs.length &&
            !processedArgs[i + 1].startsWith("-")
          ) {
            // 次の引数が別のオプションでなければ、値として扱う
            manualValues[optionName] = processedArgs[i + 1];
            i++; // 値をスキップ
          } else {
            // 値が提供されていない場合は空文字列を設定
            manualValues[optionName] = "";
          }
        }
      } else if (!arg.startsWith("-")) {
        // オプションでない場合は位置引数として扱う
        manualPositionals.push(arg);
      }
    }

    debug(
      () => `[parseArgsWrapper] Manual values: ${JSON.stringify(manualValues)}`,
    );
    debug(
      () =>
        `[parseArgsWrapper] Manual positionals: ${
          JSON.stringify(
            manualPositionals,
          )
        }`,
    );

    try {
      // 標準の引数パーサーを使用（デバッグ比較用）
      const parseResult = parseArgs({
        args: processedArgs,
        options: parseArgsConfig.options,
        allowPositionals: parseArgsConfig.allowPositionals,
        strict: false, // 厳密モードをオフにして未知のオプションを許可
      });

      // 手動処理した結果と標準パーサーの結果を比較（デバッグ用）
      debug(
        () =>
          `[parseArgsWrapper] Standard parse result: ${
            JSON.stringify(
              parseResult.values,
            )
          }`,
      );

      // 手動パース結果を使用する
      const values = { ...manualValues };
      for (
        const [key, option] of Object.entries(
          parseArgsConfig.options || {},
        )
      ) {
        if (key === "help") continue; // helpオプションはスキップ

        // 数値型の場合は明示的に変換
        if (queryDef[key] && queryDef[key].type instanceof z.ZodNumber) {
          if (typeof values[key] === "string") {
            const numValue = Number(values[key]);
            if (!isNaN(numValue)) {
              // 型エラーを回避するために明示的に型付けする
              (values as Record<string, string | boolean | number | undefined>)[
                key
              ] = numValue;
              debug(
                `[parseArgsWrapper] ${key} = ${numValue} (${typeof numValue})`,
              );
            }
          }
        }
      }

      return {
        values,
        positionals: manualPositionals,
      };
    } catch (error) {
      // デバッグ用
      debug(() => `[parseArgsWrapper] Parse error: ${error}`);
      debug(
        () =>
          `[parseArgsWrapper] Processed args: ${JSON.stringify(processedArgs)}`,
      );
      debug(() => `[parseArgsWrapper] Original args: ${JSON.stringify(args)}`);
      throw error;
    }
  }

  // パース関数
  function parse(argv: string[]): CommandResult<InferQueryType<T>> {
    // ヘルプフラグのチェック
    if (argv.includes("-h") || argv.includes("--help")) {
      return { type: "help", helpText };
    }
    try {
      const { values, positionals } = parseArgsWrapper(argv);
      const resolved = resolveValues({ values, positionals }, queryDef);

      const validation = zodSchema.safeParse(resolved);
      if (!validation.success) {
        return {
          type: "error",
          error: validation.error,
          helpText,
        };
      }

      return {
        type: "success",
        data: resolved,
      };
    } catch (error) {
      return {
        type: "error",
        error: error instanceof Error ? error : new Error(String(error)),
        helpText,
      };
    }
  }

  return {
    parse,
    parseArgsConfig,
    zodSchema,
    jsonSchema,
    helpText,
  };
}

// ネストコマンドマップの作成
export function createNestedCommands<T extends NestedCommandMap>(
  subCommands: T,
  options?: NestedCommandOptions,
) {
  const commands = new Map<string, ReturnType<typeof createCommand>>();
  const commandNames = new Set<string>();

  // 各サブコマンドに対してcreateCliCommandを実行
  for (const [name, def] of Object.entries(subCommands)) {
    commands.set(name, createCommand(def));
    commandNames.add(name);
  }

  const rootName = options?.name || "command";
  const rootDescription = options?.description || "Command with subcommands";
  const defaultCommand = options?.default;

  // デフォルトコマンドの検証
  if (defaultCommand && !commandNames.has(defaultCommand)) {
    throw new Error(
      `Default command '${defaultCommand}' not found in subcommands`,
    );
  }

  // rootのヘルプテキスト生成
  const rootHelpText = (name = rootName, description = rootDescription) =>
    generateHelp(name, description, {}, subCommands);

  // パース関数
  function parse(
    argv: string[],
    name = rootName,
    description = rootDescription,
  ): NestedCommandResult {
    // ヘルプフラグのチェック
    if (argv.includes("-h") || argv.includes("--help") || argv.length === 0) {
      return {
        type: "help",
        helpText: rootHelpText(name, description),
      };
    }

    let subCommandName: string;
    let subCommandArgs: string[];

    // サブコマンド名の解決
    if (commandNames.has(argv[0])) {
      // 明示的にサブコマンドが指定された場合
      subCommandName = argv[0];
      subCommandArgs = argv.slice(1); // 最初の引数を取り除く
    } else if (defaultCommand) {
      // デフォルトコマンドがある場合はそれを使用
      subCommandName = defaultCommand;
      subCommandArgs = argv; // 全ての引数をデフォルトコマンドに渡す
    } else {
      // デフォルトコマンドがなく、サブコマンドも不明の場合
      return {
        type: "error",
        error: new Error(`Unknown subcommand: ${argv[0]}`),
        helpText: rootHelpText(name, description),
      };
    }

    const command = commands.get(subCommandName);
    if (!command) {
      // これは発生しないはずだが、型安全のために残しておく
      return {
        type: "error",
        error: new Error(`Unknown subcommand: ${subCommandName}`),
        helpText: rootHelpText(name, description),
      };
    }

    return {
      type: "subcommand",
      name: subCommandName,
      result: command.parse(subCommandArgs),
    };
  }

  return {
    commands,
    parse,
    rootHelpText,
    defaultCommand,
    commandNames,
  };
}

/**
 * createParserはコマンド定義から新しいパーサーを作成します。
 * このパーサーはZodスタイルのインターフェースを提供します。
 *
 * @example
 * ```ts
 * const parser = createParser({
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
 * try {
 *   const data = parser.parse(Deno.args);
 *   console.log(`Searching for: ${data.query}, count: ${data.count}`);
 * } catch (error) {
 *   console.error(error.message);
 *   console.log(parser.helpText);
 * }
 * ```
 *
 * @param definition コマンド定義オブジェクト
 * @returns パーサーオブジェクト
 */
export function createParser<T extends Record<string, QueryBase<any>>>(
  definition: CommandSchema<T>,
) {
  const command = createCommand(definition);

  // 例外を投げるパース関数
  function parse(argv: string[]): InferQueryType<T> {
    const result = command.parse(argv);

    if (result.type === "error") {
      throw result.error;
    } else if (result.type === "help") {
      throw new Error(
        "Help requested. Use --help or -h to display help information.",
      );
    }

    return result.data;
  }

  // 安全なパース関数（結果オブジェクトを返す）
  function safeParse(argv: string[]): SafeParseResult<InferQueryType<T>> {
    const result = command.parse(argv);

    if (result.type === "error") {
      return {
        ok: false,
        error: result.error,
      };
    } else if (result.type === "help") {
      return {
        ok: false,
        error: new Error("Help requested"),
      };
    }

    return {
      ok: true,
      data: result.data,
    };
  }

  return {
    parse,
    safeParse,
    help: () => command.helpText,
    zodSchema: command.zodSchema,
    jsonSchema: command.jsonSchema,
  };
}

/**
 * createSubParserはサブコマンドマップから新しいサブコマンドパーサーを作成します。
 * このパーサーはZodスタイルのインターフェースを提供します。
 *
 * @example
 * ```ts
 * // 基本的な使い方
 * const gitParser = createSubParser({
 *   add: {
 *     name: "git add",
 *     description: "Add files to staging",
 *     args: { files: { type: z.string().array(), positional: true } }
 *   },
 *   commit: {
 *     name: "git commit",
 *     description: "Commit changes",
 *     args: { message: { type: z.string(), positional: true } }
 *   }
 * }, { name: "git", description: "Git command line tool" });
 *
 * // デフォルトコマンドを指定して作成
 * const npmParser = createSubParser({
 *   install: { name: "npm install", description: "Install packages", ... },
 *   update: { name: "npm update", description: "Update packages", ... },
 *   test: { name: "npm test", description: "Run tests", ... }
 * }, { name: "npm", description: "Node package manager", default: "install" });
 *
 * try {
 *   // 'npm react lodash'のように実行するとinstallコマンドが使用される
 *   const { command, data } = npmParser.parse(Deno.args);
 *   console.log(`Running npm ${command} with:`, data);
 * } catch (error) {
 *   console.error(error.message);
 * }
 * ```
 *
 * @param subCommands サブコマンドマップ
 * @param options コマンド名、説明、デフォルトコマンドを含むオプション
 * @returns サブコマンドパーサーオブジェクト
 */
export function createSubParser<T extends NestedCommandMap>(
  subCommands: T,
  options: string | NestedCommandOptions | undefined = undefined,
  description?: string,
) {
  type Result = InferNestedParser<T>;
  let commandOptions: NestedCommandOptions;

  // 下位互換性のための処理
  if (typeof options === "string") {
    // 従来のインターフェース: createSubParser(subCommands, rootName, rootDescription)
    commandOptions = {
      name: options,
      description: description || "Command with subcommands",
    };
  } else if (options) {
    // 新しいインターフェース: createSubParser(subCommands, { name, description, default })
    commandOptions = options;
  } else {
    // デフォルト値
    commandOptions = {
      name: "command",
      description: "Command with subcommands",
    };
  }

  const subCommandHandler = createNestedCommands(subCommands, commandOptions);

  function parse(argv: string[]): Result {
    const result = subCommandHandler.parse(argv);

    if (result.type === "error") {
      throw result.error;
    } else if (result.type === "help") {
      throw new Error("Help requested");
    } else if (result.type === "subcommand") {
      if (result.result.type === "error") {
        throw result.result.error;
      } else if (result.result.type === "help") {
        throw new Error(`Help requested for subcommand: ${result.name}`);
      }

      return {
        command: result.name,
        data: result.result.data,
      } as Result;
    }

    // 型安全のため、ここには到達しないはず
    throw new Error("Unknown parse result");
  }

  function safeParse(argv: string[]): NestedCommandSafeParseResult<Result> {
    const result = subCommandHandler.parse(argv);

    if (result.type === "error") {
      return { ok: false, error: result.error };
    } else if (result.type === "help") {
      return { ok: false, error: new Error("Help requested") };
    } else if (result.type === "subcommand") {
      if (result.result.type === "error") {
        return { ok: false, error: result.result.error };
      } else if (result.result.type === "help") {
        return {
          ok: false,
          error: new Error(`Help requested for subcommand: ${result.name}`),
        };
      }

      return {
        ok: true,
        data: {
          command: result.name,
          data: result.result.data,
        } as Result,
      };
    }

    // 型安全のため、ここには到達しないはず
    return { ok: false, error: new Error("Unknown parse result") };
  }

  return {
    parse,
    safeParse,
    help: () => subCommandHandler.rootHelpText(),
    commands: subCommandHandler.commands,
    defaultCommand: subCommandHandler.defaultCommand,
    commandNames: subCommandHandler.commandNames,
  };
}
