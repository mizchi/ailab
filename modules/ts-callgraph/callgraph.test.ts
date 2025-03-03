import { expect } from "jsr:@std/expect";
import { test } from "jsr:@std/testing/bdd";
import { CallGraph } from "./callgraph.ts";
import type { createProgram, generateCallGraph } from "./parser.ts";
import type * as path from "jsr:@std/path";

test("関数実装の要約が正しく動作する", () => {
  const graph = new CallGraph();

  // ノード情報を追加
  graph.addNode("main", { kind: "function", type: "() => void" });
  graph.addNode("helper", { kind: "function", type: "(x: number) => number" });
  graph.addNode("util", { kind: "function", type: "(s: string) => string" });

  // 呼び出し情報を追加
  graph.addCall("main", "helper", "test.ts", 10, 5);
  graph.addCall("main", "util", "test.ts", 11, 3);
  graph.addCall("helper", "util", "test.ts", 15, 3);

  // 関数実装の要約を取得
  const summary = graph.summarizeFunctionImplementations();

  // 期待される結果
  expect(summary.length).toBe(2);

  // main関数の呼び出し
  const mainImpl = summary.find((impl) => impl.function === "main");
  expect(mainImpl).toBeDefined();
  expect(mainImpl?.calls).toContain("helper");
  expect(mainImpl?.calls).toContain("util");

  // helper関数の呼び出し
  const helperImpl = summary.find((impl) => impl.function === "helper");
  expect(helperImpl).toBeDefined();
  expect(helperImpl?.calls).toContain("util");

  // DOT形式の出力をテスト
  const dot = graph.toFunctionSummaryDot();
  expect(dot).toContain("main");
  expect(dot).toContain("helper");
  expect(dot).toContain("util");
  expect(dot).toContain('  "main" -> "helper";');
  expect(dot).toContain('  "main" -> "util";');
  expect(dot).toContain('  "helper" -> "util";');

  // テキスト形式の出力をテスト
  const text = graph.toFunctionSummaryText();
  expect(text).toContain("main: () => void");
  expect(text).toContain("helper: (x: number) => number");
  expect(text).toContain("util: (s: string) => string");
});
