# AI + Deno コード生成の実験場

このプロジェクトは、AI（特にコーディングエージェント）と Deno
を組み合わせたコード生成の実験場です。Deno
プロジェクトにおけるコーディングルールとモードを定義するための設定ファイルを管理し、AI
によるコード生成の品質と効率を向上させることを目的としています。

`.clinerules` と `.roomodes` が主ない生成物です。

## プロジェクト概要

### 主要な目標

1. AI コーディングエージェント（CLINE/Roo
   など）のための明確なルールとモードを定義する
2. Deno プロジェクトにおけるベストプラクティスを確立する
3. 型安全なコード生成と検証の仕組みを提供する
4. テスト駆動開発（TDD）のワークフローを AI コーディングに適用する
5. アダプターパターンなどの設計パターンを活用した実装例を提供する

### コアコンポーネント

1. **コーディングルール定義**
   - 基本ルール（型と関数インターフェース設計、コードコメント、実装パターン選択）
   - Deno 固有のルール（テスト、モジュール依存関係、コード品質監視）
   - Git ワークフロー（コミット、プルリクエスト作成）
   - TypeScript ベストプラクティス（型使用方針、エラー処理、実装パターン）

2. **実装モード**
   - スクリプトモード: 一つのファイルに完結した実装
   - テストファーストモード: 型シグネチャとテストを先に書く実装
   - モジュールモード: 複数のファイルで構成される実装

3. **ユーティリティモジュール**
   - type-predictor: JSON データから型を予測し、zod スキーマを生成するモジュール
   - アダプターパターン実装例: 外部 API との通信を抽象化する実装

## 技術スタック

### コア技術

- **Deno**: TypeScript のネイティブサポート、セキュリティ機能、標準ライブラリ
- **TypeScript**: 静的型付け、型推論、インターフェース
- **Zod**: スキーマ検証、ランタイム型チェック
- **Neverthrow**: Result 型によるエラー処理

### テスト技術

- **Deno 標準テストライブラリ**: `@std/expect`、`@std/testing/bdd`
- テストカバレッジ計測

### ビルドとツール

- **Deno タスクランナー**: `deno.json` での定義
- **GitHub Actions**: CI/CD パイプライン

## 主要モジュール

### type-predictor

JSONデータから型を予測し、zodスキーマを生成するモジュール。

特徴:

- JSONデータの構造を解析し、型を予測
- 配列、オブジェクト、Record型、列挙型などの高度な型を検出
- zodスキーマの自動生成
- 詳細な型情報の分析機能

使用例:

```typescript
import { TypePredictor } from "./mod.ts";

// インスタンスを作成
const predictor = new TypePredictor();

// JSONデータから型を予測してスキーマを生成
const data = {
  name: "John",
  age: 30,
  scores: [85, 92, 78],
};

// スキーマを生成
const schema = predictor.predict(data);

// スキーマを使用してバリデーション
const result = schema.safeParse(data);
```

### zodcli

Zod を使用した型安全なコマンドラインパーサーモジュールです。

特徴：

- **型安全**: Zodスキーマに基づいた型安全なCLIパーサー
- **自動ヘルプ生成**: コマンド構造から自動的にヘルプテキストを生成
- **位置引数とオプションのサポート**: 位置引数と名前付き引数の両方をサポート
- **サブコマンドのサポート**: gitのようなサブコマンド構造をサポート
- **デフォルト値**: Zodの機能を活用したデフォルト値の設定

使用例：

```typescript
import { createCliCommand, runCommand } from "@mizchi/zodcli";
import { z } from "npm:zod";

const cli = createCliCommand({
  name: "myapp",
  description: "My CLI application",
  args: {
    file: {
      type: z.string().describe("input file"),
      positional: true,
    },
    verbose: {
      type: z.boolean().default(false),
      short: "v",
    },
  },
});

const result = cli.parse(Deno.args);
runCommand(result, (data) => {
  console.log(`Processing ${data.file}, verbose: ${data.verbose}`);
});
```

### アダプターパターン実装例

TypeScriptでのAdapterパターンは、外部依存を抽象化し、テスト可能なコードを実現するためのパターンです。

実装パターン:

1. **関数ベース**: 内部状態を持たない単純な操作の場合
2. **classベース**: 設定やキャッシュなどの内部状態を管理する必要がある場合
3. **高階関数とコンストラクタインジェクション**:
   外部APIとの通信など、モックが必要な場合

ベストプラクティス:

- インターフェースはシンプルに保つ
- 基本的には関数ベースを優先する
- 内部状態が必要な場合のみclassを使用する
- エラー処理はResult型で表現し、例外を使わない

## 現在の状況

| コンポーネント       | ステータス | 進捗率 | 優先度 |
| -------------------- | ---------- | ------ | ------ |
| ルールとモード定義   | 安定       | 90%    | 低     |
| type-predictor       | 開発中     | 60%    | 高     |
| zodcli               | 安定       | 100%   | 中     |
| アダプターパターン例 | 安定       | 80%    | 中     |
| テストインフラ       | 安定       | 70%    | 中     |
| CI/CD パイプライン   | 開発中     | 50%    | 中     |
| メモリバンク         | 初期段階   | 30%    | 高     |
| ドキュメント         | 初期段階   | 40%    | 高     |

