// import "npm:core-js/proposals/explicit-resource-management.js";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { Buffer } from "node:buffer";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { printImage } from "@mizchi/imgcat";

// スナップショットモードの型
export type SnapshotMode = "update" | "assert";

// グローバルなスナップショットモード
// let _mode: SnapshotMode;
// let _imgcat: boolean;
/**
 * スナップショットモードを取得する
 * コマンドラインに --update または -u が含まれている場合は "update" モード
 * そうでない場合は "assert" モード
 */
function getMode() {
  return {
    update: Deno.args.some((arg) => arg === "--update" || arg === "-u"),
    imgcat: Deno.args.some((arg) => arg === "--imgcat"),
  };
  // const postArgs = Deno.args;
  // _mode = postArgs.some((arg) => arg === "--update" || arg === "-u")
  //   ? "update"
  //   : "assert";
  // _imgcat = postArgs.some((arg) => arg === "--imgcat");
  // console.log("mode", _mode, _imgcat);

  // return _mode;
}

/**
 * スクリーンショットのバッファからPNGオブジェクトを作成する関数
 */
function bufferToPng(buffer: Uint8Array | Buffer): Promise<PNG> {
  return new Promise((resolve, reject) => {
    const png = new PNG();
    // Uint8ArrayをBufferに変換（必要な場合）
    const bufferData = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    png.parse(bufferData, (error: Error | null, data: PNG) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}
async function pngToBinary(png: PNG): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    png.pack()
      .on("data", (chunk: Buffer) => chunks.push(chunk))
      .on("end", () => {
        try {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        } catch (error: unknown) {
          reject(error);
        }
      })
      .on("error", (error: Error) => reject(error));
  });
}

// /**
//  * PNGファイルを保存する関数
//  */
// export async function savePng(png: PNG, filePath: string): Promise<void> {
//   // ディレクトリが存在しない場合は作成
//   const dir = filePath.substring(0, filePath.lastIndexOf("/"));
//   if (!existsSync(dir)) {
//     mkdirSync(dir, { recursive: true });
//   }

//   // PNGをバッファに変換して保存
//   return new Promise<void>((resolve, reject) => {
//     const chunks: Buffer[] = [];
//     png.pack()
//       .on("data", (chunk: Buffer) => chunks.push(chunk))
//       .on("end", () => {
//         try {
//           const buffer = Buffer.concat(chunks);
//           writeFileSync(filePath, buffer);
//           resolve();
//         } catch (error: unknown) {
//           reject(error);
//         }
//       })
//       .on("error", (error: Error) => reject(error));
//   });
// }

/**
 * 画像をリサイズする関数
 * @param png 元の画像
 * @param targetWidth 目標の幅
 * @param targetHeight 目標の高さ
 * @returns リサイズされた画像
 */
export function resizePng(
  png: PNG,
  targetWidth: number,
  targetHeight: number,
): PNG {
  // 元の画像のサイズ
  const { width: srcWidth, height: srcHeight } = png;

  // リサイズ比率を計算
  const widthRatio = srcWidth / targetWidth;
  const heightRatio = srcHeight / targetHeight;

  // 新しいPNGオブジェクトを作成
  const resized = new PNG({ width: targetWidth, height: targetHeight });

  // 単純なニアレストネイバー法でリサイズ
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      // ターゲット画像のインデックス
      const targetIdx = (y * targetWidth + x) << 2;

      // 元画像の対応する座標を計算
      const srcX = Math.min(Math.floor(x * widthRatio), srcWidth - 1);
      const srcY = Math.min(Math.floor(y * heightRatio), srcHeight - 1);
      const srcIdx = (srcY * srcWidth + srcX) << 2;

      // ピクセルデータをコピー
      resized.data[targetIdx] = png.data[srcIdx]; // R
      resized.data[targetIdx + 1] = png.data[srcIdx + 1]; // G
      resized.data[targetIdx + 2] = png.data[srcIdx + 2]; // B
      resized.data[targetIdx + 3] = png.data[srcIdx + 3]; // A
    }
  }

  return resized;
}

