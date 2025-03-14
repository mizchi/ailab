import { sub } from "./sub.ts";
import { expect } from "@std/expect";

Deno.test("sub.test.ts", () => {
  const result = sub(5, 3);
  expect(result).toEqual(2);
});
