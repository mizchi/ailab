import { z } from "npm:zod";
import type {
  NestedCommandMap,
  NestedCommandResult,
  QueryBase,
} from "./types.ts";

// Zodの型からparseArgsの型に変換
export function zodTypeToParseArgsType(
  zodType: z.ZodTypeAny,
): "string" | "boolean" {
  if (zodType instanceof z.ZodBoolean) {
    return "boolean";
  }
  // 他のすべての型は文字列として扱う
  return "string";
}

// 値の型変換
export function convertValue(
  value: string | boolean | string[] | undefined,
  zodType: z.ZodTypeAny,
): any {
  if (value === undefined) {
    return undefined;
  }

  // Boolean型の特別処理
  if (zodType instanceof z.ZodBoolean) {
    // すでにboolean型なら、そのまま返す
    if (typeof value === "boolean") {
      return value;
    }
    // 文字列をboolean値に変換
    if (typeof value === "string") {
      if (value === "true" || value === "1" || value === "") {
        return true;
      }
      if (value === "false" || value === "0") {
        return false;
      }
      // デフォルトでは表現できない文字列は真とみなす
      // (コマンドラインの --flag 形式はtrueとして扱われる)
      return true;
    }
    // その他の場合はそのまま返す
    return !!value;
  }

  if (zodType instanceof z.ZodNumber) {
    // 確実に数値に変換する
    if (typeof value === "string") {
      const numValue = Number(value);
      // NaNを避ける
      if (!isNaN(numValue)) {
        return numValue;
      }
    }
    return typeof value === "number" ? value : 0; // デフォルト値として0を使用
  } else if (zodType instanceof z.ZodEnum) {
    return value;
  } else if (zodType instanceof z.ZodArray) {
    if (Array.isArray(value)) {
      if (zodType._def.type instanceof z.ZodNumber) {
        return value.map((v) => Number(v));
      }
      return value;
    }
    return typeof value === "string" ? [value] : [];
  } else if (zodType instanceof z.ZodOptional) {
    return value === undefined
      ? undefined
      : convertValue(value, zodType._def.innerType);
  } else if (zodType instanceof z.ZodDefault) {
    return value === undefined
      ? zodType._def.defaultValue()
      : convertValue(value, zodType._def.innerType);
  }

  return value;
}

// 型の表示用文字列を取得
export function getTypeDisplayString(zodType: z.ZodTypeAny): string {
  if (zodType instanceof z.ZodString) {
    return "str";
  } else if (zodType instanceof z.ZodNumber) {
    return "num";
  } else if (zodType instanceof z.ZodBoolean) {
    return "bool";
  } else if (zodType instanceof z.ZodEnum) {
    return zodType._def.values.join("|");
  } else if (zodType instanceof z.ZodArray) {
    return `${getTypeDisplayString(zodType._def.type)}[]`;
  } else if (zodType instanceof z.ZodOptional) {
    return getTypeDisplayString(zodType._def.innerType);
  } else if (zodType instanceof z.ZodDefault) {
    return getTypeDisplayString(zodType._def.innerType);
  }
  return "any";
}

// ヘルプメッセージの生成
export function generateHelp<T extends Record<string, QueryBase<any>>>(
  commandName: string,
  description: string,
  queryDef: T,
  subCommands?: NestedCommandMap,
): string {
  let help = `${commandName}\n> ${description}\n\n`;

  // サブコマンドの説明
  if (subCommands && Object.keys(subCommands).length > 0) {
    help += "SUBCOMMANDS:\n";
    for (const [name, cmd] of Object.entries(subCommands)) {
      help += `  ${name} - ${cmd.description}\n`;
    }
    help += "\n";
  }

  // 位置引数の説明
  const positionals = Object.entries(queryDef).filter(
    ([_, def]) => def.positional != null && def.positional !== "...",
  );
  if (positionals.length > 0) {
    help += "ARGUMENTS:\n";
    for (const [key, def] of positionals) {
      const typeStr = getTypeDisplayString(def.type);
      const desc = def.type.description || def.description || "";
      help += `  <${key}:${typeStr}> - ${desc}\n`;
    }
    help += "\n";
  }
  const positionalRest = Object.entries(queryDef).find(
    ([_, def]) => def.positional === "...",
  );
  if (positionalRest) {
    const [key, def] = positionalRest;
    const typeStr = getTypeDisplayString(def.type);
    const desc = def.type.description || def.description || "";
    help += `  ...<${key}:${typeStr}[]>${desc || " - rest arguments"}\n\n`;
  }

  // オプションの説明
  const options = Object.entries(queryDef).filter(
    ([_, def]) => !def.positional,
  );
  if (options.length > 0) {
    help += "OPTIONS:\n";
    for (const [key, def] of options) {
      const typeStr = getTypeDisplayString(def.type);
      const shortOption = def.short ? `-${def.short}` : "";
      const desc = def.type.description || def.description || "";
      const defaultValue = def.type instanceof z.ZodDefault
        ? ` (default: ${JSON.stringify(def.type._def.defaultValue())})`
        : "";

      // boolean型の場合は <type> を表示しない
      const typeDisplay = def.type instanceof z.ZodBoolean
        ? ""
        : ` <${typeStr}>`;
      help += `  --${key}${
        shortOption ? ", " + shortOption : ""
      }${typeDisplay} - ${desc}${defaultValue}\n`;
    }
    help += "\n";
  }

  // フラグの説明（ヘルプなど）
  help += "FLAGS:\n";
  help += "  --help, -h - show help\n";

  return help;
}

// Zodスキーマから型推論した結果と整合する型変換ヘルパー
export function createTypeFromZod<T extends z.ZodTypeAny>(
  schema: T,
): z.infer<T> {
  // 単に型推論のためのヘルパー関数
  // 実際の実行時には何もしない（型情報のみ）
  return null as any;
}

/**
 * ヘルプテキストを標準出力に表示します
 *
 * @param helpText 表示するヘルプテキスト
 */
export function printHelp(helpText: string) {
  console.log(helpText);
}
