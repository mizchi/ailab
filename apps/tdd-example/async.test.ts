import { test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { AsyncDisposableStack } from "jsr:@nick/dispose";

test("async using", async () => {
  let disposeCount = 0;
  async function app() {
    return {
      getValue() {
        return disposeCount;
      },
      async [Symbol.asyncDispose]() {
        disposeCount++;
      },
    };
  }
  {
    await using result = await app();
    expect(result.getValue()).toBe(0);
  }
  await using result = await app();
  expect(result.getValue()).toBe(1);
});

test("async using", async () => {
  let disposeCount = 0;
  {
    await using _ = {
      [Symbol.asyncDispose]: async () => {
        disposeCount++;
      },
    };
    expect(disposeCount).toBe(0);
  }
  expect(disposeCount).toBe(1);
});

test("release", async () => {
  let shouldBeTrue = false;
  try {
    await using _ = {
      async [Symbol.asyncDispose]() {
        shouldBeTrue = true;
      },
    };
    throw new Error("intercepted");
  } catch (error) {
    expect((error as Error).message).toBe("intercepted");
    expect(shouldBeTrue).toBe(true);
  }
});

test("AsyncDisposable", async () => {
  const x = new Map();
  {
    await using d = new AsyncDisposableStack();
    d.adopt(x, () => x.clear());
    x.set("foo", "bar");
    expect(x.size).toBe(1);
  }
  expect(x.size).toBe(0);
});

test("AsyncDisposable#adop error", async () => {
  const x = new Map<string, number>();
  {
    await using d = new AsyncDisposableStack();
    d.adopt(x, async () => {
      x.set("xxx", 0);
    });
    d.adopt(x, async () => {
      throw new Error("intercepted");
    });
    d.adopt(x, async () => {
      x.set("yyy", 0);
    });
    x.set("foo", 1);
    expect(x.size).toBe(1);
  }
  expect([...x.keys()]).toEqual([
    "foo",
    "yyy",
    "xxx",
  ]);
});

test("AsyncDisposable#defer", async () => {
  const x = new Map<string, number>();
  {
    await using d = new AsyncDisposableStack();
    d.defer(async () => {
      x.set("xxx", 0);
    });
    d.defer(async () => {
      throw new Error("intercepted");
    });
    d.defer(async () => {
      x.set("yyy", 0);
    });
    x.set("foo", 1);
    expect(x.size).toBe(1);
  }
  expect([...x.keys()]).toEqual([
    "foo",
    "yyy",
    "xxx",
  ]);
});
