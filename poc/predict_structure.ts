/* @script */
import { collectTypeInfo } from "./structured_type_predict.ts";
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

/**
 * 構造予測モジュール
 *
 * サンプル値から親子関係を予測し、
 * オブジェクト構造を推論します。
 */

/**
 * 構造の種類
 */
type StructureType =
  | "object" // 通常のオブジェクト
  | "array" // 配列
  | "record" // Record<string, T>
  | "primitive" // プリミティブ値
  | "mixed"; // 混合型

/**
 * 構造の予測結果
 */
interface StructurePrediction {
  type: StructureType;
  children?: Map<string, StructurePrediction>;
  valueType?: string;
  keyPattern?: string; // Record型の場合のキーパターン
}

/**
 * パスの親子関係
 */
interface PathRelation {
  parent: string;
  key: string;
  children: Set<string>;
  samples: unknown[];
}

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
  return relation.key === "$";
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
  const compatibleTypes = new Set(["string", "number", "boolean"]);
  const hasCompatibleTypes = Array.from(childTypes).every(
    (type) => type === "null" || compatibleTypes.has(type),
  );

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

  return {
    isRecord,
    keyPattern: isRecord ? keyPattern : undefined,
    valueType: isRecord
      ? Array.from(childTypes).filter((t) => t !== "null")[0]
      : undefined,
  };
}

/**
 * 構造を予測
 */
function predictStructure(
  path: string,
  relations: Map<string, PathRelation>,
): StructurePrediction {
  const relation = relations.get(path);
  if (!relation) {
    return { type: "primitive" };
  }

  // 子要素がない場合はプリミティブ
  if (relation.children.size === 0) {
    const sample = relation.samples[0];
    return {
      type: "primitive",
      valueType: sample === null ? "null" : typeof sample,
    };
  }

  // 配列の場合
  if (isArrayPath(relation)) {
    return {
      type: "array",
      children: new Map(
        Array.from(relation.children).map((childPath) => [
          getLastKey(childPath),
          predictStructure(childPath, relations),
        ]),
      ),
    };
  }

  // Record型の可能性を検証
  const recordPattern = detectRecordPattern(relation.children, relations, path);
  if (recordPattern.isRecord) {
    return {
      type: "record",
      keyPattern: recordPattern.keyPattern,
      valueType: recordPattern.valueType,
    };
  }

  // オブジェクトの場合
  const children = new Map<string, StructurePrediction>();
  for (const childPath of relation.children) {
    const childKey = getLastKey(childPath);
    const childStructure = predictStructure(childPath, relations);
    children.set(childKey, childStructure);
  }

  return {
    type: "object",
    children,
  };
}

/**
 * 構造を予測して出力
 */
function predictAndPrintStructure(
  samples: Map<string, { sampleValues: unknown[] }>,
): void {
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

  const structure = predictStructure("", relations);

  console.log("Path Relations:");
  for (const [path, relation] of relations) {
    console.log(`${path || "root"}:`, {
      parent: relation.parent || "none",
      key: relation.key || "root",
      children: Array.from(relation.children),
      sampleCount: relation.samples.length,
    });
  }

  console.log("\nPredicted Structure:");
  console.log(JSON.stringify(structure, null, 2));
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
    preferences: {
      theme_dark: true,
      theme_compact: false,
      theme_font: "Arial",
    },
  };

  // 既存の型予測から構造を予測
  const { samples } = collectTypeInfo(testData);
  predictAndPrintStructure(samples);
}

// Unit Tests
test("getParentPath - path extraction", () => {
  expect(getParentPath("a.b.c")).toBe("a.b");
  expect(getParentPath("a")).toBe("");
  expect(getParentPath("")).toBe("");
});

test("getLastKey - key extraction", () => {
  expect(getLastKey("a.b.c")).toBe("c");
  expect(getLastKey("a")).toBe("a");
  expect(getLastKey("")).toBe("");
});

