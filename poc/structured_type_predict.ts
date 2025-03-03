/* @script */
/**
 * 構造化された型予測スクリプト
 *
 * サンプル値の収集と型予測を分離し、
 * より詳細な中間構造を持つ実装です。
 */

/**
 * アクセスキーの要素
 */
type AccessKeyElement = string | number;

/**
 * サンプリングされた値の情報
 */
interface SampledValue {
  // 生のアクセスキー（数値インデックスを保持）
  accessKey: AccessKeyElement[];
  // フラット化されたアクセスキー（数値を $ に変換）
  flatAccessKey: string;
  // サンプル値のコレクション
  sampleValues: unknown[];
}

/**
 * アクセスキーをフラット化する
 */
function flattenAccessKey(key: AccessKeyElement[]): string {
  return key.map((k) => (typeof k === "number" ? "$" : k)).join(".");
}

/**
 * パスを要素に分解する
 */
function parseAccessKey(path: string): AccessKeyElement[] {
  return path.split(".").map((segment) => {
    const num = Number(segment);
    return !isNaN(num) ? num : segment;
  });
}

/**
 * サンプル値を収集する
 */
function collectSamples(
  obj: unknown,
  currentKey: AccessKeyElement[] = [],
  samples: Map<string, SampledValue> = new Map(),
): Map<string, SampledValue> {
  // null または非オブジェクトの場合
  if (obj === null || typeof obj !== "object") {
    if (currentKey.length > 0) {
      const flatKey = flattenAccessKey(currentKey);
      const existing = samples.get(flatKey) ?? {
        accessKey: currentKey,
        flatAccessKey: flatKey,
        sampleValues: [],
      };
      existing.sampleValues.push(obj);
      samples.set(flatKey, existing);
    }
    return samples;
  }

  // 配列の場合
  if (Array.isArray(obj)) {
    // 配列自体の情報を記録
    const arrayFlatKey = flattenAccessKey(currentKey);
    const arrayInfo = samples.get(arrayFlatKey) ?? {
      accessKey: currentKey,
      flatAccessKey: arrayFlatKey,
      sampleValues: [],
    };
    arrayInfo.sampleValues.push(obj);
    samples.set(arrayFlatKey, arrayInfo);

    // 各要素を処理
    obj.forEach((item, index) => {
      collectSamples(item, [...currentKey, index], samples);
    });
    return samples;
  }

  // オブジェクトの場合
  for (const [key, value] of Object.entries(obj)) {
    collectSamples(value, [...currentKey, key], samples);
  }

  return samples;
}

type ValueType = "string" | "number" | "boolean" | "object" | "array" | "null";

/**
 * 値から型を判定する
 */
function getValueType(value: unknown): ValueType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return typeof value as ValueType;
}

/**
 * サンプル値から型を予測する
 */
function predictTypeFromSamples(samples: SampledValue): {
  type: string;
  isArray: boolean;
  itemTypes?: Set<string>;
} {
  const types = new Set<ValueType>();
  let isArray = false;
  const itemTypes = new Set<string>();

  for (const value of samples.sampleValues) {
    const valueType = getValueType(value);
    types.add(valueType);

    // 配列の場合、要素の型も収集
    if (valueType === "array" && Array.isArray(value)) {
      isArray = true;
      for (const item of value) {
        itemTypes.add(getValueType(item));
      }
    }
  }

  // null を含む場合は nullable
  const isNullable = types.has("null");
  if (isNullable) {
    types.delete("null");
  }

  // 型文字列の生成
  let typeStr: string;
  if (types.size === 0) {
    typeStr = "null";
  } else if (types.size === 1) {
    const [type] = types;
    typeStr = isNullable ? `${type} | null` : type;
  } else {
    const typeArray = Array.from(types);
    typeStr = isNullable
      ? `${typeArray.join(" | ")} | null`
      : typeArray.join(" | ");
  }

  return {
    type: typeStr,
    isArray,
    itemTypes: itemTypes.size > 0 ? itemTypes : undefined,
  };
}

/**
 * オブジェクトから型情報を収集する
 */
