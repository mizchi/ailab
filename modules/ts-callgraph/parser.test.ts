import { expect } from "jsr:@std/expect";
import { test } from "jsr:@std/testing/bdd";
import { generateCallGraph } from "./parser.ts";
import { createProgram } from "./parser.ts";
import path from "node:path";

// あとで
test.skip("generateCallGraph が正しく動作する", () => {
  const filePath = path.join(
    import.meta.dirname!,
    "__fixtures/callgraph-sample.ts",
  );
  const program = createProgram(filePath);
  const callGraph = generateCallGraph(program);
  console.log(filePath, program.getNodeCount(), callGraph.getAllNodes().size);

  expect(callGraph.getAllNodes().size).toBeGreaterThan(0);
  expect(callGraph.getCalls().length).toBeGreaterThan(0);
});
