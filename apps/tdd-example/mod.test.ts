// @script @tdd
import { add, sub } from "./mod.ts";
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("add", () => {
  expect(add(1, 2)).toBe(3);
});

test("sub", () => {
  expect(sub(5, 3), "数の差").toBe(2);
});
