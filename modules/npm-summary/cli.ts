#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read --allow-write
/**
 * npm-summary CLI
 *
 * A CLI tool for fetching and analyzing TypeScript type definitions from npm packages.
 *
 * Usage examples:
 * ```
 * npm-summary zod                    # Display type definitions (latest version)
 * npm-summary zod@3.24.0             # Display type definitions for a specific version
 * npm-summary zod@latest             # Get the latest version (bypass cache)
 * npm-summary zod --no-cache         # Bypass cache
 * npm-summary zod --out=result.md    # Output results to a file
 * npm-summary ls zod@3.24.0          # List all files in a package
 * npm-summary read zod@latest/README.md  # Display a specific file from a package
 * ```
 */

import { parseArgs } from "./deps.ts";
import { getPackageFiles, listPackageFiles, readPackageFile } from "./mod.ts";

/**
 * 使い方の表示
 */
function printUsage() {
  console.error(`
Usage:
  npm-summary <package-name>[@version] [options]  # Display package type definitions
  npm-summary ls <package-name>[@version]         # List files in a package
  npm-summary read <package-name>[@version]/<file-path>  # Display a specific file from a package

Examples:
  npm-summary zod                # Display latest version type definitions
  npm-summary zod@3.21.4         # Display specific version type definitions
  npm-summary zod@latest         # Get latest version (bypass cache)
  npm-summary ls zod@3.21.4      # List files
  npm-summary read zod@latest/README.md  # Display specific file

Options:
  --no-cache           Bypass cache
  --token=<api_key>    Specify AI model API key
  --include=<pattern>  Include file patterns (can specify multiple, e.g., --include=README.md --include=*.ts)
  --dry                Dry run (show file content and token count without sending to AI)
  --out=<file>         Output results to a file
  --prompt, -p <text>  Custom prompt for summary generation (creates summary-[hash].md for different prompts)
  `);
}

/**
 * ls コマンドの処理: パッケージのファイル一覧を表示
 */
async function handleLsCommand(args: string[]) {
  if (args.length < 1) {
    console.error("Usage: deno run -A cli.ts ls <package-name>[@version]");
    Deno.exit(1);
  }

  // パッケージ名とバージョンを分離（@で区切る）
  let packageName = args[0];
  let version = "latest";
  let restArgs = args.slice(1);

  // @付きのバージョン指定を処理
  if (packageName.includes("@") && !packageName.startsWith("@")) {
    const parts = packageName.split("@");
    packageName = parts[0];
    version = parts[1];
  } else if (packageName.startsWith("@")) {
    // スコープ付きパッケージの場合（@org/pkg）、2つ目の@を探す
    const secondAtIndex = packageName.indexOf("@", 1);
    if (secondAtIndex !== -1) {
      version = packageName.substring(secondAtIndex + 1);
      packageName = packageName.substring(0, secondAtIndex);
    }
  } // 従来の形式も引き続きサポート（パッケージ名 バージョン）
  else if (restArgs.length > 0 && !restArgs[0].startsWith("-")) {
    version = restArgs[0];
    restArgs = restArgs.slice(1);
  }

  // parseArgsを使用して引数をパース
  const options = parseArgs({
    args: restArgs,
    options: {
      "no-cache": { type: "boolean", default: false },
      out: { type: "string" },
    },
    allowPositionals: true,
  });

  // オプションの処理
  // 明示的に@latest指定の場合のみキャッシュを使用しない
  // --no-cacheオプションが指定された場合もキャッシュを使用しない
  const explicitLatest = version === "latest" &&
    (packageName.includes("@") || args[0].includes("@"));
  const forceNoCache = explicitLatest;
  const useCache = !options.values["no-cache"] && !forceNoCache;
  const outFile = options.values["out"] as string | undefined;

  if (explicitLatest) {
    console.log(
      "Explicit @latest specified, bypassing cache to fetch the latest version",
    );
  } else if (options.values["no-cache"]) {
    console.log("--no-cache option specified, bypassing cache");
  }

  const files = await listPackageFiles(packageName, version, { useCache });
  const result = files.join("\n");

  // Write results to a file or display in standard output
  if (outFile) {
    await Deno.writeTextFile(outFile, result);
    console.log(`Results written to ${outFile}`);
  } else {
    console.log(result);
  }
}

/**
 * read コマンドの処理: パッケージの特定ファイルを表示
 */
