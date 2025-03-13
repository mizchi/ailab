# @std/testing チートシート

## 概要

Deno標準ライブラリのテストツールキット。Deno、Node.js、Cloudflare
Workersなどで使用可能。

```ts
// Deno
import { ... } from "@std/testing/...";

// npm
// npm install @std/testing
import { ... } from "@std/testing/...";
```

## モジュール一覧

- `@std/testing/bdd` - BDDスタイルのテスト
- `@std/expect` - Jest互換のアサーション
- `@std/testing/mock` - モックとスパイ
- `@std/testing/snapshot` - スナップショットテスト
- `@std/testing/time` - 時間操作

## @std/testing/bdd

テストをグループ化し、セットアップ/ティアダウンフックを追加するBDDスタイルのインターフェース。

```ts
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "@std/testing/bdd";
import { expect } from "@std/expect";

describe("テストスイート", () => {
  beforeAll(() => {/* 全テスト前に1回実行 */});
  afterAll(() => {/* 全テスト後に1回実行 */});
  beforeEach(() => {/* 各テスト前に実行 */});
  afterEach(() => {/* 各テスト後に実行 */});

  it("テストケース", () => {
    expect(2 + 2).toBe(4);
  });

  it.only("このテストのみ実行", () => {/* フォーカステスト */});
  it.ignore("このテストはスキップ", () => {/* スキップテスト */});
  // it.skip()も同様
});

// ネストされたテストも可能
describe("親スイート", () => {
  describe("子スイート", () => {
    it("テスト", () => {/* ... */});
  });
});
```

## @std/expect

Jest互換のアサーションライブラリ。直感的なチェーン可能なAPI。

```ts
import { expect } from "@std/expect";

// 基本的な使用法
expect(value).toBe(otherValue); // 厳密等価 (Object.is)
expect(value).toEqual(otherValue); // 再帰的比較
expect(value).not.toBe(otherValue); // 否定
await expect(Promise.resolve(42)).resolves.toBe(42); // Promise
```

### 主要なマッチャー

| 分類             | マッチャー                   | 説明                   |
| ---------------- | ---------------------------- | ---------------------- |
| **基本比較**     | `toBe(value)`                | 厳密等価 (Object.is)   |
|                  | `toEqual(value)`             | 再帰的な値の比較       |
|                  | `toStrictEqual(value)`       | より厳密な比較         |
| **型チェック**   | `toBeDefined()`              | 未定義でないか         |
|                  | `toBeUndefined()`            | 未定義か               |
|                  | `toBeNull()`                 | nullか                 |
|                  | `toBeNaN()`                  | NaNか                  |
|                  | `toBeInstanceOf(Class)`      | インスタンスか         |
| **真偽値**       | `toBeTruthy()`               | 真値か                 |
|                  | `toBeFalsy()`                | 偽値か                 |
| **数値比較**     | `toBeGreaterThan(n)`         | n より大きいか         |
|                  | `toBeGreaterThanOrEqual(n)`  | n 以上か               |
|                  | `toBeLessThan(n)`            | n より小さいか         |
|                  | `toBeLessThanOrEqual(n)`     | n 以下か               |
|                  | `toBeCloseTo(n, digits)`     | 小数点以下の近似値か   |
| **コレクション** | `toContain(item)`            | 項目を含むか           |
|                  | `toContainEqual(item)`       | 等価な項目を含むか     |
|                  | `toHaveLength(n)`            | 長さが n か            |
| **オブジェクト** | `toHaveProperty(key, value)` | プロパティを持つか     |
|                  | `toMatchObject(obj)`         | 部分的に一致するか     |
| **文字列**       | `toMatch(regexp)`            | 正規表現にマッチするか |
| **例外**         | `toThrow(error)`             | 例外をスローするか     |

### 非対称マッチャー

```ts
expect([1, 2, 3]).toEqual(expect.arrayContaining([1, 2]));
expect({ a: 1, b: 2 }).toEqual(expect.objectContaining({ a: 1 }));
expect("hello world").toEqual(expect.stringContaining("hello"));
expect("hello world").toEqual(expect.stringMatching(/^hello/));
expect(123).toEqual(expect.any(Number));
expect("anything").toEqual(expect.anything());
```

## @std/testing/mock

関数の呼び出しを監視・制御するためのモックとスパイ機能。

```ts
import { assertSpyCall, assertSpyCalls, spy, stub } from "@std/testing/mock";

// スパイ - 関数呼び出しを監視
function add(a: number, b: number) {
  return a + b;
}
const addSpy = spy(add);
addSpy(2, 3);

assertSpyCalls(addSpy, 1); // 呼び出し回数を検証
assertSpyCall(addSpy, 0, { // 特定の呼び出しを検証
  args: [2, 3],
  returned: 5,
});

// スタブ - オブジェクトのメソッドを置き換え
const obj = {
  method() {
    return "original";
  },
};
const methodStub = stub(obj, "method"); // デフォルトはundefined返却
obj.method(); // undefined

// カスタム実装を持つスタブ
const customStub = stub(obj, "method", () => "stubbed");
obj.method(); // "stubbed"

// 後片付け
methodStub.restore(); // オリジナルメソッドを復元
```

## @std/testing/snapshot

値のスナップショットを作成し、将来のテスト実行と比較。

```ts
import { assertSnapshot } from "@std/testing/snapshot";

Deno.test("スナップショットテスト", async (t) => {
  const data = { hello: "world", number: 42 };
  await assertSnapshot(t, data);
});

// スナップショットの更新
// deno test --allow-all -- --update
```

## @std/testing/time

`Date`、`setTimeout`、`setInterval`などの時間関連の関数をモック。

```ts
import { FakeTime } from "@std/testing/time";

Deno.test("タイマーテスト", () => {
  using time = new FakeTime(); // .dispose()自動呼び出し

  let count = 0;
  const id = setInterval(() => count++, 1000);

  time.tick(500); // 500ms進める
  expect(count).toBe(0);

  time.tick(500); // さらに500ms進める
  expect(count).toBe(1);

  time.tick(2000); // さらに2000ms進める
  expect(count).toBe(3);

  clearInterval(id);
});

// 主要なメソッド
// time.tick(ms)          - 時間を進める
// time.tickAsync(ms)     - 非同期で時間を進める
// time.next()            - 次のタイマーまで進める
// time.nextAsync()       - 非同期で次のタイマーまで進める
// time.runAll()          - すべてのタイマーを実行
// time.runAllAsync()     - 非同期ですべてのタイマーを実行
// time.runMicrotasks()   - マイクロタスクを実行
```

## 標準的なテスト構造

```ts
import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";

describe("ユーザー機能", () => {
  let user;

  beforeEach(() => {
    user = { name: "TestUser", role: "admin" };
  });

  it("管理者権限を持つこと", () => {
    expect(user.role).toBe("admin");
    expect(user).toHaveProperty("name");
    expect(user.name).toEqual(expect.any(String));
  });
});
```

## 関連リンク

- [JSR @std/testing](https://jsr.io/@std/testing)
- [JSR @std/expect](https://jsr.io/@std/expect)
- [Deno公式テストドキュメント](https://docs.deno.com/runtime/fundamentals/testing/)
