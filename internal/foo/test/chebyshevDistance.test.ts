/**
 * @module @i/foo/test/chebyshevDistance
 */

import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import { chebyshevDistance, Point } from "../mod.ts";

test("chebyshevDistance calculates correct Chebyshev distance", () => {
  const p1: Point = { x: 0, y: 0 };
  const p2: Point = { x: 3, y: 4 };
  expect(chebyshevDistance(p1, p2), "max of |3-0| and |4-0|").toBe(4);
});

test("chebyshevDistance with equal coordinates", () => {
  const p1: Point = { x: 5, y: 5 };
  const p2: Point = { x: 5, y: 5 };
  expect(chebyshevDistance(p1, p2), "distance to self").toBe(0);
});

test("chebyshevDistance with negative values", () => {
  const p1: Point = { x: -2, y: -3 };
  const p2: Point = { x: 2, y: 1 };
  expect(chebyshevDistance(p1, p2), "max of |2-(-2)| and |1-(-3)|").toBe(4);
});
