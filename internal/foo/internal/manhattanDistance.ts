import type { Point } from "../mod.ts";

/**
 * Calculates the Manhattan distance between two points in a 2D space
 * @param p1 First point
 * @param p2 Second point
 * @returns The sum of absolute differences of their coordinates
 */
export function manhattanDistance(p1: Point, p2: Point): number {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}
