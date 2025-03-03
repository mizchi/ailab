import { z } from "npm:zod";
import type { Schema } from "npm:jsonschema";

// オプショナルまたはデフォルト値を持つ型かチェック
export function isOptionalType(zodType: z.ZodTypeAny): boolean {
  return zodType instanceof z.ZodOptional || zodType instanceof z.ZodDefault;
}

// JSONスキーマに変換（シンプル版）
export function zodToJsonSchema(schema: z.ZodTypeAny): Schema {
  // 基本的な型の処理
  if (schema instanceof z.ZodString) {
    return {
      type: "string",
      ...(schema.description ? { description: schema.description } : {}),
    };
  } else if (schema instanceof z.ZodNumber) {
    return {
      type: "number",
      ...(schema.description ? { description: schema.description } : {}),
    };
  } else if (schema instanceof z.ZodBoolean) {
    return {
      type: "boolean",
      ...(schema.description ? { description: schema.description } : {}),
    };
  } else if (schema instanceof z.ZodArray) {
    return {
      type: "array",
      items: zodToJsonSchema(schema._def.type),
      ...(schema.description ? { description: schema.description } : {}),
    };
  } else if (schema instanceof z.ZodObject) {
    // オブジェクト型の処理をシンプルに実装
    const properties: Record<string, Schema> = {};
    const required: string[] = [];

    // 型安全に処理するために型アサーションを使用
    const shape = schema.shape as Record<string, z.ZodTypeAny>;

    for (const key of Object.keys(shape)) {
      const zodSchema = shape[key];
      properties[key] = zodToJsonSchema(zodSchema);

      // 必須フィールドの判定 - オプショナルまたはデフォルト値を持つフィールドは必須ではない
      if (!isOptionalType(zodSchema)) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      ...(required.length > 0 ? { required } : {}),
      ...(schema.description ? { description: schema.description } : {}),
    };
  } else if (schema instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: [...schema._def.values],
      ...(schema.description ? { description: schema.description } : {}),
    };
  } else if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema._def.innerType);
  } else if (schema instanceof z.ZodDefault) {
    const innerSchema = zodToJsonSchema(schema._def.innerType);
    return {
      ...innerSchema,
      // @ts-ignore wip
      default: schema._def.defaultValue(),
    };
  }

  // 複雑な型は単純なobjectとして扱う（型安全性を確保するため）
  return {
    type: "object",
    ...(schema.description ? { description: schema.description } : {}),
  };
}
