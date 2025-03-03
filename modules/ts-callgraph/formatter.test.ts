import { expect } from "jsr:@std/expect";
import { test } from "jsr:@std/testing/bdd";
import { CallGraph } from "./callgraph.ts";
import {
  toFunctionCallDot,
  toFunctionSummaryDot,
  toFunctionSummaryText,
} from "./formatter.ts";

test("toFunctionCallDot が正しく動作する", () => {
  const graph = new CallGraph();
  graph.addCall("main", "helper", "test.ts", 10, 5);
  const dot = toFunctionCallDot(graph);
  expect(dot).toContain('  "main" -> "helper" [label="calls: 1"];');
});

test("toFunctionSummaryDot が正しく動作する", () => {
  const graph = new CallGraph();
  graph.addCall("main", "helper", "test.ts", 10, 5);
  const dot = toFunctionSummaryDot(graph);
  expect(dot).toContain('  "main" -> "helper";');
});

test("toFunctionSummaryText が正しく動作する", () => {
  const graph = new CallGraph();
  graph.addNode("main", { kind: "function", type: "() => void" });
  graph.addNode("helper", { kind: "function", type: "(x: number) => number" });
  graph.addCall("main", "helper", "test.ts", 10, 5);
  const text = toFunctionSummaryText(graph);
  expect(text).toContain("main: () => void");
  expect(text).toContain("helper: (x: number) => number");
  expect(text).toContain("  - helper: (x: number) => number");
});
