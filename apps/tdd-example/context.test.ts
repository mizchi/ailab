Deno.test("a", async (t) => {
  await t.step("b", async (t) => {
    console.log(t);
  });
});
import { assertSnapshot } from "@std/testing/snapshot";
Deno.test("a", async (t) => {
  await t.step("b", async (t) => {
    console.log(t);
    assertSnapshot(t, {
      foo: "bar",
    });
  });
});
