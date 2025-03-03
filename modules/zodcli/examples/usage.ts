// 基本的な使い方
import { createParser } from "jsr:@mizchi/zodcli";
import { z } from "npm:zod";

// パーサーの定義
const searchParser = createParser({
  name: "search",
  description: "Search files in directory",
  args: {
    // 名前付き位置引数
    query: {
      type: z.string().describe("search pattern"),
      positional: 0, // 0番目の引数
    },
    // 残り全部
    restAll: {
      type: z.array(z.string()),
      positional: "...", //rest parameter
    },
    // オプション引数（デフォルト値あり）
    path: {
      type: z.string().default("./").describe("target directory"),
      short: "p", // shortname
      default: ".",
    },
    // 真偽値オプション
    recursive: {
      type: z.boolean().default(false).describe("search recursively"),
      short: "r", // --recursive または -r で有効化
    },
  },
});

// gen help
if (
  Deno.args.length === 0 ||
  Deno.args.includes("--help") ||
  Deno.args.includes("-h")
) {
  console.log(searchParser.help());
  Deno.exit(0);
}

const result = searchParser.safeParse(Deno.args);
if (result.ok) {
  console.log("Parsed:", result.data, result.data.restAll, result.data.query);
}

console.log(searchParser.help());

/// sub command

// import { createNestedParser } from "jsr:@mizchi/zodcli";
// const gitAddSchema = {
//   name: "git add",
//   description: "Add files to git staging",
//   args: {
//     files: {
//       type: z.string().array().describe("files to add"),
//       positional: "...",
//     },
//     all: {
//       type: z.boolean().default(false).describe("add all files"),
//       short: "a",
//     },
//   },
// } as const;
