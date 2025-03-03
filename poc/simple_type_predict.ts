/* @script */
/**
 * シンプルな型予測スクリプト
 *
 * オブジェクトをフラット化し、パターンから型を予測します。
 * - 配列アクセスは $ で表現
 * - 同じパターンのキーを収集
 * - フラット化したオブジェクトから型を予測
 */

/**
 * フラット化された値のエントリ
 */
interface FlatEntry {
  path: string;
  value: unknown;
}

/**
 * パターングループ
 */
interface PatternGroup {
  pattern: string;
  values: unknown[];
}

/**
 * オブジェクトをフラット化する
 *
 * 例:
 * input: { a: { b: 1 }, c: [1, 2] }
 * output: [
 *   { path: "a.b", value: 1 },
 *   { path: "c.$", value: 1 },
 *   { path: "c.$", value: 2 }
 * ]
 */
function flattenObject(
  obj: unknown,
  prefix = "",
  result: FlatEntry[] = [],
): FlatEntry[] {
  if (obj === null || typeof obj !== "object") {
    if (prefix) {
      result.push({ path: prefix, value: obj });
    }
    return result;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      flattenObject(item, prefix ? `${prefix}.$` : "$", result);
    });
    return result;
  }

  for (const [key, value] of Object.entries(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    flattenObject(value, newPrefix, result);
  }

  return result;
}

/**
 * パスをパターン化する
 * 数値インデックスを $ に変換します
 */
function pathToPattern(path: string): string {
  // 数値のみのセグメントを $ に置換
  return path
    .split(".")
    .map((segment) => {
      return /^\d+$/.test(segment) ? "$" : segment;
    })
    .join(".");
}

/**
 * パスをグループ化する
 * 同じパターンのキーをグループ化します
 */
function groupPaths(flatEntries: FlatEntry[]): PatternGroup[] {
  const groupMap = new Map<string, PatternGroup>();

  for (const { path, value } of flatEntries) {
    const pattern = pathToPattern(path);

    let group = groupMap.get(pattern);
    if (!group) {
      group = { pattern, values: [] };
      groupMap.set(pattern, group);
    }
    group.values.push(value);
  }

  return Array.from(groupMap.values());
}

type ValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "null"
  | "undefined";

/**
 * 値から型を予測する
 */
function predictType(values: unknown[]): string {
  if (values.length === 0) return "unknown";

  const types = new Set<ValueType>();

  for (const value of values) {
    if (value === null) {
      types.add("null");
    } else if (value === undefined) {
      types.add("undefined");
    } else {
      types.add(typeof value as ValueType);
    }
  }

  // undefined を null として扱う
  if (types.has("undefined")) {
    types.delete("undefined");
    types.add("null");
  }

  // null を含む場合は nullable
  const isNullable = types.has("null");
  if (isNullable) {
    types.delete("null");
  }

  // 型がない場合（null/undefined のみ）
  if (types.size === 0) {
    return "null";
  }

  // 単一の型の場合
  if (types.size === 1) {
    const [type] = types;
    return isNullable ? `${type} | null` : type;
  }

  // 複数の型の場合（ユニオン型）
  const typeArray = Array.from(types);
  return isNullable ? `${typeArray.join(" | ")} | null` : typeArray.join(" | ");
}

/**
 * フラット化したオブジェクトから型を予測する
 */
function predictTypes(flatEntries: FlatEntry[]): Record<string, string> {
  const groups = groupPaths(flatEntries);
  const types: Record<string, string> = {};

  for (const { pattern, values } of groups) {
    types[pattern] = predictType(values);
  }

  return types;
}

// テストケース
if (import.meta.main) {
  const testData = {
    name: "John",
    age: 30,
    scores: [85, 92, null, 78],
    tags: ["student", null, "active"],
    contact: {
      email: "john@example.com",
      phones: [
        { type: "home", number: "123-456-7890" },
        { type: "work", number: null },
      ],
    },
    metadata: null,
  };

  console.log("Original:", testData);
  console.log("\nFlattened:");
  const flattened = flattenObject(testData);
  console.log(flattened);

  console.log("\nPredicted Types:");
  const types = predictTypes(flattened);
  console.log(types);
}

