# JSON型予測システム 設計ドキュメント

## 概要

JSONデータから型を予測し、zodスキーマを生成するシステムの設計ドキュメントです。

## データ構造

### パス情報

```typescript
// パスの構造を表現
interface PathSegment {
  type: "key" | "index" | "wildcard";
  value: string;
  arrayAccess?: boolean;
  // 配列アクセスの場合の追加情報
  arrayInfo?: {
    isTuple: boolean; // タプルかどうか
    itemTypes: PathInfo[]; // 要素の型情報
  };
}

interface PathInfo {
  segments: PathSegment[]; // パスセグメントの配列
  value: unknown;
  type: "string" | "number" | "boolean" | "null" | "object" | "array";
  isNullable: boolean;
  metadata?: {
    // 型予測のための追加メタデータ
    occurrences: number; // 出現回数
    patterns?: string[]; // 文字列パターン（enumの予測用）
    recordPattern?: { // Record<string, T>の予測用
      keyPattern: string; // キーのパターン
      valueType: PathInfo; // 値の型情報
    };
  };
}
```

## モジュール構成

### 1. フラット展開モジュール (core/flatten.ts)

JSONをフラットなパス情報に変換するモジュール。

```typescript
function flattenJson(json: unknown): PathInfo[] {
  // JSONをフラットなパス情報に変換
  // パスセグメントの構造化
  // 配列アクセスパターンの検出
}
```

### 2. パス解析モジュール (core/path-analyzer.ts)

パス情報を分析し、型予測のための情報を抽出するモジュール。

```typescript
function analyzePath(pathInfo: PathInfo): PathAnalysis {
  // パスセグメントの分析
  // 配列アクセスパターンの検出
  // Record パターンの検出
}
```

### 3. 型予測モジュール (core/predict.ts)

パス情報から型を予測するモジュール。

```typescript
function predictType(pathInfos: PathInfo[]): TypePrediction {
  // パス情報から型を予測
  // パターンマッチングによる型推論
  // メタデータを使用した高度な予測
}
```

### 4. スキーマ構築モジュール (core/schema.ts)

予測結果からzodスキーマを構築するモジュール。

```typescript
function buildSchema(predictions: TypePrediction[]): z.ZodSchema {
  // 予測結果からzodスキーマを構築
  // パスの構造を考慮したスキーマ生成
}
```

### 5. メインモジュール (core/type-predictor.ts)

全体を統合するメインモジュール。

```typescript
export class TypePredictor {
  predict(json: unknown): z.ZodSchema {
    // 1. フラット展開
    const paths = flattenJson(json);

    // 2. パス解析
    const analyses = paths.map(analyzePath);

    // 3. 型予測
    const predictions = predictType(paths);

    // 4. スキーマ構築
    return buildSchema(predictions);
  }
}
```

## 実装の流れ

1. フラット展開モジュールの実装
   - JSONの再帰的な展開
   - パスセグメントの構造化
   - 配列アクセスの検出

2. パス解析モジュールの実装
   - パターン検出ロジック
   - メタデータ収集

3. 型予測モジュールの実装
   - 基本型の予測
   - 複合型の予測
   - パターンベースの予測

4. スキーマ構築モジュールの実装
   - zodスキーマの生成
   - 型の最適化

5. メインモジュールの実装
   - 全体の統合
   - APIの提供

## テスト計画

各モジュールに対して以下のテストを実装:

1. フラット展開テスト
   - 基本的なJSONの展開
   - ネストされたオブジェクト
   - 配列の処理
   - エッジケース

2. パス解析テスト
   - パターン検出
   - メタデータ収集
   - エッジケース

3. 型予測テスト
   - 基本型の予測
   - 複合型の予測
   - パターンベースの予測
   - エッジケース

4. スキーマ構築テスト
   - スキーマ生成
   - 型の最適化
   - エッジケース

5. 統合テスト
   - エンドツーエンドのテスト
   - パフォーマンステスト
