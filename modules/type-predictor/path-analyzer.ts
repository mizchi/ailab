/**
 * パス解析モジュール
 *
 * パス情報を分析し、型予測のための情報を抽出します。
 */

import { buildPath } from "./types.ts";
import type { PathInfo, PathRelation, StructurePrediction } from "./types.ts";

/**
 * パスから親のパスを取得
 */
function getParentPath(path: string): string {
  const parts = path.split(".");
  return parts.slice(0, -1).join(".");
}

/**
 * パスから最後のキーを取得
 */
function getLastKey(path: string): string {
  const parts = path.split(".");
  return parts[parts.length - 1];
}

/**
 * キーのパターンを検出
 */
function detectKeyPattern(keys: string[]): string | undefined {
  if (keys.length === 0) return undefined;

  // すべてのキーが数値の場合は配列
  if (keys.every((key) => /^\$/.test(key))) {
    return "array";
  }

  // キーのパターンを検出
  const patterns = keys.map((key) => {
    if (/^\$/.test(key)) return "number";
    if (/^[a-z]+$/.test(key)) return "word";
    if (/^[A-Z][a-z]+$/.test(key)) return "PascalCase";
    if (/^[a-z]+(?:[A-Z][a-z]+)*$/.test(key)) return "camelCase";
    if (/^[a-z]+(?:_[a-z]+)*$/.test(key)) return "snake_case";
    return "mixed";
  });

  // すべてのキーが同じパターンの場合
  const uniquePatterns = new Set(patterns);
  if (uniquePatterns.size === 1) {
    return patterns[0];
  }

  // プレフィックスが共通の場合も考慮
  const prefixes = keys.map((key) => key.split(/[_.]/, 1)[0]);
  const uniquePrefixes = new Set(prefixes);
  if (uniquePrefixes.size === 1) {
    return "prefixed";
  }

  return undefined;
}

/**
 * 配列かどうかを判定
 */
function isArrayPath(relation: PathRelation): boolean {
  // 配列自体のパス
  if (relation.samples.some(Array.isArray)) {
    return true;
  }

  // 配列要素のパス
  if (relation.key === "$") {
    return true;
  }

  // 子要素のキーパターンが配列を示す
  if (relation.children.size > 0) {
    const childKeys = Array.from(relation.children).map((path) =>
      getLastKey(path)
    );
    return detectKeyPattern(childKeys) === "array";
  }

  return false;
}

/**
 * Record型の可能性を検出
 */
function detectRecordPattern(
  children: Set<string>,
  relations: Map<string, PathRelation>,
  path: string,
): { isRecord: boolean; keyPattern?: string; valueType?: string } {
  if (children.size < 2) return { isRecord: false };

  // 子要素のキーパターンを検出
  const childKeys = Array.from(children).map((path) => getLastKey(path));
  const keyPattern = detectKeyPattern(childKeys);
  if (!keyPattern || keyPattern === "array") return { isRecord: false };

  // 子要素の値の型を検証
  const childTypes = new Set<string>();
  const childValues = new Set<unknown>();
  let hasNestedStructure = false;

  for (const childPath of children) {
    const relation = relations.get(childPath);
    if (!relation || relation.samples.length === 0) continue;

    const sample = relation.samples[0];
    const type = sample === null ? "null" : typeof sample;
    childTypes.add(type);
    childValues.add(sample);

    // ネストされた構造をチェック
    if (relation.children.size > 0) {
      hasNestedStructure = true;
    }
  }

  // 型の互換性をチェック
  const compatibleTypes = new Set(["string", "number", "boolean", "object"]);
  const types = Array.from(childTypes).filter((t) => t !== "null");

  // すべての型が同じか、または互換性のある型のみか確認
  const uniqueTypes = new Set(types);
  const hasCompatibleTypes = uniqueTypes.size <= 1 ||
    types.every((type) => compatibleTypes.has(type));

  // Record型として判定する条件
  const isRecord =
    // 2つ以上の子要素がある
    children.size >= 2 &&
    // キーパターンが検出された
    keyPattern !== undefined &&
    // 配列パターンでない
    keyPattern !== "array" &&
    // 型が互換性を持つ
    hasCompatibleTypes &&
    // 値が十分にユニーク
    childValues.size > 1 &&
    // ネストされた構造を持たない
    !hasNestedStructure &&
    // プレフィックスが共通（theme_* など）
    (keyPattern === "prefixed" || keyPattern === "snake_case");

  // 最も一般的な型を選択
  const commonType = Array.from(childTypes)
    .filter((t) => t !== "null")
    .sort((a, b) => {
      const order = { string: 3, number: 2, boolean: 1 };
      return (
        (order[b as keyof typeof order] || 0) -
        (order[a as keyof typeof order] || 0)
      );
    })[0];

  return {
    isRecord,
    keyPattern: isRecord ? keyPattern : undefined,
    valueType: isRecord ? commonType : undefined,
  };
}

