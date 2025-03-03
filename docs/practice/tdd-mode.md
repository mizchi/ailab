# テストファーストモードの実装プロセス

エラトステネスの篩による素数判定の実装を例に、テストファーストモードの実装プロセスを説明する。

## 開発の流れ

### 1. 初期プロンプト

```
スクリプトモード+テストファーストモードで、エラトステネスの篩による素数判定を実装したい
```

### 2. 型定義とテストの作成

最初に型定義とテストケースのみを含むファイルを作成する：

```ts
/* @script @tdd */
/**
 * エラトステネスの篩による素数判定を行うモジュール
 */

// 型定義
/**
 * 与えられた数値以下の素数を全て求める
 * @param n 2以上の整数
 * @returns n以下の素数の配列。nが2未満の場合は空配列
 * @throws {Error} nが整数でない場合
 */
declare function sieveOfEratosthenes(n: number): number[];

/**
 * 与えられた数値が素数かどうかを判定する
 * @param n 判定する数値
 * @returns 素数ならtrue、そうでなければfalse。2未満の数値は常にfalse
 * @throws {Error} nが整数でない場合
 */
declare function isPrime(n: number): boolean;

// テスト
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("sieveOfEratosthenes handles edge cases", () => {
  expect(sieveOfEratosthenes(-1), "negative number returns empty array")
    .toEqual([]);
  expect(sieveOfEratosthenes(0), "zero returns empty array").toEqual([]);
  expect(sieveOfEratosthenes(1), "one returns empty array").toEqual([]);
  expect(sieveOfEratosthenes(2), "two returns [2]").toEqual([2]);
});

test("sieveOfEratosthenes(10) returns first primes", () => {
  expect(sieveOfEratosthenes(10), "primes up to 10").toEqual([2, 3, 5, 7]);
});
```

この段階で:

- `@script @tdd` でモードを指定
- 関数の型定義と仕様をJSDocで記述
- 基本的なテストケースを作成

### 3. テストケースの拡充

フィードバックを受けて、テストケースを拡充：

```ts
// エッジケースのテスト
test("sieveOfEratosthenes throws on non-integer input", () => {
  expect(() => sieveOfEratosthenes(3.5)).toThrow();
});

// より大きな数値のテスト
test("sieveOfEratosthenes returns more primes for larger numbers", () => {
  const primes50 = sieveOfEratosthenes(50);
  const primes100 = sieveOfEratosthenes(100);
  expect(primes100.length > primes50.length, "more primes in larger range")
    .toBe(true);
});

// 境界値のテスト
test("isPrime handles numbers around prime numbers", () => {
  expect(isPrime(16), "16 is not prime").toBe(false);
  expect(isPrime(17), "17 is prime").toBe(true);
  expect(isPrime(18), "18 is not prime").toBe(false);
});

// パフォーマンステスト
test("Performance test for large numbers", () => {
  const start = performance.now();
  const primes = sieveOfEratosthenes(1000);
  const end = performance.now();
  expect(end - start, "execution time").toBeLessThan(1000);
});
```

### 4. 実装

テストケースを満たす実装を作成：

```ts
function sieveOfEratosthenes(n: number): number[] {
  // 入力値のバリデーション
  if (!isInteger(n)) {
    throw new Error("Input must be an integer");
  }

  // 2未満の場合は空配列を返す
  if (n < 2) {
    return [];
  }

  // 篩い落とし用の配列を初期化（true: 素数の候補）
  const sieve = new Array(n + 1).fill(true);
  sieve[0] = sieve[1] = false;

  // エラトステネスの篩
  for (let i = 2; i * i <= n; i++) {
    if (sieve[i]) {
      // iが素数なら、その倍数を全て篩い落とす
      for (let j = i * i; j <= n; j += i) {
        sieve[j] = false;
      }
    }
  }

  // 素数の配列を作成
  const primes: number[] = [];
  for (let i = 2; i <= n; i++) {
    if (sieve[i]) {
      primes.push(i);
    }
  }

  return primes;
}

function isPrime(n: number): boolean {
  // 入力値のバリデーション
  if (!isInteger(n)) {
    throw new Error("Input must be an integer");
  }

  // 2未満の数は素数ではない
  if (n < 2) {
    return false;
  }

  // 2は素数
  if (n === 2) {
    return true;
  }

  // 2より大きい偶数は素数ではない
  if (n % 2 === 0) {
    return false;
  }

  // 3以上の奇数について、nの平方根までの奇数での割り算を試す
  const sqrt = Math.sqrt(n);
  for (let i = 3; i <= sqrt; i += 2) {
    if (n % i === 0) {
      return false;
    }
  }

  return true;
}
```

### 5. 実行と確認

```bash
# テストの実行
$ deno test scripts/prime.ts
running 11 tests from ./scripts/prime.ts
...
ok | 11 passed | 0 failed (5ms)

# 実行
$ deno run scripts/prime.ts
Primes up to 20: [2, 3, 5, 7, 11, 13, 17, 19]
Is 17 prime? true
Running performance test...
Found primes up to 1000 in 0.043ms
```

## テストファーストモードの特徴

1. **段階的な開発**
   - 型定義 → テスト → 実装の順で開発
   - 各段階でフィードバックを得て改善

2. **テストケースの充実**
   - エッジケース
   - 基本機能
   - パフォーマンス要件
   - 境界値

3. **型安全性の確保**
   - 実装前に型定義を確定
   - JSDocによる仕様の明確化

4. **実装の最適化**
   - テストに基づく実装
   - パフォーマンスの考慮
   - リファクタリングの容易さ

## ベストプラクティス

1. **ファイル構造**
   - `@script @tdd` でモードを明示
   - 型定義、テスト、実装の明確な分離

2. **型定義**
   - 具体的な型を使用
   - JSDocによる詳細な仕様記述
   - エラー条件の明確化

3. **テストケース**
   - 基本機能のテスト
   - エッジケースの網羅
   - パフォーマンス要件の検証

4. **実装**
   - テストケースに基づく実装
   - 最適化とリファクタリング
   - エラー処理の実装