### 次のマイルストーン

1. **type-predictor の基本機能完成（現在）**
   - 基本的な型検出と予測
   - 基本的な zod スキーマ生成
   - 基本的なテストケース

2. **type-predictor の拡張機能（次のフェーズ）**
   - Record 型、列挙型、ユニオン型の検出
   - エッジケースのテスト追加
   - パフォーマンスの最適化

3. **実装例の充実（将来）**
   - 新しい設計パターンの実装例
   - モジュールモードの詳細な実装例
   - ユースケースの例の追加

### ts-callgraph

TypeScriptコードのコールグラフを生成するツールです。

使用例:

```bash
deno run -A ts-callgraph/cli.ts scripts/callgraph-sample.ts --format function-summary
```

4. **完全なドキュメントとテスト（最終フェーズ）**
   - API ドキュメントの完成
   - テストカバレッジ目標の達成
   - チュートリアルとガイドラインの完成
   - CI/CD パイプラインの完全自動化

## .cline ディレクトリの説明

このリポジトリの `.cline` ディレクトリは、Deno
プロジェクトにおけるコーディングルールとモードを定義するための設定ファイルを管理しています。

### ディレクトリ構造

```
.cline/
├── build.ts        - プロンプトファイルを結合して .clinerules と .roomodes を生成するスクリプト
├── rules/          - コーディングルールを定義するマークダウンファイル
│   ├── 01_basic.md       - 基本的なルールと AI Coding with Deno の概要
│   ├── deno_rules.md     - Deno に関するルール（テスト、モジュール依存関係など）
│   ├── git_workflow.md   - Git ワークフローに関するルール
│   └── ts_bestpractice.md - TypeScript のコーディングベストプラクティス
└── roomodes/       - 実装モードを定義するマークダウンファイル
    ├── deno-script.md    - スクリプトモードの定義
    ├── deno-module.md    - モジュールモードの定義
    └── deno-tdd.md       - テストファーストモードの定義
```

### 生成されるファイル

`.cline/build.ts` スクリプトを実行すると、以下のファイルが生成されます：

1. `.clinerules` - `rules`
   ディレクトリ内のマークダウンファイルを結合したファイル
2. `.roomodes` - `roomodes` ディレクトリ内のマークダウンファイルから生成された
   JSON ファイル

### 使用方法

1. `.cline/rules`
   ディレクトリにコーディングルールを定義するマークダウンファイルを追加または編集します。
2. `.cline/roomodes`
   ディレクトリに実装モードを定義するマークダウンファイルを追加または編集します。
3. `.cline/build.ts` スクリプトを実行して、`.clinerules` と `.roomodes`
   ファイルを生成します。

```bash
deno run --allow-read --allow-write .cline/build.ts
```

4. 生成された `.clinerules` と `.roomodes` ファイルは、AI
   コーディングアシスタント（CLINE/Roo
   など）によって読み込まれ、プロジェクトのルールとモードが適用されます。

### モードの切り替え方法

プロジェクトで定義されているモードは以下の通りです：

- `deno-script` (Deno:ScriptMode) - スクリプトモード
- `deno-module` (Deno:Module) - モジュールモード
- `deno-tdd` (Deno:TestFirstMode) - テストファーストモード

モードを切り替えるには、AI
コーディングアシスタントに対して以下のように指示します：

```
モードを deno-script に切り替えてください。
```

または、ファイルの冒頭に特定のマーカーを含めることでモードを指定することもできます：

- スクリプトモード: `@script`
- テストファーストモード: `@tdd`

例：

```ts
// @script @tdd
// このファイルはスクリプトモードとテストファーストモードの両方で実装されます
```

## 開発環境のセットアップ

### 必要なツール

1. **Deno のインストール**
   ```bash
   # Unix (macOS, Linux)
   curl -fsSL https://deno.land/x/install/install.sh | sh

   # Windows (PowerShell)
   iwr https://deno.land/x/install/install.ps1 -useb | iex
   ```

2. **エディタ設定**
   - VSCode + Deno 拡張機能
   - 設定例:
     ```json
     {
       "deno.enable": true,
       "deno.lint": true,
       "deno.unstable": false,
       "editor.formatOnSave": true,
       "editor.defaultFormatter": "denoland.vscode-deno"
     }
     ```

3. **プロジェクトのセットアップ**
   ```bash
   # リポジトリのクローン
   git clone <repository-url>
   cd <repository-directory>

   # 依存関係のキャッシュ
   deno cache --reload deps.ts

   # ルールとモードの生成
   deno run --allow-read --allow-write .cline/build.ts
   ```

### 開発ワークフロー

1. **新しいスクリプトの作成**
   ```bash
   # スクリプトモードでの開発
   touch scripts/new-script.ts
   # ファイル冒頭に `@script` を追加
   ```

2. **テストの実行**
   ```bash
   # 単一ファイルのテスト
   deno test scripts/new-script.ts

   # すべてのテストの実行
   deno test

   # カバレッジの計測
   deno test --coverage=coverage && deno coverage coverage
   ```

3. **リントとフォーマット**
   ```bash
   # リント
   deno lint

   # フォーマット
   deno fmt
   ```

4. **依存関係の検証**
   ```bash
   deno task check:deps
   ```

## ライセンス

MIT