/**
 * パスの親子関係を抽出
 */
function extractPathRelations(
  samples: Map<string, { sampleValues: unknown[] }>,
): Map<string, PathRelation> {
  const relations = new Map<string, PathRelation>();

  // ルートパスの初期化
  relations.set("", {
    parent: "",
    key: "",
    children: new Set(),
    samples: [],
  });

  // 各パスの関係を構築
  for (const [path, { sampleValues }] of samples) {
    const parent = getParentPath(path);
    const key = getLastKey(path);

    // 親パスの関係を取得または作成
    let parentRelation = relations.get(parent);
    if (!parentRelation) {
      parentRelation = {
        parent: getParentPath(parent),
        key: getLastKey(parent),
        children: new Set(),
        samples: [],
      };
      relations.set(parent, parentRelation);
    }

    // 現在のパスの関係を作成
    const relation: PathRelation = {
      parent,
      key,
      children: new Set(),
      samples: sampleValues,
    };
    relations.set(path, relation);

    // 親子関係を更新
    parentRelation.children.add(path);
  }

  return relations;
}

/**
 * 構造を予測
 */
function predictStructure(
  path: string,
  relations: Map<string, PathRelation>,
  depth = 0,
): StructurePrediction {
  // 再帰の深さを制限
  if (depth > 100) {
    return { type: "primitive", valueType: "any" };
  }

  const relation = relations.get(path);
  if (!relation) {
    return { type: "primitive" };
  }

  // nullableの判定
  const isNullable = relation.samples.some((sample) => sample === null);

  // 子要素がない場合はプリミティブ
  if (relation.children.size === 0) {
    const sample = relation.samples[0];
    if (sample === null) {
      return { type: "primitive", valueType: "null" };
    }
    if (Array.isArray(sample)) {
      const arrayDepth = calculateArrayDepth(sample);
      const itemTypes = extractArrayItemTypes(sample);
      return {
        type: "array",
        children: new Map(),
        arrayDepth,
        itemTypes,
        isNullable,
      };
    }
    if (typeof sample === "object") {
      return { type: "object", children: new Map(), isNullable };
    }
    return {
      type: "primitive",
      valueType: typeof sample,
      isNullable,
    };
  }

  // 配列の場合
  if (isArrayPath(relation)) {
    const children = new Map<string, StructurePrediction>();
    let maxArrayDepth = 1;
    const itemTypes = new Set<string>();

    for (const childPath of relation.children) {
      const childKey = getLastKey(childPath);
      const childStructure = predictStructure(childPath, relations, depth + 1);
      children.set(childKey, childStructure);

      // 配列の深さを更新
      if (childStructure.type === "array" && childStructure.arrayDepth) {
        maxArrayDepth = Math.max(maxArrayDepth, childStructure.arrayDepth + 1);
      }

      // 要素の型を収集
      if (childStructure.type === "primitive" && childStructure.valueType) {
        itemTypes.add(childStructure.valueType);
      }
    }

    // サンプルからも型情報を収集
    for (const sample of relation.samples) {
      if (Array.isArray(sample)) {
        const depth = calculateArrayDepth(sample);
        maxArrayDepth = Math.max(maxArrayDepth, depth);
        extractArrayItemTypes(sample).forEach((type) => itemTypes.add(type));
      }
    }

    return {
      type: "array",
      children,
      arrayDepth: maxArrayDepth,
      itemTypes: itemTypes.size > 0 ? itemTypes : undefined,
      isNullable,
    };
  }

  // Record型の可能性を検証
  const recordPattern = detectRecordPattern(relation.children, relations, path);
  if (recordPattern.isRecord) {
    return {
      type: "record",
      keyPattern: recordPattern.keyPattern,
      valueType: recordPattern.valueType,
      isNullable,
    };
  }

  // オブジェクトの場合
  const children = new Map<string, StructurePrediction>();
  const validSamples = relation.samples.filter(
    (s): s is object =>
      s !== null && typeof s === "object" && !Array.isArray(s),
  );

  // 子要素の型を収集
  for (const childPath of relation.children) {
    const childKey = getLastKey(childPath);
    const childStructure = predictStructure(childPath, relations, depth + 1);

    // 子要素のnullable状態を更新
    const isChildOptional = validSamples.some(
      (sample) => !(childKey in sample),
    );
    if (isChildOptional) {
      childStructure.isNullable = true;
    }

    children.set(childKey, childStructure);
  }

  // オブジェクトの型情報を構築
  return {
    type: "object",
    children,
    isNullable,
  };
}

