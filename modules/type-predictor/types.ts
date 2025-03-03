/**
 * 型予測システムの型定義
 */

/**
 * パスセグメントの種類
 */
export interface PathSegment {
  type: "key" | "index" | "wildcard";
  value: string;
  arrayAccess?: boolean;
  // 配列アクセスの場合の追加情報
  arrayInfo?: {
    isTuple: boolean; // タプルかどうか
    itemTypes: PathInfo[]; // 要素の型情報
  };
}

/**
 * パスセグメントから文字列パスを生成
 */
export function buildPath(segments: PathSegment[]): string {
  return segments.map((s) => (s.arrayAccess ? "$" : s.value)).join(".");
}

/**
 * パス情報
 */
export interface PathInfo {
  segments: PathSegment[]; // パスセグメントの配列
  value: unknown;
  type: "string" | "number" | "boolean" | "null" | "object" | "array";
  isNullable: boolean;
  metadata?: {
    // 型予測のための追加メタデータ
    occurrences: number; // 出現回数
    patterns?: string[]; // 文字列パターン（enumの予測用）
    recordPattern?: {
      // Record<string, T>の予測用
      keyPattern: string; // キーのパターン
      valueType: PathInfo; // 値の型情報
    };
  };
}

/**
 * 構造の種類
 */
export type StructureType =
  | "object" // 通常のオブジェクト
  | "array" // 配列
  | "record" // Record<string, T>
  | "primitive" // プリミティブ値
  | "mixed"; // 混合型

/**
 * 構造の予測結果
 */
export interface StructurePrediction {
  type: StructureType;
  children?: Map<string, StructurePrediction>;
  valueType?: string;
  keyPattern?: string; // Record型の場合のキーパターン
  itemTypes?: Set<string>; // 配列要素の型情報
  isNullable?: boolean; // null許容かどうか
  arrayDepth?: number; // 配列の深さ（多次元配列用）
  arrayElementType?: StructurePrediction; // 配列要素の型情報（再帰的）
}

/**
 * パスの親子関係
 */
export interface PathRelation {
  parent: string;
  key: string;
  children: Set<string>;
  samples: unknown[];
}

/**
 * アクセスキーの要素
 */
export type AccessKeyElement = string | number;

/**
 * サンプリングされた値の情報
 */
export interface SampledValue {
  // 生のアクセスキー（数値インデックスを保持）
  accessKey: AccessKeyElement[];
  // フラット化されたアクセスキー（数値を $ に変換）
  flatAccessKey: string;
  // サンプル値のコレクション
  sampleValues: unknown[];
}

/**
 * フラット化された値のエントリ
 */
export interface FlatEntry {
  path: string;
  value: unknown;
}

/**
 * パターングループ
 */
export interface PatternGroup {
  pattern: string;
  values: unknown[];
}

/**
 * 値の型
 */
export type ValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null"
  | "undefined"
  | "date"
  | "regexp"
  | "error"
  | "map"
  | "set"
  | "promise"
  | "buffer";

/**
 * 型予測の結果
 */
export interface TypePrediction {
  type: string;
  isArray: boolean;
  itemTypes?: Set<string>;
  arrayDepth?: number;
  arrayElementType?: TypePrediction;
  isNullable?: boolean;
}
