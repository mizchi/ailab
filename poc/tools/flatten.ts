/* @script */
/**
 * JSONから型を予測するためのフラット展開モジュール
 *
 * JSONデータを再帰的に展開し、パス情報に変換します。
 * パスセグメントの構造化と配列アクセスの検出を行います。
 */

// パスセグメントの型定義
export interface PathSegment {
  type: "key" | "index" | "wildcard";
  value: string;
  arrayAccess?: boolean;
  arrayInfo?: {
    isTuple: boolean;
    itemTypes: PathInfo[];
  };
}

// パス情報の型定義
export interface PathInfo {
  segments: PathSegment[];
  value: unknown;
  type: "string" | "number" | "boolean" | "null" | "object" | "array";
  isNullable: boolean;
  arrayInfo?: {
    isTuple: boolean;
    itemTypes: PathInfo[];
  };
  metadata?: {
    occurrences: number;
    patterns?: string[];
    recordPattern?: {
      keyPattern: string;
      valueType: PathInfo;
    };
  };
}

/**
 * 値の型を判定する
 */
function getValueType(value: unknown): PathInfo["type"] {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "null"; // undefined も null として扱う
}

/**
 * 配列の要素を解析する
 */
function analyzeArrayItems(arr: unknown[]): PathInfo["arrayInfo"] {
  const itemTypes: PathInfo[] = [];
  let isTuple = false;

  // 配列の要素が異なる型を持つ場合はタプルとして扱う
  const firstType = arr.length > 0 ? getValueType(arr[0]) : "null";
  isTuple = arr.some((item) => getValueType(item) !== firstType);

  // 各要素の型情報を収集
  for (const item of arr) {
    itemTypes.push({
      segments: [],
      value: item,
      type: getValueType(item),
      isNullable: item === null,
    });
  }

  return {
    isTuple,
    itemTypes,
  };
}

/**
 * セグメントの配列をコピーする（arrayInfo を除外）
 */
function copySegmentsWithoutArrayInfo(segments: PathSegment[]): PathSegment[] {
  return segments.map((segment) => ({
    type: segment.type,
    value: segment.value,
    arrayAccess: segment.arrayAccess,
  }));
}

/**
 * JSONをフラットなパス情報に変換する
 */
export function flattenJson(
  json: unknown,
  currentPath: PathSegment[] = [],
  result: PathInfo[] = [],
): PathInfo[] {
  const type = getValueType(json);
  const isNullable = json === null;

  // 現在のパスの情報を追加
  if (currentPath.length > 0) {
    const pathInfo: PathInfo = {
      segments: copySegmentsWithoutArrayInfo(currentPath),
      value: json,
      type,
      isNullable,
    };

    // 配列の場合は配列情報を追加（配列自体のパスのみ）
    if (type === "array" && Array.isArray(json)) {
      const arrayInfo = analyzeArrayItems(json);
      pathInfo.arrayInfo = arrayInfo;
      const lastSegment = pathInfo.segments[pathInfo.segments.length - 1];
      lastSegment.arrayAccess = true;
      lastSegment.arrayInfo = arrayInfo;
    }

    result.push(pathInfo);
  }

  // オブジェクトの場合は再帰的に展開
  if (type === "object" && json !== null) {
    const obj = json as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      const segment: PathSegment = {
        type: "key",
        value: key,
      };
      flattenJson(value, [...currentPath, segment], result);
    }
  } // 配列の場合は要素を展開
  else if (type === "array" && Array.isArray(json)) {
    // 各要素を展開
    json.forEach((item, index) => {
      const segment: PathSegment = {
        type: "index",
        value: String(index),
        arrayAccess: true,
      };
      flattenJson(item, [...currentPath, segment], result);
    });
  }

  return result;
}

// デバッグ用の出力関数
function debugPathInfo(info: PathInfo): string {
  return JSON.stringify(
    {
      path: info.segments.map((s) => s.value).join("."),
      type: info.type,
      value: info.value,
      isArray: info.type === "array",
      arrayInfo: info.arrayInfo,
      segments: info.segments,
    },
    null,
    2,
  );
}