test("detectKeyPattern - pattern detection", () => {
  expect(detectKeyPattern(["$", "$", "$"])).toBe("array");
  expect(detectKeyPattern(["user", "admin", "guest"])).toBe("word");
  expect(detectKeyPattern(["firstName", "lastName"])).toBe("camelCase");
  expect(detectKeyPattern(["first_name", "last_name"])).toBe("snake_case");
  expect(detectKeyPattern(["User", "Admin"])).toBe("PascalCase");
  expect(detectKeyPattern(["user1", "admin2"])).toBe("mixed");
  expect(detectKeyPattern(["theme_dark", "theme_light"])).toBe("snake_case");
});

test("extractPathRelations - relation extraction", () => {
  const samples = new Map([
    ["user", { sampleValues: [{}] }],
    ["user.name", { sampleValues: ["John"] }],
    ["user.age", { sampleValues: [30] }],
  ]);

  const relations = extractPathRelations(samples);

  expect(relations.get("")?.children.has("user")).toBe(true);
  expect(relations.get("user")?.children.has("user.name")).toBe(true);
  expect(relations.get("user")?.children.has("user.age")).toBe(true);
});

test("predictStructure - structure prediction", () => {
  const samples = new Map([
    ["user", { sampleValues: [{}] }],
    ["user.name", { sampleValues: ["John"] }],
    ["user.age", { sampleValues: [30] }],
    ["user.scores", { sampleValues: [[85, 92, 78]] }],
    ["user.scores.$", { sampleValues: [85, 92, 78] }],
    ["preferences", { sampleValues: [{}] }],
    ["preferences.theme_dark", { sampleValues: [true] }],
    ["preferences.theme_light", { sampleValues: [false] }],
    ["preferences.theme_font", { sampleValues: ["Arial"] }],
  ]);

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

  const structure = predictStructure("", relations);

  // ルート構造のチェック
  expect(structure.type).toBe("object");

  // user オブジェクトのチェック
  const user = structure.children?.get("user");
  expect(user?.type).toBe("object");
  expect(user?.children?.get("name")?.type).toBe("primitive");
  expect(user?.children?.get("name")?.valueType).toBe("string");
  expect(user?.children?.get("age")?.type).toBe("primitive");
  expect(user?.children?.get("age")?.valueType).toBe("number");

  // scores 配列のチェック
  const scores = user?.children?.get("scores");
  expect(scores?.type).toBe("array");

  // preferences オブジェクトのチェック
  const preferences = structure.children?.get("preferences");
  expect(preferences?.type).toBe("record");
  expect(preferences?.keyPattern).toBe("snake_case");
  expect(preferences?.valueType).toBe("boolean");
});

test("detectRecordPattern - record type detection", () => {
  const samples = new Map([
    ["preferences", { sampleValues: [{}] }],
    ["preferences.theme_dark", { sampleValues: [true] }],
    ["preferences.theme_light", { sampleValues: [false] }],
    ["preferences.theme_font", { sampleValues: ["Arial"] }],
  ]);

  const relations = extractPathRelations(samples);
  const children = relations.get("preferences")?.children || new Set();

  const result = detectRecordPattern(children, relations, "preferences");
  expect(result.isRecord).toBe(true);
  expect(result.keyPattern).toBe("snake_case");
  expect(result.valueType).toBe("boolean");
});

test("isArrayPath - array detection", () => {
  // 配列自体のパス
  expect(
    isArrayPath({
      parent: "user",
      key: "scores",
      children: new Set(),
      samples: [[1, 2, 3]],
    }),
  ).toBe(true);

  // 配列要素のパス
  expect(
    isArrayPath({
      parent: "user.scores",
      key: "$",
      children: new Set(),
      samples: [1],
    }),
  ).toBe(true);

  // 通常のオブジェクト
  expect(
    isArrayPath({
      parent: "user",
      key: "name",
      children: new Set(),
      samples: ["John"],
    }),
  ).toBe(false);
});