// Unit Tests
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("flattenObject - primitive values", () => {
  const input = {
    string: "hello",
    number: 42,
    boolean: true,
    null: null,
  };

  const result = flattenObject(input);

  expect(result).toEqual([
    { path: "string", value: "hello" },
    { path: "number", value: 42 },
    { path: "boolean", value: true },
    { path: "null", value: null },
  ]);
});

test("flattenObject - nested objects", () => {
  const input = {
    user: {
      name: "John",
      address: {
        city: "Boston",
      },
    },
  };

  const result = flattenObject(input);

  expect(result).toEqual([
    { path: "user.name", value: "John" },
    { path: "user.address.city", value: "Boston" },
  ]);
});

test("flattenObject - arrays", () => {
  const input = {
    scores: [85, 92, 78],
    tags: ["a", "b"],
  };

  const result = flattenObject(input);

  expect(result).toEqual([
    { path: "scores.$", value: 85 },
    { path: "scores.$", value: 92 },
    { path: "scores.$", value: 78 },
    { path: "tags.$", value: "a" },
    { path: "tags.$", value: "b" },
  ]);
});

test("flattenObject - complex nested structure", () => {
  const input = {
    users: [
      {
        id: 1,
        tags: ["admin", "active"],
      },
      {
        id: 2,
        tags: ["user"],
      },
    ],
  };

  const result = flattenObject(input);

  expect(result).toEqual([
    { path: "users.$.id", value: 1 },
    { path: "users.$.tags.$", value: "admin" },
    { path: "users.$.tags.$", value: "active" },
    { path: "users.$.id", value: 2 },
    { path: "users.$.tags.$", value: "user" },
  ]);
});

test("predictTypes - primitive values", () => {
  const input = [
    { path: "string", value: "hello" },
    { path: "number", value: 42 },
    { path: "boolean", value: true },
    { path: "nullable", value: null },
    { path: "mixed", value: "hello" },
    { path: "mixed.other", value: 42 },
  ];

  const result = predictTypes(input);

  expect(result.string).toBe("string");
  expect(result.number).toBe("number");
  expect(result.boolean).toBe("boolean");
  expect(result.nullable).toBe("null");
  expect(result.mixed).toBe("string");
});

test("predictTypes - array values", () => {
  const input = [
    { path: "scores.$", value: 85 },
    { path: "scores.$", value: 92 },
    { path: "scores.$", value: null },
    { path: "tags.$", value: "student" },
    { path: "tags.$", value: null },
  ];

  const result = predictTypes(input);

  expect(result["scores.$"]).toBe("number | null");
  expect(result["tags.$"]).toBe("string | null");
});

test("predictTypes - nested structure", () => {
  const input = [
    { path: "users.$.id", value: 1 },
    { path: "users.$.id", value: 2 },
    { path: "users.$.name", value: "John" },
    { path: "users.$.name", value: "Jane" },
    { path: "users.$.active", value: true },
    { path: "users.$.active", value: null },
  ];

  const result = predictTypes(input);

  expect(result["users.$.id"]).toBe("number");
  expect(result["users.$.name"]).toBe("string");
  expect(result["users.$.active"]).toBe("boolean | null");
});

test("pathToPattern - pattern conversion", () => {
  expect(pathToPattern("users.0.name")).toBe("users.$.name");
  expect(pathToPattern("users.1.tags.0")).toBe("users.$.tags.$");
  expect(pathToPattern("data.123.value")).toBe("data.$.value");
  expect(pathToPattern("simple.path")).toBe("simple.path");
  expect(pathToPattern("0")).toBe("$");
  expect(pathToPattern("array.0")).toBe("array.$");
});

test("predictType - edge cases", () => {
  expect(predictType([])).toBe("unknown");
  expect(predictType([null])).toBe("null");
  expect(predictType([undefined])).toBe("null");
  expect(predictType([null, undefined])).toBe("null");
  expect(predictType([1, "2", true])).toBe("number | string | boolean");
  expect(predictType([1, null, "2"])).toBe("number | string | null");
});
