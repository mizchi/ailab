/**
 * 型予測モジュール
 *
 * パス情報から型を予測します。
 */

import type {
  PathInfo,
  StructurePrediction,
  TypePrediction,
  ValueType,
} from "./types.ts";
import { analyzePath } from "./path-analyzer.ts";

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
function predictTypeFromSamples(samples: unknown[]): TypePrediction {
  const types = new Set<ValueType>();
  let isArray = false;
  const itemTypes = new Set<string>();

  // 各サンプルの型を収集
  for (const value of samples) {
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
    // 複数の型が存在する場合、優先順位に基づいてソート
    const typeArray = Array.from(types).sort((a, b) => {
      const order = {
        string: 5,
        number: 4,
        boolean: 3,
        object: 2,
        array: 1,
      };
      return (
        (order[b as keyof typeof order] || 0) -
        (order[a as keyof typeof order] || 0)
      );
    });
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
 * 文字列パターンから列挙型の可能性を検出
 */
function detectEnumPattern(patterns: string[]): string[] | undefined {
  if (patterns.length < 2) return undefined;

  // パターンの特徴を分析
  const allPatternsSameCase = patterns.every((p) => /^[a-z]+$/.test(p)) || // すべて小文字
    patterns.every((p) => /^[A-Z]+$/.test(p)) || // すべて大文字
    patterns.every((p) => /^[A-Z][a-z]+$/.test(p)); // すべてパスカルケース

  // 文字数が近い（最大長と最小長の差が小さい）
  const lengths = patterns.map((p) => p.length);
  const maxLen = Math.max(...lengths);
  const minLen = Math.min(...lengths);
  const lengthsAreSimilar = maxLen - minLen <= 5;

  // パターンが一定の規則に従っている場合、列挙型として扱う
  if (allPatternsSameCase && lengthsAreSimilar) {
    return patterns;
  }

  return undefined;
}

/**
 * パス情報から型を予測
 */
export function predictType(pathInfos: PathInfo[]): {
  structure: StructurePrediction;
  predictions: Map<string, TypePrediction>;
} {
  const predictions = new Map<string, TypePrediction>();

  // 各パスの型を予測
  for (const info of pathInfos) {
    const path = info.segments.map((s) => s.value).join(".");

    // 同じパスの値を収集
    const samples = pathInfos
      .filter((p) => p.segments.map((s) => s.value).join(".") === path)
      .map((p) => p.value);

    // 型予測
    const prediction = predictTypeFromSamples(samples);

    // メタデータから追加情報を抽出
    if (info.metadata) {
      // 文字列パターンから列挙型を検出
      if (info.metadata.patterns && info.metadata.patterns.length > 0) {
        const enumValues = detectEnumPattern(info.metadata.patterns);
        if (enumValues) {
          prediction.type = `enum(${enumValues.join(" | ")})`;
        }
      }
    }

    predictions.set(path, prediction);
  }

  // 構造を予測
  const structure = analyzePath(pathInfos);

  return { structure, predictions };
}

// Unit Tests
import { expect, test } from "./deps.ts";

test("predictType - primitive values", () => {
  const input: PathInfo[] = [
    {
      segments: [{ type: "key", value: "name", arrayAccess: false }],
      value: "John",
      type: "string",
      isNullable: false,
      metadata: { occurrences: 1, patterns: ["John"] },
    },
    {
      segments: [{ type: "key", value: "age", arrayAccess: false }],
      value: 30,
      type: "number",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
  ];

  const { predictions } = predictType(input);
  expect(predictions.get("name")?.type).toBe("string");
  expect(predictions.get("age")?.type).toBe("number");
});

test("predictType - array values", () => {
  const input: PathInfo[] = [
    {
      segments: [{ type: "key", value: "scores", arrayAccess: false }],
      value: [85, 92, 78],
      type: "array",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
  ];

  const { predictions } = predictType(input);
  const scoresPrediction = predictions.get("scores");
  expect(scoresPrediction?.type).toBe("array");
  expect(scoresPrediction?.isArray).toBe(true);
  expect(scoresPrediction?.itemTypes).toEqual(new Set(["number"]));
});

test("predictType - enum detection", () => {
  const input: PathInfo[] = [
    {
      segments: [{ type: "key", value: "status", arrayAccess: false }],
      value: "active",
      type: "string",
      isNullable: false,
      metadata: {
        occurrences: 3,
        patterns: ["active", "inactive", "pending"],
      },
    },
  ];

  const { predictions } = predictType(input);
  expect(predictions.get("status")?.type).toBe(
    "enum(active | inactive | pending)",
  );
});

test("predictType - nullable values", () => {
  const input: PathInfo[] = [
    {
      segments: [{ type: "key", value: "optional", arrayAccess: false }],
      value: null,
      type: "null",
      isNullable: true,
      metadata: { occurrences: 1 },
    },
  ];

  const { predictions } = predictType(input);
  expect(predictions.get("optional")?.type).toBe("null");
});

test("predictType - mixed types", () => {
  const input: PathInfo[] = [
    {
      segments: [{ type: "key", value: "mixed", arrayAccess: false }],
      value: "string",
      type: "string",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
    {
      segments: [{ type: "key", value: "mixed", arrayAccess: false }],
      value: 42,
      type: "number",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
  ];

  const { predictions } = predictType(input);
  expect(predictions.get("mixed")?.type).toBe("string | number");
});

test("predictType - complex mixed types", () => {
  const input: PathInfo[] = [
    {
      segments: [{ type: "key", value: "value", arrayAccess: false }],
      value: "string",
      type: "string",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
    {
      segments: [{ type: "key", value: "value", arrayAccess: false }],
      value: 42,
      type: "number",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
    {
      segments: [{ type: "key", value: "value", arrayAccess: false }],
      value: true,
      type: "boolean",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
    {
      segments: [{ type: "key", value: "value", arrayAccess: false }],
      value: null,
      type: "null",
      isNullable: true,
      metadata: { occurrences: 1 },
    },
  ];

  const { predictions } = predictType(input);
  expect(predictions.get("value")?.type).toBe(
    "string | number | boolean | null",
  );
});
