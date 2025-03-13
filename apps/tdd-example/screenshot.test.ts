import "npm:core-js/proposals/explicit-resource-management.js";
import { expect } from "@std/expect";
import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import pptr from "npm:puppeteer";
import {
  assertScreenshot,
  comparePngs,
  useBrowser,
} from "./assert-screenshot.ts";

// スクリーンショットのスナップショットテスト
Deno.test("snap", async (t) => {
  // ブラウザを起動
  const WIDTH = 800;
  const HEIGHT = 600;
  // const browser = await pptr.launch({
  //   headless: true,
  //   args: [
  //     "--no-sandbox",
  //     "--disable-setuid-sandbox",
  //     "--force-device-scale-factor=1",
  //     "--high-dpi-support=1",
  //   ],
  // });
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
      threshold: 0.04,
      // 初回実行時やスナップショットを更新したい場合は true にする
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
      threshold: 0,
    });
  });
});

// // わざと失敗するテスト（異なるページを比較して例外が発生）
// Deno.test("異なるページの比較で例外が発生するテスト", async (t) => {
//   // ブラウザを起動
//   const browser = await pptr.launch({
//     headless: true,
//     args: [
//       "--no-sandbox",
//       "--disable-setuid-sandbox",
//       "--force-device-scale-factor=1",
//       "--high-dpi-support=1",
//     ],
//   });

//   try {
//     // 最初のページを開いてスナップショットを作成
//     const page1 = await browser.newPage();
//     await page1.setViewport({ width: 800, height: 600 });
//     await page1.goto("https://zenn.dev/mizchi");

//     // スクリーンショットを撮影
//     const screenshot1 = await page1.screenshot({
//       encoding: "binary",
//       type: "png",
//     });

//     // スナップショットを作成（初回のみ）
//     await assertScreenshot(t, screenshot1 as Uint8Array, {
//       threshold: 0.1,
//       // 初回実行時は true にする
//       updateSnapshot: !existsSync("__snapshots__/screenshot-zenn-0.png"),
//     });

//     // 別のページを開いて比較（わざと失敗させる）
//     const page2 = await browser.newPage();
//     await page2.setViewport({ width: 800, height: 600 });
//     await page2.goto(
//       "https://zenn.dev/mizchi/articles/ts-using-resource-management",
//     );

//     const screenshot2 = await page2.screenshot({
//       encoding: "binary",
//       type: "png",
//     });

//     expect((async () => {
//       // 異なるページのスクリーンショットを比較（失敗するはず）
//       await assertScreenshot(t, screenshot2 as Uint8Array, {
//         threshold: 0.1,
//         updateSnapshot: false,
//       });
//     })()).rejects.toThrow(Error);
//   } finally {
//     // ブラウザを閉じる
//     await browser.close();
//     // Puppeteerのタイマーが残っている可能性があるので、少し待つ
//     await new Promise((r) => setTimeout(r, 500));
//   }
// });

// // expect() を使用して明示的にアサーションが失敗するテスト
// Deno.test("expect() を使用して明示的に失敗するテスト", async (t) => {
//   // ブラウザを起動
//   const browser = await pptr.launch({
//     headless: true,
//     args: [
//       "--no-sandbox",
//       "--disable-setuid-sandbox",
//       "--force-device-scale-factor=1",
//       "--high-dpi-support=1",
//     ],
//   });

//   try {
//     // 2つの異なるページを開いてスクリーンショットを撮影
//     const page1 = await browser.newPage();
//     await page1.setViewport({ width: 800, height: 600 });
//     await page1.goto("https://example.com");

//     const page2 = await browser.newPage();
//     await page2.setViewport({ width: 800, height: 600 });
//     await page2.goto("https://zenn.dev/mizchi");

//     // スクリーンショットを撮影
//     const screenshot1 = await page1.screenshot({
//       encoding: "binary",
//       type: "png",
//     });
//     const screenshot2 = await page2.screenshot({
//       encoding: "binary",
//       type: "png",
//     });

//     // バッファからPNGオブジェクトを作成
//     const png1 = await bufferToPng(screenshot1 as Buffer);
//     const png2 = await bufferToPng(screenshot2 as Buffer);

//     // 画像を比較
//     const { numDiffPixels } = await comparePngs(png1, png2, {
//       threshold: 0.1,
//     });

//     console.log("異なるページの差分ピクセル数:", numDiffPixels);

//     // 異なるページなので差分ピクセル数は0ではないはず
//     // わざと失敗するアサーション
//     expect(numDiffPixels).toBe(0);
//   } finally {
//     // ブラウザを閉じる
//     await browser.close();
//     // Puppeteerのタイマーが残っている可能性があるので、少し待つ
//     await new Promise((r) => setTimeout(r, 500));
//   }
// });
