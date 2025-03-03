#!/usr/bin/env -S deno run -A
import { z } from "npm:zod";
import {
  createParser,
  type InferArgs,
  type InferParser,
  isHelp,
} from "../mod.ts";

// スキーマ定義からの型推論の例
const numberSchema = z.object({
  count: z.number(),
  limit: z.number().default(10),
  values: z.number().array(),
  id: z.number(),
  verbose: z.boolean().default(false),
});

// InferArgsを使って型を推論
type InferredArgs = InferArgs<typeof numberSchema>;
// これは以下と同じ:
// type InferredArgs = {
//   count: number;
//   limit: number;
//   values: number[];
//   id: number;
//   verbose: boolean;
// };

// 数値型を使った引数を持つパーサーを作成
const parser = createParser({
  name: "number-example",
  description: "Example command showing z.number() usage",
  args: {
    // 数値型の必須引数
    count: {
      type: z.number().describe("Number of items"),
      short: "c",
    },
    // 数値型のデフォルト値を持つ引数
    limit: {
      type: z.number().default(10).describe("Limit value (default: 10)"),
      short: "l",
    },
    // 数値型の配列
    values: {
      type: z.number().array().describe("List of numeric values"),
      short: "v",
    },
    // 位置引数（数値型）
    id: {
      type: z.number().describe("ID number"),
      positional: 0,
    },
    // boolean型と組み合わせ
    verbose: {
      type: z.boolean().default(false).describe("Enable verbose mode"),
      short: "V",
    },
  },
});

// InferParserを使用してパーサーから直接型を推論
type ParsedResult = InferParser<typeof parser>;
// これは parse メソッドの戻り値の型を推論します
// type ParsedResult = {
//   count: number;
//   limit: number;
//   values: number[];
//   id: number;
//   verbose: boolean;
// };

// ----- isHelp関数の使用例 -----
console.log("ヘルプフラグのチェック例:");
console.log(
  "引数がない場合や --help/-h を含む場合、ヘルプを表示して終了します",
);

// isHelp関数を使ってヘルプフラグをチェック
if (isHelp(Deno.args)) {
  console.log("ヘルプフラグが検出されました。ヘルプを表示して終了します。");
  console.log("-".repeat(50));
  console.log(parser.help());
  console.log("-".repeat(50));
  console.log("プログラムを終了します (Deno.exit(0))");
  Deno.exit(0);
}

console.log("ヘルプフラグは検出されませんでした。処理を続行します。");
console.log("-".repeat(50));

// 問題を詳しく調査するためにデバッグバージョンを作成
console.log("入力引数:", Deno.args);

// パーサー結果を直接取得して、生のパース結果も表示
const rawResult = parser.safeParse(Deno.args);
console.log("Raw parse result:", JSON.stringify(rawResult, null, 2));

try {
  // 直接 parse メソッドを使用して結果をチェック
  const parseResult = parser.parse(Deno.args);
  console.log("Direct parse result:", JSON.stringify(parseResult, null, 2));

  // パースデータを使用した処理
  console.log("Parsed data:");
  console.log("=".repeat(30));
  console.log(
    `count: ${parseResult.count} (type: ${typeof parseResult.count})`,
  );
  console.log(
    `limit: ${parseResult.limit} (type: ${typeof parseResult.limit})`,
  );
  console.log(`values (JSON): ${JSON.stringify(parseResult.values)}`);
  console.log(`values.length: ${parseResult.values.length}`);

  // 各要素を個別に表示
  for (let i = 0; i < parseResult.values.length; i++) {
    console.log(
      `values[${i}]: ${parseResult.values[i]} (${typeof parseResult
        .values[i]})`,
    );
  }

  // 配列の合計を計算 (数値として正しく処理されていることを確認)
  const sum = parseResult.values.reduce((a, b) => a + b, 0);
  console.log(`values の合計: ${sum} (${typeof sum})`);
  console.log(
    `values: [${parseResult.values}] (type: ${typeof parseResult
      .values}, array items type: ${
      parseResult.values.length > 0 ? typeof parseResult.values[0] : "empty"
    })`,
  );
  console.log(`id: ${parseResult.id} (type: ${typeof parseResult.id})`);
  console.log(
    `verbose: ${parseResult.verbose} (type: ${typeof parseResult.verbose})`,
  );
  console.log("=".repeat(30));
} catch (error) {
  console.error(
    "Error:",
    error instanceof Error ? error.message : String(error),
  );
  console.log(parser.help());
  Deno.exit(1);
}

// 使用例のヘルプ表示（コメントアウトして実行コードと分ける）
console.log("使用例:");
console.log("1. 基本的な使用法:");
console.log(
  "   deno run -A number.ts 123 --count 5 --limit 20 --values 1 --values 2 --values 3",
);
console.log("");
console.log("2. 短縮オプション:");
console.log("   deno run -A number.ts 123 -c 5 -l 20 -v 1 -v 2 -v 3");
console.log("");
console.log("3. デフォルト値の使用:");
console.log("   deno run -A number.ts 123 -c 5");
console.log("");
console.log("4. ヘルプの表示:");
console.log("   deno run -A number.ts --help");
console.log("");
