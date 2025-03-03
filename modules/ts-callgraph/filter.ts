import type { CallInfo } from "./types.ts";

// 標準ライブラリのメンバーかどうかを判定する関数
const isStdLibMember = (name: string): boolean => {
  // 標準ライブラリの代表的なオブジェクトとメソッド
  const stdLibPatterns = [
    /^console\./,
    /^Math\./,
    /^Array\./,
    /^Object\./,
    /^String\./,
    /^Number\./,
    /^Date\./,
    /^JSON\./,
    /^RegExp\./,
    /^Promise\./,
    /^Error\./,
    /^Map\./,
    /^Set\./,
    /^Symbol\./,
    /^WeakMap\./,
    /^WeakSet\./,
    /^Reflect\./,
    /^Proxy\./,
    /^Intl\./,
    /^ArrayBuffer\./,
    /^DataView\./,
    /^Int8Array\./,
    /^Uint8Array\./,
    /^Uint8ClampedArray\./,
    /^Int16Array\./,
    /^Uint16Array\./,
    /^Int32Array\./,
    /^Uint32Array\./,
    /^Float32Array\./,
    /^Float64Array\./,
    /^BigInt64Array\./,
    /^BigUint64Array\./,
  ];

  return stdLibPatterns.some((pattern) => pattern.test(name));
};

// npm パッケージからの呼び出しかどうかを判定する関数
const isNpmPackage = (name: string, sourceFile: string): boolean => {
  return sourceFile.includes("node_modules") ||
    sourceFile.includes("npm:") ||
    name.startsWith("npm:");
};

// JSR パッケージからの呼び出しかどうかを判定する関数
const isJsrPackage = (name: string, sourceFile: string): boolean => {
  return sourceFile.includes("jsr:") || name.startsWith("jsr:");
};

// ユーザー定義のパターンにマッチするかを判定する関数
const matchesIgnorePattern = (
  name: string,
  ignorePatterns: string[],
): boolean => {
  if (ignorePatterns.length === 0) return false;
  return ignorePatterns.some((pattern) => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(name);
    } catch {
      // 正規表現としてのパターンが無効な場合は単純な文字列比較を行う
      return name.includes(pattern);
    }
  });
};

// 呼び出しをフィルタリングするかどうかを判定する関数
export const shouldFilterCall = (
  callInfo: CallInfo,
  flags: {
    "ignore-stdlib": boolean;
    "ignore-npm": boolean;
    "ignore-jsr": boolean;
  },
  ignorePatterns: string[],
): boolean => {
  const { callee, sourceFile } = callInfo;

  // ユーザー定義のパターンにマッチする場合
  if (matchesIgnorePattern(callee, ignorePatterns)) {
    return true;
  }

  // 標準ライブラリの場合
  if (flags["ignore-stdlib"] && isStdLibMember(callee)) {
    return true;
  }

  // npm パッケージの場合
  if (flags["ignore-npm"] && isNpmPackage(callee, sourceFile)) {
    return true;
  }

  // JSR パッケージの場合
  if (flags["ignore-jsr"] && isJsrPackage(callee, sourceFile)) {
    return true;
  }

  return false;
};
