## Deno の使い方について

### npm 互換モード

私は Deno の Node 互換API を使います。

```ts
import path from "node:path";
import {z} from `npm:zod`;
```

モジュール下では、 deno.jsonc でを宣言して使います。

`deno add npm:zod`

```json
  "imports": {
    "zod": "npm:zod@^3.24.2"
  }
```

```ts
import {zod} from "zod";
```

## Example: Directory rules

```
<module-name>/
  # interface
  mod.ts
  deno.jsonc

  # impl with unit tests
  internal/
    *.ts
    *.test.ts

  # integration tests for mod.ts
  test/*.ts

  # exmaple usages
  examples/*.ts
```

1 ファイルは 500 行以内を目安にする。

モジュールをテストする時は、 `deno test -A modules/<name>/*.test.ts` で実行する。

## Example: mod.ts

```ts
/**
 * @module module description 
 */

/**
 * Define types
 */
export type Point = {};

// reexport ./internal
export { distance } from "./interal/distance.ts";
```

そのモジュールから提供する型を、 mod.ts で定義する。

`mod.ts` で再 export するシンボルは、少ないほどいい。

## Example: internal/*.ts

```ts
// mod.ts から型を import する。
import type { Point } from "../mod.ts";
export function distance(p1: Point, p2: Point) {
  return Math.sqrt(
    (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2
  );
}
```

## Example: deno.jsonc

```jsonc
{
  "name": "@i/foo",
  "exports": {
    ".": "./mod.ts"
  },
  "lint": {
    "exclude": ["**/**/wip*.ts"],
    "rules": {
      "tags": ["recommended"],
      "include": ["no-unused-vars"]
    }
  },
  "tasks": {
    "unit": "deno test -A --parallel --doc",
    "cov": "rm -r ./coverage && deno test -A --parallel --coverage --doc && deno coverage ./coverage",
    "unused": "deno run -R --allow-env npm:tsr mod.ts examples/*.ts 'test/.*\\.test\\.ts$'",
    "health": "deno check && deno lint && deno task cov && deno task unused"
  }
}
```

`examples` `mod.ts` `test/*` は外に対してのユースケースとなるが、それ以外は

### テストが落ちた時

次の手順を踏む。

機能追加の場合

1. 機能追加の場合、まず `deno test -A modules/<name>`
   で全体のテストが通過しているかを確認する
2. 修正後、対象のスクリプト or モジュールをテストする

修正の場合

1. `deno test -A modules/<name>/**.test.ts` でモジュールのテストを実行する
2. 落ちたモジュールのテストを確認し、実装を参照する。

- テストは一つずつ実行する `deno test -A modules/<name>/foo.test.ts`

3. 落ちた理由をステップバイステップで考える(闇雲に修正しない!)
4. 実装を修正する。必要な場合、実行時の過程を確認するためのプリントデバッグを挿入する。
5. モジュールのテスト実行結果を確認

- 修正出来た場合、プリントデバッグを削除する
- 集できない場合、3 に戻る。

5. モジュール以外の全体テストを確認

テストが落ちた場合、落ちたテストを修正するまで次のモジュールに進まない。


モジュールモードではスクリプトモードと違って、ライブラリの参照に `jsr:` や
`npm:` を推奨しない。モジュールを参照する場合、 `deno add jsr:@david/dax@0.42.0`
のようにして、 `deno.json` に依存を追加する。

```ts
// OK
import $ from "@david/dax";

// NG
import $ from "jsr:@david/dax@0.42.0";
```


### 外部ライブラリの使用方法

deno 用のライブラリは多くないので、ユーザーから指定されない限りは node
互換APIを優先します。

例外的に、以下のURLは node より Deno 互換を優先して使用します。

- `jsr:@david/dax`: コマンドランナー
- `jsr:@std/expect`: アサーション
- `jsr:@std/testing`: テストフレームワーク

コードを書き始めるにあたって `docs/libraries/*`
の下に該当するドキュメントがある場合、ライブラリを使用する前に、これを読み込みます。

docs/librarise にドキュメントが存在しないとき

- `jsr:` の場合、 `deno doc jsr:@scope/pkgName`
  で、ライブラリ基本的なAPIをを確認します。
- `npm:` の場合、`npm-summary pkgName`
  でライブラリの要約を確認することができます。

ライブラリを追加するとき、 deno.json にすでに import
されていないか確認します。存在しない場合、 `deno add ...` で追加してください

### ソースコード内のモジュールの参照方法

自分のディレクトリ以外のソースコードを確認する時は、 `deno doc ../foo/mod.ts`
のように型定義だけを確認する。

### テストの書き方

`@std/expect` と `@std/testing/bdd` を使う。 とくに実装上の理由がない限り、
`describe` による入れ子はしない。

```ts
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("2+3=5", () => {
  expect(add(2, 3), "sum of numbers").toBe(5);
});
```

アサーションの書き方

- `expect(result, "<expected behavior>").toBe("result")`
  で可能な限り期待する動作を書く

### モジュール間の依存関係

### import ルール

- モジュール間の参照は必ず mod.ts を経由する
- 他のモジュールのファイルを直接参照してはいけない
- 同一モジュール内のファイルは相対パスで参照する
- モジュール内の実装は deps.ts からの re-export を参照する

### 依存関係の検証

依存関係の検証には2つの方法がある

1. コマンドラインでの検証

```bash
deno task check:deps
```

このコマンドは以下をチェックする

- モジュール間の import が mod.ts を経由しているか
- 他のモジュールのファイルを直接参照していないか

2. リントプラグインによる検証

```bash
deno lint
```

mod-import リントルールが以下をチェックする：

- モジュール間の import が mod.ts を経由しているか
- 違反している場合、修正のヒントを提示

リントプラグインは IDE
と統合することで、コーディング時にリアルタイムでフィードバックを得ることができる。

### コード品質の監視

### カバレッジ

カバレッジの取得には `deno task test:cov`
を使用する。これは以下のコマンドのエイリアス：

```bash
deno test --coverage=coverage && deno coverage coverage
```

実行コードと純粋な関数を分離することで、高いカバレッジを維持する：

- 実装（lib.ts）: ロジックを純粋な関数として実装
- エクスポート（mod.ts）: 外部向けインターフェースの定義
- 実行（cli.ts）: エントリーポイントとデバッグコード

### デッドコード解析

- TSR (TypeScript Runtime) を使用してデッドコードを検出
- 未使用のエクスポートや関数を定期的に確認し削除

### 型定義による仕様抽出

- dts を使用して型定義から自動的にドキュメントを生成
- 型シグネチャに仕様を記述し、dts として抽出する
