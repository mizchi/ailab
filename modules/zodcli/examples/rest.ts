#!/usr/bin/env -S deno run -A
/**
 * zodcli 新しいインターフェースの使用例
 */
import { createParser } from "../mod.ts";
import { z } from "npm:zod";

const restAll = createParser({
  name: "search",
  description: "Search with custom parameters",
  args: {
    rest: {
      type: z.array(z.string()).describe("rest arguments"),
      positional: "...",
    },
  },
});

const headAndRest = createParser({
  name: "search",
  description: "Search with custom parameters",
  args: {
    query: {
      type: z.string().describe("search query"),
      positional: 0,
      // short: "q",
    },
    named: {
      type: z.string().describe("named argument"),
      short: "n",
      // positional
    },
    rest: {
      type: z.array(z.string()).describe("rest arguments"),
      positional: "...",
    },
  },
});

// const parsed = restAll.safeParse(["q", "a", "b"]);
// console.log(parsed);

console.log("rest--------------");
const parsed2 = headAndRest.safeParse(["p", "-n", "name", "b", "c"]);
console.log(parsed2);
