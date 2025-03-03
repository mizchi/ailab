/**
 * フラット化モジュール
 *
 * JSONデータをフラットなパス情報に変換します。
 */

import type {
  AccessKeyElement,
  FlatEntry,
  PathInfo,
  PathSegment,
  SampledValue,
} from "./types.ts";

/**
 * パスをフラット化する
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
 * オブジェクトをフラット化する
 *
 * @param obj フラット化する対象のオブジェクト
 * @param prefix 現在のパスのプレフィックス
 * @param result 結果を格納する配列
 * @returns フラット化された値のエントリの配列
 */
function flattenToEntries(
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
    obj.forEach((item, index) => {
      flattenToEntries(
        item,
        prefix ? `${prefix}.${index}` : `${index}`,
        result,
      );
    });
    return result;
  }

  for (const [key, value] of Object.entries(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    flattenToEntries(value, newPrefix, result);
  }

  return result;
}

/**
 * サンプル値を収集する
 *
 * @param obj 収集対象のオブジェクト
 * @param currentKey 現在のアクセスキー
 * @param samples 収集されたサンプル値を格納するマップ
 * @returns サンプル値のマップ
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

/**
 * JSONをフラットなパス情報に変換する
 *
 * @param json 変換対象のJSONデータ
 * @returns パス情報の配列
 */
export function flattenJson(json: unknown): PathInfo[] {
  // サンプル値を収集
  const samples = collectSamples(json);
  const pathInfos: PathInfo[] = [];

  // 各サンプルをPathInfoに変換
  for (const [, sample] of samples) {
    const segments: PathSegment[] = sample.accessKey.map((value) => ({
      type: typeof value === "number" ? "index" : "key",
      value: String(value),
      arrayAccess: typeof value === "number",
    }));

    // 値の型を判定
    const firstValue = sample.sampleValues[0];
    let type: PathInfo["type"] = "null";
    if (firstValue !== null) {
      if (Array.isArray(firstValue)) {
        type = "array";
      } else if (typeof firstValue === "object") {
        type = "object";
      } else {
        type = typeof firstValue as PathInfo["type"];
      }
    }

    // nullableかどうかを判定
    const isNullable = sample.sampleValues.some((v) => v === null);

    pathInfos.push({
      segments,
      value: firstValue,
      type,
      isNullable,
      metadata: {
        occurrences: sample.sampleValues.length,
        patterns: sample.sampleValues
          .filter((v): v is string => typeof v === "string")
          .filter((v, i, arr) => arr.indexOf(v) === i),
      },
    });
  }

  return pathInfos;
}

// Unit Tests
import { expect, test } from "./deps.ts";

test("flattenJson - primitive values", () => {
  const input = {
    string: "hello",
    number: 42,
    boolean: true,
    null: null,
  };

  const result = flattenJson(input);

  expect(result).toContainEqual({
    segments: [{ type: "key" as const, value: "string", arrayAccess: false }],
    value: "hello",
    type: "string",
    isNullable: false,
    metadata: { occurrences: 1, patterns: ["hello"] },
  });

  expect(result).toContainEqual({
    segments: [{ type: "key" as const, value: "number", arrayAccess: false }],
    value: 42,
    type: "number",
    isNullable: false,
    metadata: { occurrences: 1, patterns: [] },
  });
});

test("flattenJson - arrays", () => {
  const input = {
    scores: [85, 92, null, 78],
    tags: ["student", null, "active"],
  };

  const result = flattenJson(input);

  // scores配列自体
  expect(result).toContainEqual({
    segments: [{ type: "key" as const, value: "scores", arrayAccess: false }],
    value: [85, 92, null, 78],
    type: "array",
    isNullable: false,
    metadata: { occurrences: 1, patterns: [] },
  });

  // scores配列の要素
  const scoresElement = result.find(
    (info) =>
      info.segments.length === 2 &&
      info.segments[0].value === "scores" &&
      info.segments[1].type === "index",
  );
  expect(scoresElement).toBeDefined();
  expect(scoresElement?.type).toBe("number");
  expect(scoresElement?.isNullable).toBe(true);
});

test("flattenJson - nested objects", () => {
  const input = {
    user: {
      name: "John",
      address: {
        city: "Boston",
      },
    },
  };

  const result = flattenJson(input);

  expect(result).toContainEqual({
    segments: [
      { type: "key" as const, value: "user", arrayAccess: false },
      { type: "key" as const, value: "name", arrayAccess: false },
    ],
    value: "John",
    type: "string",
    isNullable: false,
    metadata: { occurrences: 1, patterns: ["John"] },
  });
});
