import sharp from "npm:sharp";
import process from "node:process";

const IMGCAT_PREIX = "\x1B]1337;File=";
const IMGCAT_SUFFIX = "\x07";

async function printImage(
  imageData: Uint8Array,
  {
    fileName = undefined,
    width = undefined,
    height = undefined,
    scale = 1,
    preserveAspectRatio = true,
  }: {
    fileName?: string;
    width?: number;
    height?: number;
    scale?: number;
    preserveAspectRatio?: boolean;
  } = {},
) {
  const transformed = sharp(imageData);
  const metadata = await transformed.metadata();

  const aspectRatio = metadata.width! / metadata.height!;
  if (width && !height) {
    height = aspectRatio * width;
    transformed.resize(~~width, ~~height, {
      fit: preserveAspectRatio ? "inside" : "fill",
    });
  }
  if (height && !width) {
    width = height / aspectRatio;
    transformed.resize(~~width, ~~height, {
      fit: preserveAspectRatio ? "inside" : "fill",
    });
  }
  if (scale !== 1) {
    width = metadata.width! * scale;
    height = metadata.height! * scale;
    transformed.resize(~~width, ~~height, {
      fit: preserveAspectRatio ? "inside" : "fill",
    });
  }

  const buffer = await transformed.png().toBuffer();
  const base64Data = buffer.toString("base64");
  _print(buffer.length, base64Data);
}
function _print(size: number, data: string) {
  process.stdout.write(`\x1B]1337;File=inline=1;size=${size}:${data}\x07`);
}

const imageData = await Deno.readFile(
  new URL("./image.png", import.meta.url).pathname,
);

// await printImage(imageData, { fileName: "image.png", scale: 0.5 });

import path from "node:path";
if (import.meta.main) {
  const resolved = path.join(Deno.cwd(), Deno.args[0]);
  const imageData = await Deno.readFile(resolved);
  await printImage(imageData, {});
  // console.log("Printed image");
}
