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
 */
export function flattenJson(json: unknown): PathInfo[] {
  // サンプル値を収集
  const samples = collectSamples(json);
  const pathInfos: PathInfo[] = [];

  // 各サンプルをPathInfoに変換
  for (const [, sample] of samples) {
    const segments: PathSegment[] = sample.accessKey.map((value) => ({
      type: typeof value === "number" ? ("index" as const) : ("key" as const),
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
