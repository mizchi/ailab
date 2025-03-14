import type { Point } from "../mod.ts";

/**
 * Calculates the Euclidean distance between two points in a 2D space
 * @param p1 First point
 * @param p2 Second point
 * @returns The straight-line distance between the two points
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}
