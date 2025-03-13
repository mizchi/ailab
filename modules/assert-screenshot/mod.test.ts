import "npm:core-js/proposals/explicit-resource-management.js";
import { assertScreenshot } from "./mod.ts";
import pptr from "puppeteer";

/**
 * ブラウザを使用するためのヘルパー関数
 */
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
// スクリーンショットのスナップショットテスト
Deno.test("snap", async (t) => {
  // ブラウザを起動
  const WIDTH = 800;
  const HEIGHT = 600;
  await using browser = await useBrowser({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--force-device-scale-factor=1",
      "--high-dpi-support=1",
    ],
  });

  await t.step("example.com", async () => {
    // ページを開く
    const pageCtx = await browser.newPage();
    const page = pageCtx.page;
    await page.setViewport({ width: WIDTH, height: HEIGHT });
    await page.goto("https://example.com");
    // スクリーンショットを撮影
    const screenshot = await page.screenshot({
      encoding: "binary",
      type: "png",
    });
    // スクリーンショットをスナップショットと比較
    await assertScreenshot(t, screenshot as Uint8Array, {
      name: "example",
      diffThresholdPercentage: 0.05,
      updateSnapshot: false,
    });
  });

  await t.step("zenn.dev/mizchi", async () => {
    // ページを開く
    const pageCtx = await browser.newPage();
    const page = pageCtx.page;
    await page.setViewport({ width: WIDTH, height: HEIGHT });
    await page.goto("https://zenn.dev/mizchi");
    // スクリーンショットを撮影
    const screenshot = await page.screenshot({
      encoding: "binary",
      type: "png",
    });
    // スクリーンショットをスナップショットと比較
    await assertScreenshot(t, screenshot as Uint8Array, {
      name: "zenn",
      diffThresholdPercentage: 0.1,
    });
  });
});