async function handleReadCommand(args: string[]) {
  if (args.length < 1) {
    console.error(
      "Usage: deno run -A cli.ts read <package-name>[@version]/<file-path>",
    );
    Deno.exit(1);
  }

  let packageName: string;
  let filePath: string;
  let version = "latest";
  let restArgs: string[];

  const fullArg = args[0];
  const slashIndex = fullArg.indexOf("/");

  // Process as legacy format if '/' is not found
  if (slashIndex === -1) {
    if (args.length < 2) {
      console.error(
        "Usage: npm-summary read <package-name>[@version]/<file-path>",
      );
      console.error(
        "Or: npm-summary read <package-name>[@version] <file-path> (legacy format)",
      );
      Deno.exit(1);
    }

    // Legacy format: read <package-name>[@version] <file-path>
    packageName = args[0];
    filePath = args[1];
    restArgs = args.slice(2);
  } else {
    // New format: read <package-name>[@version]/<file-path>
    packageName = fullArg.substring(0, slashIndex);
    filePath = fullArg.substring(slashIndex + 1);
    restArgs = args.slice(1);
  }
  // Maintain necessary code for backward compatibility

  // @付きのバージョン指定を処理
  if (packageName.includes("@") && !packageName.startsWith("@")) {
    const parts = packageName.split("@");
    packageName = parts[0];
    version = parts[1];
  } else if (packageName.startsWith("@")) {
    // スコープ付きパッケージの場合（@org/pkg）、2つ目の@を探す
    const secondAtIndex = packageName.indexOf("@", 1);
    if (secondAtIndex !== -1) {
      version = packageName.substring(secondAtIndex + 1);
      packageName = packageName.substring(0, secondAtIndex);
    }
  } // 従来の形式も引き続きサポート（パッケージ名 バージョン）
  else if (restArgs.length > 0 && !restArgs[0].startsWith("-")) {
    version = restArgs[0];
    restArgs = restArgs.slice(1);
  }

  // parseArgsを使用して引数をパース
  const options = parseArgs({
    args: restArgs,
    options: {
      "no-cache": { type: "boolean", default: false },
      out: { type: "string", short: "o" },
    },
    allowPositionals: true,
  });

  // オプションの処理
  // 明示的に@latest指定の場合のみキャッシュを使用しない
  // --no-cacheオプションが指定された場合もキャッシュを使用しない
  const explicitLatest = version === "latest" &&
    (packageName.includes("@") || args[0].includes("@"));
  const forceNoCache = explicitLatest;
  const useCache = !options.values["no-cache"] && !forceNoCache;
  const outFile = options.values["out"] as string | undefined;

  if (explicitLatest) {
    console.log(
      "Explicit @latest specified, bypassing cache to fetch the latest version",
    );
  } else if (options.values["no-cache"]) {
    console.log("--no-cache option specified, bypassing cache");
  }

  const content = await readPackageFile(packageName, version, filePath, {
    useCache,
  });

  if (content === null) {
    console.error(`File not found: ${filePath}`);
    Deno.exit(1);
  }

  // Write results to a file or display in standard output
  if (outFile) {
    await Deno.writeTextFile(outFile, content);
    console.log(`Results written to ${outFile}`);
  } else {
    console.log(content);
  }
}

/**
 * 従来のコマンド処理: パッケージの型定義を表示
 */
async function handleDefaultCommand(args: string[]) {
  // パッケージ名とバージョンを分離（@で区切る）
  let packageName = args[0];
  let version = "latest";
  let restArgs = args.slice(1);

  // @付きのバージョン指定を処理
  if (packageName.includes("@") && !packageName.startsWith("@")) {
    const parts = packageName.split("@");
    packageName = parts[0];
    version = parts[1];
  } else if (packageName.startsWith("@")) {
    // スコープ付きパッケージの場合（@org/pkg）、2つ目の@を探す
    const secondAtIndex = packageName.indexOf("@", 1);
    if (secondAtIndex !== -1) {
      version = packageName.substring(secondAtIndex + 1);
      packageName = packageName.substring(0, secondAtIndex);
    }
  } // 従来の形式も引き続きサポート（パッケージ名 バージョン）
  else if (restArgs.length > 0 && !restArgs[0].startsWith("-")) {
    version = restArgs[0];
    restArgs = restArgs.slice(1);
  }

  // parseArgsを使用して引数をパース
  const options = parseArgs({
    args: restArgs,
    options: {
      // フラグオプション
      "no-cache": { type: "boolean", default: false },
      summary: { type: "boolean", default: false },
      dry: { type: "boolean", default: false },

      // 値を取るオプション
      token: { type: "string" },
      out: { type: "string" },
      prompt: { type: "string", short: "p" }, // プロンプトオプション追加
      include: { type: "string", multiple: true }, // 複数指定可能なincludeパターン
    },
    allowPositionals: true,
  });

  // オプションの処理
  // 明示的に@latest指定の場合のみキャッシュを使用しない
  // --no-cacheオプションが指定された場合もキャッシュを使用しない
  const explicitLatest = version === "latest" &&
    (packageName.includes("@") || args[0].includes("@"));
  const forceNoCache = explicitLatest;
  const useCache = !options.values["no-cache"] && !forceNoCache;
  // サマリーを常に有効にする（--summaryオプションは無視）
  const generateSummary = true;
  const dry = !!options.values["dry"];
  const token = options.values["token"] as string | undefined;
  const outFile = options.values["out"] as string | undefined;
  const include = options.values["include"] as string[] | undefined;
  const prompt = options.values["prompt"] as string | undefined;

  if (explicitLatest) {
    console.log(
      "Explicit @latest specified, bypassing cache to fetch the latest version",
    );
  } else if (options.values["no-cache"]) {
    console.log("--no-cache option specified, bypassing cache");
  }

  // パッケージファイルを取得
  const result = await getPackageFiles(packageName, version, {
    useCache,
    generateSummary,
    token,
    include,
    dry,
    prompt,
  });

  // Write results to a file or display in standard output
  if (outFile) {
    await Deno.writeTextFile(outFile, result);
    console.log(`Results written to ${outFile}`);
  } else {
    console.log(result);
  }
}

if (import.meta.main) {
  const args = Deno.args;

  if (args.length < 1) {
    printUsage();
    Deno.exit(1);
  }

  // コマンドの処理
  const command = args[0];

  try {
    switch (command) {
      case "ls":
        await handleLsCommand(args.slice(1));
        break;
      case "read":
        await handleReadCommand(args.slice(1));
        break;
      default:
        // 従来のコマンド (package-name として扱う)
        await handleDefaultCommand(args);
        break;
    }
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    Deno.exit(1);
  }
}