/**
 * 配列の深さを計算
 */
function calculateArrayDepth(arr: unknown[]): number {
  let maxDepth = 1;
  for (const item of arr) {
    if (Array.isArray(item)) {
      maxDepth = Math.max(maxDepth, calculateArrayDepth(item) + 1);
    }
  }
  return maxDepth;
}

/**
 * 配列要素の型を抽出
 */
function extractArrayItemTypes(arr: unknown[]): Set<string> {
  const types = new Set<string>();
  for (const item of arr) {
    if (Array.isArray(item)) {
      extractArrayItemTypes(item).forEach((type) => types.add(type));
    } else if (item === null) {
      types.add("null");
    } else {
      types.add(typeof item);
    }
  }
  return types;
}

/**
 * パス情報を分析する
 */
export function analyzePath(pathInfos: PathInfo[]): StructurePrediction {
  // サンプル値のマップを構築
  const samples = new Map<string, { sampleValues: unknown[] }>();
  for (const info of pathInfos) {
    // 各セグメントまでのパスを構築し、サンプル値を設定
    let currentPath = "";
    let currentValue: unknown = {};

    for (let i = 0; i < info.segments.length; i++) {
      const segment = info.segments[i];
      currentPath = currentPath
        ? `${currentPath}.${buildPath([segment])}`
        : buildPath([segment]);

      // 最後のセグメント以外は空のオブジェクトをサンプル値として設定
      if (i < info.segments.length - 1) {
        if (!samples.has(currentPath)) {
          samples.set(currentPath, { sampleValues: [{}] });
        }
      } else {
        // 最後のセグメントには実際の値を設定
        samples.set(currentPath, { sampleValues: [info.value] });
      }
    }
  }

  // パスの関係を抽出
  const relations = extractPathRelations(samples);

  // ルートパスの子要素を設定
  const rootChildren = new Set<string>();
  for (const [path] of samples) {
    const parts = path.split(".");
    if (parts.length === 1) {
      rootChildren.add(path);
    }
  }
  relations.set("", {
    parent: "",
    key: "",
    children: rootChildren,
    samples: [{}],
  });

  // 構造を予測
  return predictStructure("", relations);
}
