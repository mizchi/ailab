/* @script */
import { join } from "jsr:@std/path";
import { z } from "npm:zod";
import { add } from "./math.ts";

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

console.log(join("a", "b"));
console.log(add(1, 2));
