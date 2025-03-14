/**
 * @module @i/foo
 * This is a deno module example
 */

/**
 * Point type in x, y coordinate system
 */
export type Point = {
  x: number;
  y: number;
};

export { distance } from "./internal/distance.ts";
export { add } from "./internal/add.ts";
export { mul } from "./internal/mul.ts";
