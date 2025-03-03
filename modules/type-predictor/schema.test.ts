/**
 * スキーマ構築モジュール
 *
 * 予測結果からzodスキーマを構築します。
 */

import { z } from "./deps.ts";
import type { StructurePrediction, TypePrediction } from "./types.ts";

/**
 * プリミティブ型のスキーマを構築
 */
function buildPrimitiveSchema(type: string): z.ZodType {
  switch (type) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "null":
      return z.null();
    default:
      if (type.startsWith("enum(")) {
        // 列挙型の処理
        const values = type
          .slice(5, -1)
          .split(" | ")
          .map((v) => v.trim());
        return z.enum(values as [string, ...string[]]);
      }
      // ユニオン型の処理
      if (type.includes(" | ")) {
        const types = type.split(" | ").map((t) => t.trim());
        const schemas = types.map((t) =>
          t === "null" ? z.null() : buildPrimitiveSchema(t)
        );
        if (schemas.length < 2) {
          return schemas[0] || z.any();
        }
        return z.union([schemas[0], schemas[1], ...schemas.slice(2)]);
      }
      return z.any();
  }
}

/**
 * 配列のスキーマを構築
 */
function buildArraySchema(
  itemTypes: Set<string> | undefined,
  children: Map<string, StructurePrediction> | undefined,
): z.ZodType {
  // タプル型の場合
  if (children && children.size > 0 && children.has("$")) {
    const itemSchema = buildStructureSchema(children.get("$")!);
    return z.array(itemSchema);
  }

  // 通常の配列の場合
  if (itemTypes && itemTypes.size > 0) {
    const itemSchemas = Array.from(itemTypes).map((type) =>
      buildPrimitiveSchema(type)
    );
    if (itemSchemas.length === 1) {
      return z.array(itemSchemas[0]);
    }
    return z.array(
      z.union([itemSchemas[0], itemSchemas[1], ...itemSchemas.slice(2)]),
    );
  }

  // デフォルトケース
  return z.array(z.any());
}

/**
 * Record型のスキーマを構築
 */
function buildRecordSchema(
  keyPattern: string | undefined,
  valueType: string | undefined,
): z.ZodType {
  if (!keyPattern || !valueType) {
    return z.record(z.any());
  }

  let keySchema: z.ZodType;
  switch (keyPattern) {
    case "word":
      keySchema = z.string().regex(/^[a-z]+$/);
      break;
    case "PascalCase":
      keySchema = z.string().regex(/^[A-Z][a-z]+$/);
      break;
    case "camelCase":
      keySchema = z.string().regex(/^[a-z]+(?:[A-Z][a-z]+)*$/);
      break;
    case "snake_case":
      keySchema = z.string().regex(/^[a-z]+(?:_[a-z]+)*$/);
      break;
    default:
      keySchema = z.string();
  }

  return z.record(keySchema, buildPrimitiveSchema(valueType));
}

/**
 * オブジェクトのスキーマを構築
 */
function buildObjectSchema(
  children: Map<string, StructurePrediction>,
): z.ZodType {
  const shape: Record<string, z.ZodType> = {};
  for (const [key, value] of children) {
    shape[key] = buildStructureSchema(value);
  }
  return z.object(shape);
}

/**
 * 構造からスキーマを構築
 */
function buildStructureSchema(structure: StructurePrediction): z.ZodType {
  switch (structure.type) {
    case "primitive":
      return buildPrimitiveSchema(structure.valueType || "any");
    case "array":
      return buildArraySchema(
        structure.children?.get("$")?.valueType
          ? new Set([structure.children.get("$")!.valueType!])
          : undefined,
        structure.children,
      );
    case "record":
      return buildRecordSchema(structure.keyPattern, structure.valueType);
    case "object":
      return buildObjectSchema(structure.children || new Map());
    default:
      return z.any();
  }
}

/**
 * 予測結果からzodスキーマを構築
 */
export function buildSchema(
  structure: StructurePrediction,
  predictions: Map<string, TypePrediction>,
): z.ZodType {
  return buildStructureSchema(structure);
}

// Unit Tests
import { expect, test } from "./deps.ts";

test("buildSchema - primitive types", () => {
  const structure: StructurePrediction = {
    type: "object",
    children: new Map([
      ["name", { type: "primitive", valueType: "string" }],
      ["age", { type: "primitive", valueType: "number" }],
      ["active", { type: "primitive", valueType: "boolean" }],
      ["data", { type: "primitive", valueType: "null" }],
    ]),
  };

  const schema = buildSchema(structure, new Map());
  const result = schema.safeParse({
    name: "John",
    age: 30,
    active: true,
    data: null,
  });

  expect(result.success).toBe(true);
});

test("buildSchema - arrays", () => {
  const structure: StructurePrediction = {
    type: "object",
    children: new Map([
      [
        "scores",
        {
          type: "array",
          children: new Map([
            ["$", { type: "primitive", valueType: "number" }],
          ]),
        },
      ],
    ]),
  };

  const schema = buildSchema(structure, new Map());
  const result = schema.safeParse({
    scores: [85, 92, 78],
  });

  expect(result.success).toBe(true);

  const invalidResult = schema.safeParse({
    scores: ["invalid"],
  });
  expect(invalidResult.success).toBe(false);
});

test("buildSchema - mixed arrays", () => {
  const structure: StructurePrediction = {
    type: "object",
    children: new Map([
      [
        "mixed",
        {
          type: "array",
          children: new Map([
            [
              "$",
              {
                type: "primitive",
                valueType: "string | number",
              },
            ],
          ]),
        },
      ],
    ]),
  };

  const schema = buildSchema(structure, new Map());
  const result = schema.safeParse({
    mixed: ["string", 42, "another"],
  });

  expect(result.success).toBe(true);
});

test("buildSchema - record types", () => {
  const structure: StructurePrediction = {
    type: "object",
    children: new Map([
      [
        "preferences",
        {
          type: "record",
          keyPattern: "snake_case",
          valueType: "boolean",
        },
      ],
    ]),
  };

  const schema = buildSchema(structure, new Map());
  const result = schema.safeParse({
    preferences: {
      theme_dark: true,
      theme_light: false,
    },
  });

  expect(result.success).toBe(true);
});

test("buildSchema - nested objects", () => {
  const structure: StructurePrediction = {
    type: "object",
    children: new Map([
      [
        "user",
        {
          type: "object",
          children: new Map([
            ["name", { type: "primitive", valueType: "string" }],
            ["age", { type: "primitive", valueType: "number" }],
          ]),
        },
      ],
    ]),
  };

  const schema = buildSchema(structure, new Map());
  const result = schema.safeParse({
    user: {
      name: "John",
      age: 30,
    },
  });

  expect(result.success).toBe(true);
});

test("buildSchema - enum types", () => {
  const structure: StructurePrediction = {
    type: "object",
    children: new Map([
      [
        "status",
        {
          type: "primitive",
          valueType: "enum(active | inactive | pending)",
        },
      ],
    ]),
  };

  const schema = buildSchema(structure, new Map());
  const result = schema.safeParse({
    status: "active",
  });

  expect(result.success).toBe(true);
  const invalidResult = schema.safeParse({
    status: "invalid",
  });
  expect(invalidResult.success).toBe(false);
});
