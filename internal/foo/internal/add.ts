/**
 * This is a deno module example
 * @param a
 * @param b
 * @returns
 */
export function add(a: number, b: number): number {
  return a + b;
}

import { expect } from "@std/expect";
Deno.test("add-inline", () => {
  const result = add(1, 2);
  expect(result).toEqual(3);
});
