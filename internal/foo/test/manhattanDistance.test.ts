import { expect } from "@std/expect";
import { manhattanDistance } from "../mod.ts";

Deno.test("manhattanDistance", () => {
  const p1 = { x: 1, y: 1 };
  const p2 = { x: 4, y: 5 };
  const result = manhattanDistance(p1, p2);
  // |4-1| + |5-1| = 3 + 4 = 7
  expect(result).toEqual(7);
});

Deno.test("manhattanDistance with negative values", () => {
  const p1 = { x: -1, y: -3 };
  const p2 = { x: 2, y: -7 };
  const result = manhattanDistance(p1, p2);
  // |2-(-1)| + |(-7)-(-3)| = 3 + 4 = 7
  expect(result).toEqual(7);
});
