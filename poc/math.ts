/* @script */
export function add(a: number, b: number): number {
  return a + b;
}

// Tests
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("add", () => {
  expect(add(1, 2)).toBe(3);
});