// テストケース
if (import.meta.main) {
  const testJson = {
    name: "John",
    age: 30,
    isStudent: true,
    scores: [85, 92, 78],
    address: {
      street: "123 Main St",
      city: "Boston",
      coordinates: [42.3601, -71.0589],
    },
    contacts: [
      { type: "email", value: "john@example.com" },
      { type: "phone", value: "123-456-7890" },
    ],
    metadata: null,
  };

  const result = flattenJson(testJson);
  console.log("Flattened JSON:");
  result.forEach((info) => {
    console.log(debugPathInfo(info));
    console.log("---");
  });
}

// Unit Tests
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("flattenJson - primitive values", () => {
  const json = {
    string: "hello",
    number: 42,
    boolean: true,
    null: null,
  };

  const result = flattenJson(json);

  expect(result).toContainEqual({
    segments: [{ type: "key", value: "string" }],
    value: "hello",
    type: "string",
    isNullable: false,
  });

  expect(result).toContainEqual({
    segments: [{ type: "key", value: "number" }],
    value: 42,
    type: "number",
    isNullable: false,
  });

  expect(result).toContainEqual({
    segments: [{ type: "key", value: "boolean" }],
    value: true,
    type: "boolean",
    isNullable: false,
  });

  expect(result).toContainEqual({
    segments: [{ type: "key", value: "null" }],
    value: null,
    type: "null",
    isNullable: true,
  });
});

test("flattenJson - nested objects", () => {
  const json = {
    user: {
      name: "John",
      address: {
        city: "Boston",
      },
    },
  };

  const result = flattenJson(json);

  expect(result).toContainEqual({
    segments: [
      { type: "key", value: "user" },
      { type: "key", value: "name" },
    ],
    value: "John",
    type: "string",
    isNullable: false,
  });

  expect(result).toContainEqual({
    segments: [
      { type: "key", value: "user" },
      { type: "key", value: "address" },
      { type: "key", value: "city" },
    ],
    value: "Boston",
    type: "string",
    isNullable: false,
  });
});

test("flattenJson - arrays", () => {
  const json = {
    scores: [85, 92, 78],
    mixed: [1, "two", true],
  };

  const result = flattenJson(json);
  console.log("Array test result:");
  result.forEach((info) => console.log(debugPathInfo(info)));

  // scores配列のパス情報
  const scoresPath = result.find(
    (p) => p.segments.length === 1 && p.segments[0].value === "scores",
  );
  expect(scoresPath?.type).toBe("array");
  expect(scoresPath?.segments[0].arrayAccess).toBe(true);
  expect(scoresPath?.arrayInfo?.isTuple).toBe(false);

  // mixed配列のパス情報
  const mixedPath = result.find(
    (p) => p.segments.length === 1 && p.segments[0].value === "mixed",
  );
  expect(mixedPath?.type).toBe("array");
  expect(mixedPath?.segments[0].arrayAccess).toBe(true);
  expect(mixedPath?.arrayInfo?.isTuple).toBe(true);

  // 配列要素のパス情報
  expect(result).toContainEqual({
    segments: [
      { type: "key", value: "scores" },
      { type: "index", value: "0", arrayAccess: true },
    ],
    value: 85,
    type: "number",
    isNullable: false,
  });
});

test("flattenJson - complex nested structure", () => {
  const json = {
    users: [
      {
        id: 1,
        contacts: [
          { type: "email", value: "user1@example.com" },
          { type: "phone", value: "123-456-7890" },
        ],
      },
    ],
  };

  const result = flattenJson(json);
  console.log("Complex structure test result:");
  result.forEach((info) => console.log(debugPathInfo(info)));

  // users配列のパス情報
  const usersPath = result.find(
    (p) => p.segments.length === 1 && p.segments[0].value === "users",
  );
  expect(usersPath?.type).toBe("array");
  expect(usersPath?.segments[0].arrayAccess).toBe(true);

  // ネストされた配列要素のパス情報
  expect(result).toContainEqual({
    segments: [
      { type: "key", value: "users" },
      { type: "index", value: "0", arrayAccess: true },
      { type: "key", value: "contacts" },
      { type: "index", value: "0", arrayAccess: true },
      { type: "key", value: "type" },
    ],
    value: "email",
    type: "string",
    isNullable: false,
  });
});
