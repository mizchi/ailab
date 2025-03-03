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
    case "undefined":
      return z.undefined();
    case "date":
      return z.instanceof(Date);
    case "regexp":
      return z.instanceof(RegExp);
    case "error":
      return z.instanceof(Error);
    case "map":
      return z.instanceof(Map);
    case "set":
      return z.instanceof(Set);
    case "promise":
      return z.instanceof(Promise);
    case "buffer":
      return z.instanceof(Uint8Array);
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
        const schemas = types.map((t) => {
          if (t === "null") return z.null();
          if (t === "undefined") return z.undefined();
          return buildPrimitiveSchema(t);
        });
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
  depth = 0,
): z.ZodType {
  // 再帰の深さ制限
  if (depth > 10) {
    return z.array(z.any());
  }

  // 空の配列の場合
  if (!itemTypes && (!children || children.size === 0)) {
    return z.array(z.any());
  }

  let elementSchema: z.ZodType | undefined;

  // 子要素からスキーマを構築
  if (children && children.size > 0) {
    const childSchemas = Array.from(children.values()).map((child) => {
      if (child.type === "array") {
        // 再帰的に配列の型を構築
        const childSchema = buildArraySchema(
          child.itemTypes,
          child.children,
          depth + 1,
        );
        // 多次元配列の処理
        if (child.arrayDepth && child.arrayDepth > 1) {
          let schema = childSchema;
          for (let i = 1; i < child.arrayDepth; i++) {
            schema = z.array(schema);
          }
          return schema;
        }
        return childSchema;
      }
      return buildStructureSchema(child);
    });

    // 共通の型を見つける
    const commonSchema = findCommonSchema(childSchemas);
    if (commonSchema) {
      elementSchema = commonSchema;
    } else if (childSchemas.length >= 2) {
      elementSchema = z.union([
        childSchemas[0],
        childSchemas[1],
        ...childSchemas.slice(2),
      ]);
    } else if (childSchemas.length === 1) {
      elementSchema = childSchemas[0];
    }
  }

  // プリミティブ型の配列
  if (!elementSchema && itemTypes && itemTypes.size > 0) {
    const itemSchemas = Array.from(itemTypes).map(buildPrimitiveSchema);
    const commonSchema = findCommonSchema(itemSchemas);
    if (commonSchema) {
      elementSchema = commonSchema;
    } else if (itemSchemas.length >= 2) {
      elementSchema = z.union([
        itemSchemas[0],
        itemSchemas[1],
        ...itemSchemas.slice(2),
      ]);
    } else if (itemSchemas.length === 1) {
      elementSchema = itemSchemas[0];
    }
  }

  // 最終的なスキーマを構築
  const finalSchema = elementSchema || z.any();
  let arraySchema = z.array(finalSchema);

  // 多次元配列の処理
  if (depth > 1) {
    for (let i = 1; i < depth; i++) {
      arraySchema = z.array(arraySchema);
    }
  }

  return arraySchema;
}

/**
 * 共通のスキーマを見つける
 */
function findCommonSchema(schemas: z.ZodType[]): z.ZodType | undefined {
  if (schemas.length === 0) return undefined;
  if (schemas.length === 1) return schemas[0];

  // すべてのスキーマが同じ型か確認
  const firstType = schemas[0].constructor.name;
  const allSameType = schemas.every(
    (schema) => schema.constructor.name === firstType,
  );

  if (allSameType) {
    return schemas[0];
  }

  return undefined;
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
  // 空のオブジェクトの場合
  if (children.size === 0) {
    return z.object({});
  }

  const shape: Record<string, z.ZodType> = {};
  for (const [key, value] of children) {
    let fieldSchema = buildStructureSchema(value);

    // オプショナルフィールドの処理
    if (value.isNullable) {
      fieldSchema = fieldSchema.nullable();
    }

    // 配列の深さに応じたスキーマ構築
    if (value.type === "array" && value.arrayDepth && value.arrayDepth > 1) {
      let elementSchema = fieldSchema;
      for (let i = 1; i < value.arrayDepth; i++) {
        elementSchema = z.array(elementSchema);
      }
      fieldSchema = elementSchema;
    }

    shape[key] = fieldSchema;
  }
  return z.object(shape).strict();
}

/**
 * 構造からスキーマを構築
 */
function buildStructureSchema(structure: StructurePrediction): z.ZodType {
  let schema: z.ZodType;

  switch (structure.type) {
    case "primitive":
      schema = buildPrimitiveSchema(structure.valueType || "any");
      break;

    case "array": {
      // 配列要素の型を収集
      const itemTypes = structure.itemTypes || new Set<string>();

      // 配列要素の型情報がある場合は、それを使用
      if (structure.arrayElementType) {
        schema = z.array(buildStructureSchema(structure.arrayElementType));
      } else {
        schema = buildArraySchema(
          itemTypes.size > 0 ? itemTypes : undefined,
          structure.children,
          structure.arrayDepth || 1,
        );
      }
      break;
    }

    case "record":
      schema = buildRecordSchema(structure.keyPattern, structure.valueType);
      break;

    case "object":
      schema = buildObjectSchema(structure.children || new Map());
      break;

    default:
      schema = z.any();
  }

  // Nullableの処理
  if (structure.isNullable) {
    schema = schema.nullable();
  }

  return schema;
}

/**
 * 予測結果からzodスキーマを構築
 */
export function buildSchema(
  structure: StructurePrediction,
  predictions: Map<string, TypePrediction>,
): z.ZodType {
  // nullの場合
  if (structure.type === "primitive" && structure.valueType === "null") {
    return z.null();
  }

  return buildStructureSchema(structure);
}
