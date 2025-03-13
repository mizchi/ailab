import "npm:core-js/proposals/explicit-resource-management.js";

import { Async, expect } from "@std/expect";

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

import pptr from "npm:puppeteer";
import pixelmatch from "npm:pixelmatch";
import PNG from "npm:pngjs";
Deno.test("with pptr", async (t) => {
  async function useBrowser(options: pptr.LaunchOptions = {}) {
    const browser = await pptr.launch(options);
    let pages: Set<pptr.Page> = new Set();
    return {
      browser,
      async newPage(): Promise<{ page: pptr.Page } & AsyncDisposable> {
        const page = await browser.newPage();
        pages.add(page);
        Object.defineProperty(page, Symbol.asyncDispose, {
          value: async () => {
            pages.delete(page);
            await page.close();
          },
        });
        return {
          page,
          async [Symbol.asyncDispose]() {
            pages.delete(page);
            await page.close();
          },
        } as any;
      },
      async [Symbol.asyncDispose]() {
        await browser.close();
        // Maybe pptr can not dispose all timers
        await new Promise((r) => setTimeout(r, 500));
      },
    };
  }
  await using browserCtx = await useBrowser({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--force-device-scale-factor=1",
      "--high-dpi-support=1",
    ],
  });
  await t.step("example.com", async () => {
    await using pageCtx = await browserCtx.newPage();
    const page = pageCtx.page;
    await pageCtx.page.setViewport({
      width: 800,
      height: 1000,
    });
    await pageCtx.page.goto("https://example.com");

    const example = (await pageCtx.page.$("body"))!;
    const bbox = (await example.boundingBox())!;
    // const title = await pageCtx.page.title();
    // expect(title).toBe("Example Domain");
    const diff = new PNG({ width: img1.width, height: img1.height });
    pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {
      threshold: 0.1,
    });
    const clipRect = {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
    };
    const screenshot = await pageCtx.page.screenshot({
      // fullPage: true,
      encoding: "binary",
      clip: clipRect,
    });

    const screenshot2 = await pageCtx.page.screenshot({
      // fullPage: true,
      encoding: "binary",
      clip: clipRect,
    });
    const matched = pixelmatch(
      screenshot,
      screenshot2,
      null as any,
      bbox!.width,
      bbox!.height,
      {
        // threshold: 0.1,
      },
      // { threshold: 0.1 },
    );
    console.log("matched", matched);
    // Buffer.from(screenshot, "base64"),
    // Buffer.from(screenshot2, "base64"),
    // null,

    // expect(screenshot).toMatchSnapshot();
    // await assertSnapshot(t, screenshot);
    // expe
  });

  await t.step("yahoo.co.jp", async () => {
    await using pageCtx = await browserCtx.newPage();
    await pageCtx.page.goto("https://yahoo.co.jp");
    const title = await pageCtx.page.title();
    expect(title).toBe("Yahoo! JAPAN");

    // expect(title).toMatch;
  });
});

import { assertSnapshot } from "@std/testing/snapshot";

Deno.test("isSnapshotMatch", async (t) => {
  const a = {
    hello: "world!",
    example: 123,
  };
  await assertSnapshot(t, a);
});