/**
 * 2つのPNGを比較する関数（最適化版）
 */
export async function comparePngs(
  png1: PNG,
  png2: PNG,
  options: {
    threshold: number;
    savePath?: string;
    maxSize?: number; // 最大サイズ（幅または高さ）
    skipAlpha?: boolean; // アルファチャンネルを無視するかどうか
  } = {
    threshold: 0.1,
    maxSize: 800, // デフォルトの最大サイズ
    skipAlpha: true, // デフォルトでアルファチャンネルを無視
  },
): Promise<{
  numDiffPixels: number;
  width: number;
  height: number;
  diff: PNG;
  diffPercentage: number; // 差分の割合（%）を追加
}> {
  // 画像サイズが大きい場合はリサイズ
  let resizedPng1 = png1;
  let resizedPng2 = png2;

  const maxSize = options.maxSize || 800;

  // 画像が大きい場合はリサイズ
  if (png1.width > maxSize || png1.height > maxSize) {
    const aspectRatio = png1.width / png1.height;
    let newWidth, newHeight;

    if (aspectRatio >= 1) {
      // 横長の画像
      newWidth = maxSize;
      newHeight = Math.round(maxSize / aspectRatio);
    } else {
      // 縦長の画像
      newHeight = maxSize;
      newWidth = Math.round(maxSize * aspectRatio);
    }

    resizedPng1 = resizePng(png1, newWidth, newHeight);
  }

  if (png2.width > maxSize || png2.height > maxSize) {
    const aspectRatio = png2.width / png2.height;
    let newWidth, newHeight;

    if (aspectRatio >= 1) {
      // 横長の画像
      newWidth = maxSize;
      newHeight = Math.round(maxSize / aspectRatio);
    } else {
      // 縦長の画像
      newHeight = maxSize;
      newWidth = Math.round(maxSize * aspectRatio);
    }

    resizedPng2 = resizePng(png2, newWidth, newHeight);
  }

  // 画像サイズが異なる場合は、小さい方に合わせる
  const width = Math.min(resizedPng1.width, resizedPng2.width);
  const height = Math.min(resizedPng1.height, resizedPng2.height);

  // 新しいPNGオブジェクトを作成して、データをコピー
  const finalPng1 = new PNG({ width, height });
  const finalPng2 = new PNG({ width, height });

  // 元の画像から必要な部分だけをコピー
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) << 2; // RGBA の4バイト分

      // 1枚目の画像からコピー
      if (x < resizedPng1.width && y < resizedPng1.height) {
        const srcIdx1 = (y * resizedPng1.width + x) << 2;
        finalPng1.data[idx] = resizedPng1.data[srcIdx1]; // R
        finalPng1.data[idx + 1] = resizedPng1.data[srcIdx1 + 1]; // G
        finalPng1.data[idx + 2] = resizedPng1.data[srcIdx1 + 2]; // B
        finalPng1.data[idx + 3] = resizedPng1.data[srcIdx1 + 3]; // A
      }

      // 2枚目の画像からコピー
      if (x < resizedPng2.width && y < resizedPng2.height) {
        const srcIdx2 = (y * resizedPng2.width + x) << 2;
        finalPng2.data[idx] = resizedPng2.data[srcIdx2]; // R
        finalPng2.data[idx + 1] = resizedPng2.data[srcIdx2 + 1]; // G
        finalPng2.data[idx + 2] = resizedPng2.data[srcIdx2 + 2]; // B
        finalPng2.data[idx + 3] = resizedPng2.data[srcIdx2 + 3]; // A
      }
    }
  }

  // 差分用のPNGを作成
  const diff = new PNG({ width, height });

  // pixelmatchオプションを設定
  const pixelmatchOptions = {
    threshold: options.threshold,
    includeAA: true, // アンチエイリアスを含める
    alpha: options.skipAlpha ? 0 : 1, // アルファチャンネルを無視するかどうか（0: 無視する、1: 考慮する）
  };

  // pixelmatchで比較
  const numDiffPixels = pixelmatch(
    finalPng1.data,
    finalPng2.data,
    // write buffer
    diff.data,
    width,
    height,
    pixelmatchOptions,
  );

  // 差分の割合を計算
  const diffPercentage = (numDiffPixels / (width * height)) * 100;
  return { numDiffPixels, width, height, diff: diff as any, diffPercentage };
}

