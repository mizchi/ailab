# Type Predictor

JSONデータから型を予測し、zodスキーマを生成するモジュール。

## 特徴

- JSONデータの構造を解析し、型を予測
- 配列、オブジェクト、Record型、列挙型などの高度な型を検出
- zodスキーマの自動生成
- 詳細な型情報の分析機能

## 使用方法

```typescript
import { TypePredictor } from "./mod.ts";

// インスタンスを作成
const predictor = new TypePredictor();

// JSONデータから型を予測してスキーマを生成
const data = {
  name: "John",
  age: 30,
  scores: [85, 92, 78],
  contact: {
    email: "john@example.com",
    phone: null,
  },
  preferences: {
    theme_dark: true,
    theme_light: false,
  },
};

// スキーマを生成
const schema = predictor.predict(data);

// スキーマを使用してバリデーション
const result = schema.safeParse(data);
if (result.success) {
  console.log("Valid data!");
} else {
  console.error("Invalid data:", result.error);
}

// 型情報の詳細分析
const analysis = predictor.analyze(data);
console.log("Paths:", analysis.paths);
console.log("Structure:", analysis.structure);
console.log("Type Predictions:", analysis.predictions);
```

## 型予測機能

以下の型を自動的に検出・予測します：

- プリミティブ型（string, number, boolean, null）
- 配列型（同種の要素、混合型）
- オブジェクト型（ネストされた構造）
- Record型（キーパターンと値の型）
- 列挙型（文字列パターンから検出）
- ユニオン型（複数の型が混在する場合）
- Nullable型（null値を含む場合）

## モジュール構成

- `mod.ts` - メインモジュール、公開API
- `types.ts` - 型定義
- `flatten.ts` - JSONのフラット化
- `path-analyzer.ts` - パス解析
- `predict.ts` - 型予測
- `schema.ts` - スキーマ構築

## 開発

### テストの実行

```bash
deno test
```

### 型チェック

```bash
deno check mod.ts
```

## TODO

### テストの改善

- [ ] エッジケースのテスト改善
  - 空の配列の処理
  - 空のオブジェクトの処理
  - nullの処理
- [ ] 配列型の判定改善
  - 配列要素の型判定
  - 混合型配列の処理
- [ ] ネストされたオブジェクトの型判定改善
  - 深いネストの処理
  - 循環参照の検出

### 追加予定のテストパターン

1. 複雑なデータ構造
   - 深いネストを持つオブジェクト
   - 多次元配列
   - 複数の型を含む配列
   - オプショナルなフィールド

2. 特殊なパターン
   - 循環参照を含むオブジェクト
   - 非常に大きな配列
   - 非常に深いネスト
   - 複雑なRecord型パターン

3. エッジケース
   - undefined値の処理
   - NaN, Infinity などの特殊な数値
   - 空文字列
   - 巨大な整数
   - シンボル
   - 関数

4. 実際のユースケース
   - APIレスポンス
   - フォームデータ
   - 設定ファイル
   - データベースレコード

## 制限事項

- 循環参照は現在サポートしていません
- 非常に大きなJSONデータの場合、パフォーマンスが低下する可能性があります
- 一部の複雑なパターンは正確に検出できない場合があります

## ライセンス

MIT
