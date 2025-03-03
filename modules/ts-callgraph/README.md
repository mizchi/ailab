# ts-callgraph

TypeScript
のソースコードから関数呼び出しの関係を解析し、コールグラフを生成するツールです。

## 特徴

- TypeScript のソースコードを静的解析
- 関数、メソッド、コンストラクタの呼び出し関係を追跡
- クラスの継承関係を可視化
- DOT 形式でグラフを出力（Graphviz で可視化可能）
- テキスト形式での関数呼び出し関係の要約

## インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/ts-callgraph.git
cd ts-callgraph

# 依存関係をインストール
deno cache deps.ts
```

## 使用方法

### コマンドライン

```bash
# 基本的な使用方法
deno run -A cli.ts <ファイルパス> [オプション]

# 例: DOT 形式で出力
deno run -A cli.ts path/to/your/file.ts -o callgraph.dot

# 例: PNG 形式で可視化（Graphviz が必要）
deno run -A cli.ts path/to/your/file.ts -o callgraph.dot && dot -Tpng callgraph.dot -o callgraph.png

# 例: 関数呼び出しの要約をテキスト形式で出力
deno run -A cli.ts path/to/your/file.ts --summary-text -o function_summary.txt

# 例: 関数呼び出しの要約を DOT 形式で出力
deno run -A cli.ts path/to/your/file.ts --summary-dot -o function_summary.dot
```

### オプション

- `-o, --output <ファイルパス>`: 出力ファイルのパス
- `--summary-text`: 関数呼び出しの要約をテキスト形式で出力
- `--summary-dot`: 関数呼び出しの要約を DOT 形式で出力
- `--function-summary`: 関数実装の要約を DOT 形式で出力
- `--max-depth <数値>`: 解析する呼び出しの最大深さ
- `--max-width <数値>`: 各ノードからの最大呼び出し数
- `--verbose`: 詳細なログを出力

## 機能と仕様

### 検出できる要素

- **関数宣言と呼び出し**: 通常の関数宣言と呼び出しを検出
- **クラスとメソッド**: クラス定義、メソッド定義、メソッド呼び出しを検出
- **コンストラクタ**: コンストラクタの定義と呼び出しを検出
- **静的メソッド**: 静的メソッドの定義と呼び出しを検出
- **クラス継承**: クラスの継承関係を検出
- **インターフェース実装**: インターフェースの実装関係を検出

### インスタンスメソッド呼び出しの追跡

インスタンスメソッドの呼び出し（例:
`instance.method()`）を、クラスメソッドとして正しく追跡します。

```typescript
// 例
const instance = new MyClass();
instance.method(); // MyClass.method として追跡
```

継承されたメソッドの呼び出しも、親クラスのメソッドとして正しく追跡します。

```typescript
// 例
class Parent {
  method() {}
}
class Child extends Parent {}

const child = new Child();
child.method(); // Parent.method として追跡
```

### クラス継承関係の可視化

クラスの継承関係を DOT 形式で出力し、可視化します。

```dot
// 例
"DerivedClass" -> "BaseClass" [style=dashed, color=blue, label="extends"];
"ImplementingClass" -> "Interface" [style=dotted, color=green, label="implements"];
```

### レイアウト設定

DOT 形式の出力には、以下のレイアウト設定が含まれています：

```dot
// レイアウト設定
rankdir=LR;       // 左から右へのレイアウト
concentrate=true; // エッジの集約
splines=ortho;    // 直角の線でエッジを描画
nodesep=0.5;      // 同じランク内のノード間の距離
ranksep=1.0;      // ランク間の距離
overlap=false;    // ノードの重なりを避ける
```

## 出力形式

### DOT 形式

Graphviz の DOT 形式でコールグラフを出力します。以下の要素が含まれます：

- **ノード**: 関数、メソッド、コンストラクタなど
- **エッジ**: 呼び出し関係
- **サブグラフ**: ファイルやクラスごとのグループ化
- **色分け**: ノードの種類に応じた色分け
- **ラベル**: 関数名、型情報、行番号など

### テキスト形式

関数呼び出しの要約をテキスト形式で出力します。以下の情報が含まれます：

- 関数名と型情報
- 呼び出している関数のリスト
- クラスメソッドの場合はクラス名と静的かどうかの情報
- 継承関係の情報

## 今後の改善点

1. インターフェースノードの自動追加
2. splines オプションを "polyline" に変更して、エッジラベルの問題を解決
3. クラスメソッドとインスタンスメソッドの呼び出しを視覚的に区別
4. 複数ファイルの解析の改善
5. 型情報の詳細な表示
6. 循環参照の検出と可視化
7. エクスポート情報の詳細な表示

## TODO

以下の機能拡張とテストを順次実装予定です：

### 継承ツリーの追跡テスト

1. 複雑な継承関係を持つクラス階層のテストケースを追加
   ```typescript
   // 例: 多段階の継承関係
   class GrandParent {}
   class Parent extends GrandParent {}
   class Child extends Parent {}
   class GrandChild extends Child {}
   ```

2. インターフェースの多重実装のテストケースを追加
   ```typescript
   // 例: 複数インターフェースの実装
   interface A {}
   interface B {}
   class C implements A, B {}
   ```

3. ミックスインパターンのテストケースを追加
   ```typescript
   // 例: ミックスインパターン
   type Constructor<T = {}> = new (...args: any[]) => T;
   function Timestamped<TBase extends Constructor>(Base: TBase) {
     return class extends Base {
       timestamp = Date.now();
     };
   }
   ```

### スナップショットテストの追加

1. 代表的なコードパターンに対するDOT出力のスナップショットテストを追加
   ```typescript
   // test/snapshots.test.ts
   import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
   import { generateCallGraph } from "../callgraph.ts";

   Deno.test("class inheritance snapshot", async () => {
     const program = createProgram("__fixtures/class-inheritance.ts");
     const callGraph = generateCallGraph(program);
     const dot = callGraph.toDot();

     // スナップショットと比較
     const expected = await Deno.readTextFile(
       "__snapshots__/class-inheritance.dot",
     );
     assertEquals(dot, expected);
   });
   ```

2. 異なる出力形式（テキスト、関数サマリーなど）のスナップショットテストを追加

3. エッジケース（空ファイル、巨大ファイルなど）のスナップショットテストを追加

### 深いコールグラフのテスト

1. 再帰呼び出しを含む深いコールグラフのテストケースを追加
   ```typescript
   // 例: 再帰関数
   function factorial(n: number): number {
     if (n <= 1) return 1;
     return n * factorial(n - 1);
   }
   ```

2. 相互再帰を含むコールグラフのテストケースを追加
   ```typescript
   // 例: 相互再帰
   function isEven(n: number): boolean {
     if (n === 0) return true;
     return isOdd(n - 1);
   }

   function isOdd(n: number): boolean {
     if (n === 0) return false;
     return isEven(n - 1);
   }
   ```

3. 深さ制限のテスト
   ```typescript
   // 深さ制限のテスト
   const callGraph = generateCallGraph(program, 3); // 最大深さ3
   ```

4. 幅制限のテスト
   ```typescript
   // 幅制限のテスト
   callGraph.pruneByWidth(5); // 各ノードからの最大呼び出し数5
   ```