/**
 * スクリーンショットを比較し、差分があれば保存する関数（最適化版）
 */
let _contextCalledCount = new Map<string, number>();

export async function assertScreenshot(
  t: Deno.TestContext,
  // name: string,
  screenshot: Uint8Array | Buffer,
  options: {
    name: string; // スナップショットの名前
    threshold?: number;
    mode?: SnapshotMode;
    updateSnapshot?: boolean;
    maxSize?: number; // 最大サイズ（幅または高さ）
    skipAlpha?: boolean; // アルファチャンネルを無視するかどうか
    diffThresholdPercentage?: number; // 許容される差分の割合（%）
  },
): Promise<void> {
  const modes = getMode();
  let lastContext = t;
  while (true) {
    if (lastContext.parent) {
      lastContext = lastContext.parent;
    } else {
      break;
    }
  }
  const testFileName = lastContext.name.replace(/\.tsx?/, "");
  const context = options.name ?? testFileName;
  const index = _contextCalledCount.get(context) || 0;
  _contextCalledCount.set(context, index + 1);
  const snapshotDir = new URL("./__snapshots__", t.origin).pathname;
  // const snapshotDir = "__snapshots__";
  if (!existsSync(snapshotDir)) {
    mkdirSync(snapshotDir, { recursive: true });
  }

  const snapshotFilePath = path.join(snapshotDir, `${context}-${index}.png`);
  const diffFilePath = path.join(snapshotDir, `${context}-${index}-diff.png`);
  const png1 = await bufferToPng(screenshot);

  // スナップショットが存在しない場合、または更新モードの場合は作成
  if (
    !existsSync(snapshotFilePath) || modes.update || options.updateSnapshot
  ) {
    // スナップショットを保存
    console.log(
      `%cCreate snapshot by first run: ${snapshotFilePath}`,
      "color: blue;",
    );
    const pngBuffer = await pngToBinary(png1);
    await Deno.writeFile(snapshotFilePath, pngBuffer);
    return;
  }

  // スナップショットを読み込む
  const snapshotBuffer = Deno.readFileSync(snapshotFilePath);
  // PNG.sync.read の代わりに parse を使用
  const png2 = await bufferToPng(snapshotBuffer);
  const diffPath = path.join(snapshotDir, `${context}-${index}-diff.png`);

  // 画像を比較（最適化版の関数を使用）
  const compareOptions = {
    threshold: options.threshold || 0.1,
    savePath: diffPath,
    maxSize: options.maxSize || 800,
    skipAlpha: options.skipAlpha !== false, // デフォルトでtrue
  };

  const { numDiffPixels, width, height, diff, diffPercentage } =
    await comparePngs(
      png1,
      png2,
      compareOptions,
    );

  // 許容される差分の割合
  const diffThresholdPercentage = options.diffThresholdPercentage || 0;

  // 差分の割合が閾値を超える場合はエラー
  if (diffPercentage > diffThresholdPercentage) {
    const diffPngBuffer = await pngToBinary(diff);
    Deno.writeFileSync(diffFilePath, diffPngBuffer);
    if (modes.imgcat) {
      printImage(diffPngBuffer);
    }
    throw new Error(
      `Screenshot does not match snapshot. ${numDiffPixels} pixels (${
        diffPercentage.toFixed(2)
      }%) are different. ` +
        `Threshold: ${diffThresholdPercentage}%. Diff saved to ${diffFilePath}`,
    );
  }
}
