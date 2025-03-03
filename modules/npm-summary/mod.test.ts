import { expect } from "./deps.ts";
import { test } from "jsr:@std/testing/bdd";
import {
  convertToDefinitionPath,
  extractTypeInfo,
  findDtsFile,
  formatImportPath,
  getEntrypoints,
  normalizePath,
} from "./mod.ts";
import type { Package } from "./types.ts";

test("extractTypeInfo - basic types", () => {
  const dtsContent = `
    export interface User {
      id: string;
      name: string;
    }
    export type ID = string;
    export enum Status {
      Active,
      Inactive
    }
    export const VERSION = "1.0.0";
    export function getData(): void;
    export default User;
  `;

  const types = extractTypeInfo(dtsContent);

  expect(types).toContain("interface User");
  expect(types).toContain("type ID");
  expect(types).toContain("enum Status");
  expect(types).toContain("const VERSION");
  expect(types).toContain("function getData");
  expect(types).toContain("default User");
});

test("normalizePath", () => {
  expect(normalizePath("./dist/index.d.ts")).toBe("dist/index.d.ts");
  expect(normalizePath("dist/index.d.ts")).toBe("dist/index.d.ts");
  expect(normalizePath("")).toBe("");
});

test("convertToDefinitionPath", () => {
  expect(convertToDefinitionPath("index.js")).toBe("index.d.ts");
  expect(convertToDefinitionPath("dist/index.js")).toBe("dist/index.d.ts");
  expect(convertToDefinitionPath("index.d.ts")).toBe("index.d.ts");
});

test("getEntrypoints - from types field", () => {
  const pkg: Package = {
    name: "test-package",
    version: "1.0.0",
    types: "./dist/index.d.ts",
  };

  const entrypoints = getEntrypoints(pkg);

  expect(entrypoints.size).toBe(1);
  expect(entrypoints.get("")).toBe("dist/index.d.ts");
});

test("getEntrypoints - from exports object with types", () => {
  const pkg: Package = {
    name: "test-package",
    version: "1.0.0",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
      },
      "./foo": {
        types: "./dist/foo.d.ts",
      },
    },
  };

  const entrypoints = getEntrypoints(pkg);

  expect(entrypoints.size).toBe(2);
  expect(entrypoints.get("")).toBe("dist/index.d.ts");
  expect(entrypoints.get("foo")).toBe("dist/foo.d.ts");
});

test("getEntrypoints - from string exports with .js conversion", () => {
  const pkg: Package = {
    name: "test-package",
    version: "1.0.0",
    exports: {
      ".": "./index.js",
      "./utils": "./utils/index.js",
    },
  };

  const entrypoints = getEntrypoints(pkg);

  // 文字列のexportsはd.tsに変換されるはず
  expect(entrypoints.get("")).toBe("index.d.ts");
  expect(entrypoints.get("utils")).toBe("utils/index.d.ts");
});

test("getEntrypoints - exports overrides types field", () => {
  const pkg: Package = {
    name: "test-package",
    version: "1.0.0",
    types: "./legacy-types.d.ts",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
      },
    },
  };

  const entrypoints = getEntrypoints(pkg);

  // exportsのtypesがメインのtypesフィールドを上書き
  expect(entrypoints.get("")).toBe("dist/index.d.ts");
});

test("formatImportPath", () => {
  expect(formatImportPath("", "test-pkg")).toBe("test-pkg");
  expect(formatImportPath("foo", "test-pkg")).toBe("test-pkg/foo");
});

test("findDtsFile", () => {
  const dtsFiles = new Map<string, string>();
  dtsFiles.set("index.d.ts", "content1");
  dtsFiles.set("utils/index.d.ts", "content2");
  dtsFiles.set("lib/helper.d.ts", "content3");

  // 実際のパスが見つかる場合
  expect(findDtsFile(dtsFiles, ["index.d.ts"])).toBe("index.d.ts");

  // 複数の候補から見つかる場合
  expect(findDtsFile(dtsFiles, ["not-found.d.ts", "lib/helper.d.ts"])).toBe(
    "lib/helper.d.ts",
  );

  // 見つからない場合
  expect(findDtsFile(dtsFiles, ["not-found.d.ts"])).toBe(null);
});

// zod パッケージのエントリポイントテスト
test("getEntrypoints - zod package", () => {
  const pkg: Package = {
    name: "zod",
    version: "3.24.2",
    main: "./lib/index.js",
    module: "./lib/index.mjs",
    types: "./index.d.ts",
    exports: {
      ".": {
        types: "./index.d.ts",
        require: "./lib/index.js",
        import: "./lib/index.mjs",
      },
      "./package.json": "./package.json",
      "./locales/*": "./lib/locales/*",
    },
  };

  const entrypoints = getEntrypoints(pkg);

  // メインエントリポイント
  expect(entrypoints.get("")).toBe("index.d.ts");

  // サブパスエントリポイント
  expect(entrypoints.has("locales/*")).toBe(true);

  // package.jsonはスキップされるべき
  expect(entrypoints.has("package.json")).toBe(false);
});

// nanoid パッケージのエントリポイントテスト
test("getEntrypoints - nanoid package", () => {
  const pkg: Package = {
    name: "nanoid",
    version: "5.1.2",
    types: "./index.d.ts",
    exports: {
      ".": {
        browser: "./index.browser.js",
        default: "./index.js",
      },
      "./non-secure": "./non-secure/index.js",
      "./package.json": "./package.json",
    },
  };

  const entrypoints = getEntrypoints(pkg);

  // メインエントリポイント
  expect(entrypoints.get("")).toBe("index.d.ts");

  // non-secure サブパス（.jsから.d.tsに変換）
  expect(entrypoints.get("non-secure")).toBe("non-secure/index.d.ts");

  // package.jsonはスキップされるべき
  expect(entrypoints.has("package.json")).toBe(false);
});
