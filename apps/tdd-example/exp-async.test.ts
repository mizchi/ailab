import "npm:core-js/proposals/explicit-resource-management.js";

import { type Async, expect } from "@std/expect";

Deno.test("check async throw", async () => {
  await expect((async () => {
    throw new Error("disposed");
  })()).rejects.toThrow(Error);
});

Deno.test("await using with rejects", async () => {
  await expect((async () => {
    await using _ = {
      [Symbol.asyncDispose]() {
        throw new Error("disposed");
      },
    };
  })()).rejects.toThrow("disposed");
});

Deno.test("catch SuppressedError", async () => {
  await expect((async () => {
    await using d = new AsyncDisposableStack();
    d.defer(() => {
      throw new Error("d1");
    });
    d.defer(() => {
      throw new Error("d2");
    });
  })()).rejects.toThrow(SuppressedError);
});

// ---

Deno.test("without using", async (t) => {
  let v: number | undefined = undefined;
  await t.step("before", async () => {
    v = 42;
  });
  await t.step("use", async () => {
    expect(v).toBe(42);
  });
  await t.step("afterAll", async () => {
    v = undefined;
  });
});

Deno.test("with using", async (t) => {
  function val<T>(v: T | undefined = undefined) {
    let _v: T | undefined = v;
    let _disposed = false;
    return {
      get(): T | undefined {
        if (_disposed) {
          throw new Error("disposed");
        }
        return _v;
      },
      set(v: T) {
        if (_disposed) {
          throw new Error("disposed");
        }
        _v = v;
      },
      get disposed() {
        return _disposed;
      },
      [Symbol.dispose]() {
        _disposed = true;
        _v = undefined;
      },
    };
  }
  using v = val(42);
  await t.step("use", () => {
    expect(v.get()).toBe(42);
  });

  await t.step("not disposed", () => {
    expect(v.disposed).toBe(false);
  });

  await t.step("dispose", () => {
    v[Symbol.dispose]();
  });

  await t.step("disposed", () => {
    expect(v.disposed).toBe(true);
    expect(() => v.get()).toThrow("disposed");
    expect(() => v.set(1)).toThrow("disposed");
  });
});

Deno.test("with using", async (t) => {
  function valAsync<T>(load: () => NonNullable<T>) {
    let _disposed = false;
    let _v: T | undefined = undefined;
    return {
      async load(): Promise<T> {
        if (_disposed) {
          throw new Error("Disposed");
        }
        if (_v === undefined) _v = load();
        _v = load();
        return _v;
      },
      getSync(): T {
        if (_disposed) {
          throw new Error("Disposed");
        }
        if (_v === undefined) throw new Error("NotLoaded");
        return _v;
      },
      get disposed() {
        return _disposed;
      },
      [Symbol.dispose]() {
        _disposed = true;
        _v = undefined;
      },
    };
  }
  using v = valAsync(() => 42);
  await t.step("use", async () => {
    expect(() => v.getSync()).toThrow("NotLoaded");
    expect(await v.load()).toBe(42);
    expect(v.getSync()).toBe(42);
  });
  await t.step("not disposed", () => {
    expect(v.disposed).toBe(false);
  });

  await t.step("dispose", () => {
    v[Symbol.dispose]();
  });

  await t.step("disposed", () => {
    expect(v.disposed).toBe(true);
    expect((() => v.load())()).rejects.toThrow("Disposed");
  });
});
