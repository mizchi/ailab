/**
 * 型予測モジュール
 *
 * パス情報から型を予測します。
 */

import {
  buildPath,
  type PathInfo,
  type StructurePrediction,
  type TypePrediction,
  type ValueType,
} from "./types.ts";
import { analyzePath } from "./path-analyzer.ts";

/**
 * 値から型を判定する
 */
function getValueType(value: unknown): ValueType {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";

  // 特殊なオブジェクトの処理
  if (value instanceof Date) return "date";
  if (value instanceof RegExp) return "regexp";
  if (value instanceof Error) return "error";
  if (value instanceof Map) return "map";
  if (value instanceof Set) return "set";
  if (value instanceof Promise) return "promise";
  if (value instanceof Uint8Array) return "buffer";

  // 特殊な数値の処理
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "number";
    if (!Number.isFinite(value)) return "number";
  }

  if (typeof value === "object") return "object";
  return typeof value as ValueType;
}

/**
 * サンプル値から型を予測する
 */
function predictTypeFromSamples(samples: unknown[], depth = 0): TypePrediction {
  const types = new Set<ValueType>();
  let isArray = false;
  const itemTypes = new Set<string>();
  let arrayDepth = 0;
  let arrayElementType: TypePrediction | undefined;

  // 再帰の深さ制限
  if (depth > 10) {
    return {
      type: "any",
      isArray: false,
    };
  }

  // 各サンプルの型を収集
  for (const value of samples) {
    const valueType = getValueType(value);
    types.add(valueType);

    // 配列の処理（再帰的）
    if (valueType === "array" && Array.isArray(value)) {
      isArray = true;
      arrayDepth++;

      // 空の配列の場合
      if (value.length === 0) {
        itemTypes.add("any");
        continue;
      }

      // 配列要素の型を再帰的に収集
      const elementSamples: unknown[] = [];
      let maxDepth = 0;

      for (const item of value) {
        if (Array.isArray(item)) {
          maxDepth = Math.max(maxDepth, getArrayDepth(item));
          flattenArray(item).forEach((el) => elementSamples.push(el));
        } else {
          elementSamples.push(item);
        }
      }

      arrayDepth = Math.max(arrayDepth, maxDepth + 1);
      const elementPrediction = predictTypeFromSamples(
        elementSamples,
        depth + 1,
      );

      if (!arrayElementType) {
        arrayElementType = elementPrediction;
      } else {
        // 既存の型予測とマージ
        arrayElementType = mergeTypePredictions(
          arrayElementType,
          elementPrediction,
        );
      }

      // プリミティブ型の収集
      elementSamples.forEach((item) => {
        if (!Array.isArray(item)) {
          itemTypes.add(getValueType(item));
        }
      });
    }
  }

  // null と undefined の処理
  const isNullable = types.has("null");
  const isOptional = types.has("undefined");
  if (isNullable) types.delete("null");
  if (isOptional) types.delete("undefined");

  // 型文字列の生成
  let typeStr: string;
  if (types.size === 0) {
    typeStr = isNullable ? "null" : "undefined";
  } else if (types.size === 1) {
    const [type] = types;
    typeStr = type;
    if (isNullable && isOptional) {
      typeStr = `${type} | null | undefined`;
    } else if (isNullable) {
      typeStr = `${type} | null`;
    } else if (isOptional) {
      typeStr = `${type} | undefined`;
    }
  } else {
    // 複数の型が存在する場合、優先順位に基づいてソート
    const typeArray = Array.from(types).sort((a, b) => {
      const order = {
        date: 12,
        regexp: 11,
        error: 10,
        map: 9,
        set: 8,
        promise: 7,
        buffer: 6,
        object: 5,
        array: 4,
        string: 3,
        number: 2,
        boolean: 1,
      };
      return (
        (order[b as keyof typeof order] || 0) -
        (order[a as keyof typeof order] || 0)
      );
    });

    let unionType = typeArray.join(" | ");
    if (isNullable) unionType += " | null";
    if (isOptional) unionType += " | undefined";
    typeStr = unionType;
  }

  return {
    type: typeStr,
    isArray,
    itemTypes: itemTypes.size > 0 ? itemTypes : undefined,
    arrayDepth: arrayDepth > 0 ? arrayDepth : undefined,
    arrayElementType,
    isNullable,
  };
}

/**
 * 配列の深さを取得
 */
function getArrayDepth(arr: unknown[]): number {
  let depth = 1;
  for (const item of arr) {
    if (Array.isArray(item)) {
      depth = Math.max(depth, getArrayDepth(item) + 1);
    }
  }
  return depth;
}

/**
 * 配列を平坦化
 */
function flattenArray(arr: unknown[]): unknown[] {
  const result: unknown[] = [];
  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...flattenArray(item));
    } else {
      result.push(item);
    }
  }
  return result;
}

/**
 * 型予測をマージ
 */
function mergeTypePredictions(
  a: TypePrediction,
  b: TypePrediction,
): TypePrediction {
  const types = new Set<string>();
  if (a.type.includes("|")) {
    a.type
      .split("|")
      .map((t) => t.trim())
      .forEach((t) => types.add(t));
  } else {
    types.add(a.type);
  }
  if (b.type.includes("|")) {
    b.type
      .split("|")
      .map((t) => t.trim())
      .forEach((t) => types.add(t));
  } else {
    types.add(b.type);
  }

  const mergedItemTypes = new Set<string>();
  if (a.itemTypes) {
    for (const type of a.itemTypes) {
      mergedItemTypes.add(type);
    }
  }
  if (b.itemTypes) {
    for (const type of b.itemTypes) {
      mergedItemTypes.add(type);
    }
  }

  return {
    type: Array.from(types).join(" | "),
    isArray: a.isArray || b.isArray,
    itemTypes: mergedItemTypes.size > 0 ? mergedItemTypes : undefined,
    arrayDepth: Math.max(a.arrayDepth || 0, b.arrayDepth || 0),
    arrayElementType: a.arrayElementType || b.arrayElementType,
    isNullable: a.isNullable || b.isNullable,
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
    const path = buildPath(info.segments);

    // 同じパスの値を収集
    const samples = pathInfos
      .filter((p) => buildPath(p.segments) === path)
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
