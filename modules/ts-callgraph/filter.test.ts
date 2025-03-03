import { expect } from "jsr:@std/expect";
import { test } from "jsr:@std/testing/bdd";
import { shouldFilterCall } from "./filter.ts";

test("shouldFilterCall が正しく動作する", () => {
  const callInfo = {
    caller: "main",
    callee: "console.log",
    sourceFile: "test.ts",
    line: 10,
    column: 5,
  };

  const flags = {
    "ignore-stdlib": true,
    "ignore-npm": true,
    "ignore-jsr": true,
  };

  const ignorePatterns: string[] = [];

  expect(shouldFilterCall(callInfo, flags, ignorePatterns)).toBe(true);

  const callInfo2 = {
    caller: "main",
    callee: "zod.string",
    sourceFile: "test.ts",
    line: 10,
    column: 5,
  };

  expect(shouldFilterCall(callInfo2, flags, ignorePatterns)).toBe(false);
});
