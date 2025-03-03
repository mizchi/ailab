/**
 * 型予測システムのメインモジュール
 */

export * from "./types.ts";
export { flattenJson } from "./flatten.ts";
export { analyzePath } from "./path-analyzer.ts";
export { predictType } from "./predict.ts";
export { buildSchema } from "./schema.ts";

import { flattenJson } from "./flatten.ts";
import { predictType } from "./predict.ts";
import { buildSchema } from "./schema.ts";
import type { PathInfo } from "./types.ts";
import { z } from "./deps.ts";

/**
 * 型予測システムのメインクラス
 */
export class TypePredictor {
  /**
   * JSONデータから型を予測し、zodスキーマを生成します
   *
   * @param json 予測対象のJSONデータ
   * @returns 生成されたzodスキーマ
   */
  predict(json: unknown): z.ZodType {
    // エッジケースの処理
    if (json === null) {
      return z.null();
    }
    if (Array.isArray(json) && json.length === 0) {
      return z.array(z.any());
    }
    if (
      typeof json === "object" &&
      json !== null &&
      Object.keys(json).length === 0
    ) {
      return z.object({});
    }

    // 1. フラット展開
    const paths: PathInfo[] = flattenJson(json);

    // 空のパス情報の場合
    if (paths.length === 0) {
      if (Array.isArray(json)) {
        return z.array(z.any());
      }
      if (typeof json === "object" && json !== null) {
        return z.object({});
      }
      return z.any();
    }

    // 2. 型予測
    const { structure, predictions } = predictType(paths);

    // 3. スキーマ構築
    return buildSchema(structure, predictions);
  }

  /**
   * JSONデータから型情報を抽出します
   *
   * @param json 予測対象のJSONデータ
   * @returns 型情報の詳細
   */
  analyze(json: unknown): {
    paths: PathInfo[];
    structure: unknown;
    predictions: Map<string, unknown>;
  } {
    // エッジケースの処理
    if (
      json === null ||
      (Array.isArray(json) && json.length === 0) ||
      (typeof json === "object" &&
        json !== null &&
        Object.keys(json).length === 0)
    ) {
      return {
        paths: [],
        structure: json,
        predictions: new Map(),
      };
    }

    // 1. フラット展開
    const paths = flattenJson(json);

    // 2. 型予測
    const { structure, predictions } = predictType(paths);

    return {
      paths,
      structure,
      predictions,
    };
  }
}
