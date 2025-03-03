/* @script */
import * as ts from "npm:typescript";
import { type dirname, join } from "jsr:@std/path";

/**
 * TypeScript の import 解決プロセスをトレースするスクリプト
 * Deno 特有の挙動（.ts 拡張子のインポート、npm/jsr モジュールの解決）に対応
 * 使用方法: deno run -A poc/trace_import_resolution.ts <target_file>
 */

interface DenoResolveConfig {
  importMap?: {
    imports: Record<string, string>;
    scopes: Record<string, Record<string, string>>;
  };
}

function getDenoCachePath() {
  const home = Deno.env.get("HOME");
  if (!home) throw new Error("HOME environment variable not set");
  return join(home, ".cache", "deno");
}

async function readDenoJson(): Promise<DenoResolveConfig> {
  try {
    const text = await Deno.readTextFile("deno.json");
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function createCustomCompilerHost(
  options: ts.CompilerOptions,
): ts.CompilerHost {
  const defaultHost = ts.createCompilerHost(options);
  const denoCachePath = getDenoCachePath();

  return {
    ...defaultHost,
    resolveModuleNames: (
      moduleNames: string[],
      containingFile: string,
      _reusedNames: string[] | undefined,
      redirectedReference: ts.ResolvedProjectReference | undefined,
      options: ts.CompilerOptions,
    ) => {
      return moduleNames.map((moduleName) => {
        console.log("\n=== Module Resolution ===");
        console.log(`Resolving: ${moduleName}`);
        console.log(`From file: ${containingFile}`);

        // npm: または jsr: プロトコルの処理
        if (moduleName.startsWith("npm:") || moduleName.startsWith("jsr:")) {
          const [protocol, ...rest] = moduleName.split(":");
          const packagePath = rest.join(":");
          const cachePath = protocol === "npm"
            ? join(denoCachePath, "npm/registry.npmjs.org", packagePath)
            : join(denoCachePath, "jsr", packagePath);

          console.log(`Resolving ${protocol} module from cache: ${cachePath}`);

          return {
            resolvedFileName: cachePath,
            extension: ts.Extension.Ts,
            isExternalLibraryImport: true,
          };
        }

        // モジュール解決のオプションを設定
        const moduleResolutionHost: ts.ModuleResolutionHost = {
          fileExists: (fileName: string): boolean => {
            // .ts 拡張子の自動解決
            const exists = defaultHost.fileExists!(fileName);
            if (exists) {
              console.log(`  File exists: ${fileName}`);
              return true;
            }

            // 拡張子を試す
            const extensions = [".ts", ".tsx", ".d.ts", ".js", ".jsx", ".mjs"];
            for (const ext of extensions) {
              if (!fileName.endsWith(ext)) {
                const withExt = fileName + ext;
                const existsWithExt = defaultHost.fileExists!(withExt);
                if (existsWithExt) {
                  console.log(`  File exists with extension: ${withExt}`);
                  return true;
                }
              }
            }

            console.log(`  File does not exist: ${fileName}`);
            return false;
          },
          readFile: (fileName: string): string | undefined => {
            console.log(`  Reading file: ${fileName}`);
            return defaultHost.readFile!(fileName);
          },
          trace: (s: string) => console.log(`  Trace: ${s}`),
          directoryExists: (directoryName: string): boolean => {
            const exists = defaultHost.directoryExists?.(directoryName) ??
              false;
            console.log(
              `  Directory ${
                exists ? "exists" : "does not exist"
              }: ${directoryName}`,
            );
            return exists;
          },
          realpath: defaultHost.realpath,
          getCurrentDirectory: defaultHost.getCurrentDirectory,
          getDirectories: defaultHost.getDirectories,
        };

        // モジュールを解決
        const resolved = ts.resolveModuleName(
          moduleName,
          containingFile,
          options,
          moduleResolutionHost,
        );

        if (resolved.resolvedModule) {
          console.log("Resolved to:", resolved.resolvedModule.resolvedFileName);
          if (resolved.resolvedModule.extension) {
            console.log("Extension:", resolved.resolvedModule.extension);
          }
          if (resolved.resolvedModule.isExternalLibraryImport) {
            console.log("Is external library import");
          }
        } else {
          console.log("Failed to resolve module");
        }

        return resolved.resolvedModule;
      });
    },
    getSourceFile: (
      fileName: string,
      languageVersion: ts.ScriptTarget,
      onError?: (message: string) => void,
      shouldCreateNewSourceFile?: boolean,
    ) => {
      console.log(`\nReading source file: ${fileName}`);
      return defaultHost.getSourceFile(
        fileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
      );
    },
  };
}

async function analyzeImports(filePath: string) {
  const denoConfig = await readDenoJson();

  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowJs: true,
    checkJs: true,
    strict: true,
    // Deno 特有の設定
    allowImportingTsExtensions: true,
    noEmit: true, // allowImportingTsExtensions を有効にするために必要
    resolveJsonModule: true,
    // モジュール解決の設定
    baseUrl: ".",
    paths: {
      "npm:*": [join(getDenoCachePath(), "npm/registry.npmjs.org/*")],
      "jsr:*": [join(getDenoCachePath(), "jsr/*")],
      ...(denoConfig.importMap?.imports ?? {}),
    },
  };

  const host = createCustomCompilerHost(options);
  const program = ts.createProgram([filePath], options, host);

  console.log("\n=== Type Checking ===");
  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length > 0) {
    console.log("\nDiagnostics:");
    diagnostics.forEach((diagnostic) => {
      if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(
          diagnostic.file,
          diagnostic.start!,
        );
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          "\n",
        );
        console.log(
          `${diagnostic.file.fileName} (${line + 1},${
            character + 1
          }): ${message}`,
        );
      } else {
        console.log(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        );
      }
    });
  } else {
    console.log("No type errors found");
  }
}

if (import.meta.main) {
  const args = Deno.args;
  if (args.length !== 1) {
    console.error(
      "Usage: deno run -A poc/trace_import_resolution.ts <target_file>",
    );
    Deno.exit(1);
  }

  const targetFile = args[0];
  console.log(`Analyzing imports for: ${targetFile}`);
  analyzeImports(targetFile);
}

// Tests
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("script exists", () => {
  expect(true).toBe(true);
});
