/**
 * @module @i/foo/internal/chebyshevDistance
 */

import type { Point } from "../mod.ts";

/**
 * Calculates the Chebyshev distance between two points in a 2D space
 *
 * @param p1 First point
 * @param p2 Second point
 * @returns The maximum of absolute differences of their coordinates
 */
export function chebyshevDistance(p1: Point, p2: Point): number {
  return Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
}
