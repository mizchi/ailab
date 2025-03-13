import { decodeBase64, encodeBase64 } from "@std/encoding/base64";
import path from "node:path";
import sharp from "sharp";

export function printImageFromBase64(
  base64: string,
  size?: number,
) {
  if (!size) {
    size = decodeBase64(base64).byteLength;
  }
  Deno.stdout.writeSync(
    new TextEncoder().encode(
      `\x1B]1337;File=inline=1;size=${size}:${base64}\x07`,
    ),
  );
}
export function printImage(
  imageData: Uint8Array,
  size = imageData.byteLength,
) {
  const b64 = encodeBase64(imageData);
  printImageFromBase64(b64, size);
}
export function printImageByPath(
  fpath: string,
) {
  const imageData = Deno.readFileSync(fpath);
  printImage(imageData);
}

async function resize(
  transformed: sharp.Sharp,
  // sharp
  {
    width,
    height,
    scale = 1.0,
    preserveAspectRatio = true,
  }: {
    width?: number;
    height?: number;
    scale?: number;
    preserveAspectRatio?: boolean;
  },
) {
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
  return transformed.png().toBuffer();
}

export async function imgcat(input: string | Uint8Array, options: {
  width?: number;
} = {}) {
  const displayWidth = options.width ?? Deno.consoleSize().columns * 6;
  let binary;
  if (input instanceof Uint8Array) {
    binary = input;
  } else if (input.startsWith("data:image")) {
    // const base64 = input.split(",")[1];
    binary = decodeBase64(input);
  } else {
    const resolved = path.isAbsolute(input)
      ? input
      : path.resolve(Deno.cwd(), input);
    binary = await Deno.readFile(resolved);
  }
  const resized = await resize(
    sharp(binary),
    { width: displayWidth },
  );
  printImage(resized, displayWidth);
}

if (import.meta.main) {
  const target = Deno.args[0];
  const targetPath = path.join(Deno.cwd(), target);
  await imgcat(targetPath);
}
