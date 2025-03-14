import { expect } from "@std/expect";
import { distance } from "../mod.ts";

Deno.test("distance", () => {
  const p1 = { x: 1, y: 1 };
  const p2 = { x: 4, y: 5 };
  const result = distance(p1, p2);
  expect(result).toEqual(5);
});
