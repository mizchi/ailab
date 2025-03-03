#!/usr/bin/env -S deno run -A
/**
 * zodcli 新しいインターフェースの使用例
 */
import { createParser } from "../mod.ts";
import { z } from "npm:zod";

const searchParser = createParser({
  name: "search",
  description: "Search with custom parameters",
  args: {
    query: {
      type: z.string().describe("search query"),
      positional: 0,
    },
    count: {
      type: z
        .number()
        .optional()
        .default(5)
        .describe("number of results to return"),
      short: "c",
    },
    format: {
      type: z
        .enum(["json", "text", "table"])
        .default("text")
        .describe("output format"),
      short: "f",
    },
  },
});

if (import.meta.main) {
  try {
    const mockArgs = ["test", "--count", "10", "--format", "json"];
    const data = searchParser.parse(mockArgs);
    console.log(
      `  検索クエリ: ${data.query}, 件数: ${data.count}, 形式: ${data.format}`,
    );
  } catch (error) {
    console.error(
      "  パースエラー:",
      error instanceof Error ? error.message : String(error),
    );
    console.log(searchParser.help());
  }

  // safeParse
  console.log("\n2. safeParse メソッドの使用例（Zodスタイル）:");
  const mockArgs2 = ["test", "--count", "invalid", "--format", "json"];
  const result = searchParser.safeParse(mockArgs2);

  if (result.ok) {
    console.log(
      `  検索クエリ: ${result.data.query}, 件数: ${result.data.count}, 形式: ${result.data.format}`,
    );
  } else {
    console.error("  パースエラー:", result.error.message);
    console.log(searchParser.help());
  }
}