export function collectTypeInfo(obj: unknown): {
  samples: Map<string, SampledValue>;
  predictions: Map<
    string,
    { type: string; isArray: boolean; itemTypes?: Set<string> }
  >;
} {
  // サンプル値の収集
  const samples = collectSamples(obj);

  // 型の予測
  const predictions = new Map();
  for (const [key, sample] of samples) {
    predictions.set(key, predictTypeFromSamples(sample));
  }

  return { samples, predictions };
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
  console.log("\nCollected Type Info:");
  const { samples, predictions } = collectTypeInfo(testData);

  console.log("\nSamples:");
  for (const [key, sample] of samples) {
    console.log(`${key}:`, {
      accessKey: sample.accessKey,
      sampleValues: sample.sampleValues,
    });
  }

  console.log("\nPredicted Types:");
  for (const [key, prediction] of predictions) {
    console.log(`${key}:`, prediction);
  }
}

// Unit Tests
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("parseAccessKey - path parsing", () => {
  expect(parseAccessKey("users.0.name")).toEqual(["users", 0, "name"]);
  expect(parseAccessKey("items.123.value")).toEqual(["items", 123, "value"]);
  expect(parseAccessKey("simple.path")).toEqual(["simple", "path"]);
});

test("flattenAccessKey - key flattening", () => {
  expect(flattenAccessKey(["users", 0, "name"])).toBe("users.$.name");
  expect(flattenAccessKey(["items", 123, "value"])).toBe("items.$.value");
  expect(flattenAccessKey(["simple", "path"])).toBe("simple.path");
});

test("collectSamples - primitive values", () => {
  const input = {
    string: "hello",
    number: 42,
    boolean: true,
    null: null,
  };

  const samples = collectSamples(input);

  expect(samples.get("string")?.sampleValues).toEqual(["hello"]);
  expect(samples.get("number")?.sampleValues).toEqual([42]);
  expect(samples.get("boolean")?.sampleValues).toEqual([true]);
  expect(samples.get("null")?.sampleValues).toEqual([null]);
});

test("collectSamples - arrays", () => {
  const input = {
    scores: [85, 92, 78],
    tags: ["a", "b"],
  };

  const samples = collectSamples(input);

  expect(samples.get("scores")?.sampleValues).toEqual([[85, 92, 78]]);
  expect(samples.get("scores.$")?.sampleValues).toEqual([85, 92, 78]);
  expect(samples.get("tags")?.sampleValues).toEqual([["a", "b"]]);
  expect(samples.get("tags.$")?.sampleValues).toEqual(["a", "b"]);
});

test("predictTypeFromSamples - type prediction", () => {
  // 単一の型
  expect(
    predictTypeFromSamples({
      accessKey: ["value"],
      flatAccessKey: "value",
      sampleValues: [1, 2, 3],
    }),
  ).toEqual({
    type: "number",
    isArray: false,
  });

  // nullable な型
  expect(
    predictTypeFromSamples({
      accessKey: ["value"],
      flatAccessKey: "value",
      sampleValues: [1, null, 3],
    }),
  ).toEqual({
    type: "number | null",
    isArray: false,
  });

  // 配列
  expect(
    predictTypeFromSamples({
      accessKey: ["value"],
      flatAccessKey: "value",
      sampleValues: [
        [1, 2],
        [3, 4],
      ],
    }),
  ).toEqual({
    type: "array",
    isArray: true,
    itemTypes: new Set(["number"]),
  });

  // 混合型の配列
  expect(
    predictTypeFromSamples({
      accessKey: ["value"],
      flatAccessKey: "value",
      sampleValues: [
        [1, "two"],
        [3, true],
      ],
    }),
  ).toEqual({
    type: "array",
    isArray: true,
    itemTypes: new Set(["number", "string", "boolean"]),
  });
});

test("collectTypeInfo - complete type collection", () => {
  const input = {
    user: {
      id: 1,
      tags: ["admin", "active"],
      metadata: null,
    },
  };

  const { predictions } = collectTypeInfo(input);

  expect(predictions.get("user.id")).toEqual({
    type: "number",
    isArray: false,
  });

  expect(predictions.get("user.tags")).toEqual({
    type: "array",
    isArray: true,
    itemTypes: new Set(["string"]),
  });

  expect(predictions.get("user.metadata")).toEqual({
    type: "null",
    isArray: false,
  });
});
