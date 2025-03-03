# Deno における TDD の例

この例では、Deno におけるテスト駆動開発 (TDD) のプロセスを示します。

## ディレクトリ構成

```
tdd-example/
  mod.ts    - 公開インターフェース (再エクスポートのみ)
  lib.ts    - 実装 (deps.ts からのインポートを使用)
  mod.test.ts - テストコード
```

## TDD の手順 (Steps)

1. **テストを書く**: コードの期待される動作を定義するテストケースを
   `mod.test.ts` に記述します。
2. **テストの失敗を確認する**:
   実装がないため、テストが失敗することを確認します。
3. **コードを実装する**: テストケースを満たすコードを `lib.ts` に実装します。
4. **テストの成功を確認する**: テストが成功することを確認します。

## 落ちるテストを追加するときの手順

1. **テストが通ることを確認**: `deno test -A . --reporter=dot`
   でテストを実行し、すべてのテストが通ることを確認します。
2. **落ちるテストを追加**: 新しいテストケースを `mod.test.ts`
   に追加します。このテストは、まだ実装がないため失敗するはずです。
3. **テストが落ちることを確認**: `deno test -A tdd-example --reporter=dot`
   でテストを実行し、追加したテストが失敗することを確認します。
4. **落ちたテストだけを再実行**:
   `deno test -A tdd-example --reporter=dot --filter <テスト名>`
   で、落ちたテストだけを再実行します。`<テスト名>`
   は、失敗したテストの名前で置き換えてください。
5. **型を通す**: `lib.ts` に関数を定義し、`mod.ts` で re-export します。実装は
   `throw new Error("wip")` とします。
6. **実装**: `lib.ts` にテストが通る実装を記述します。

## 例

### 1. テストを書く (`tdd-example/mod.test.ts`)

```ts
import { add } from "./mod.ts";
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("add", () => {
  expect(add(1, 2), "数の合計").toBe(3);
});

test("sub", () => {
  expect(sub(5, 3), "数の差").toBe(2);
});
```

### 2. テストの失敗を確認する

`deno test -A tdd-example/mod.test.ts` を実行します。 `add` と `sub`
が定義されていないため、テストは `ReferenceError` で失敗するはずです。

### 3. コードを実装する (`tdd-example/lib.ts`)

```ts
/**
 * 2つの数値を足し合わせます。
 * @param a 最初の数値
 * @param b 2番目の数値
 * @returns a と b の合計
 */
export function add(a: number, b: number): number {
  return a + b;
}

export function sub(a: number, b: number): number {
  return a - b;
}
```

### 4. テストの成功を確認する

`deno test -A tdd-example/mod.test.ts`
を実行し、テストが成功することを確認します。
