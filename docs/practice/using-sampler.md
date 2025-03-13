# Using Sampler パターン

このドキュメントでは、`using` 構文と `Symbol.dispose`
を活用したサンプラーパターンについて説明します。このパターンは、大量のデータから一部をサンプリングし、スコープ終了時に自動的に結果を表示するのに役立ちます。

## 基本概念

### Symbol.dispose と using 構文

ECMAScript の `Symbol.dispose`
は、リソースの自動クリーンアップを可能にする特殊なシンボルです。`using`
構文と組み合わせることで、スコープを抜けるときに自動的に特定の処理を実行できます。

```typescript
{
  using resource = createResource();
  // resource を使った処理
  // スコープを抜けると自動的に resource[Symbol.dispose]() が呼ばれる
}
```

### サンプラーパターン

サンプラーパターンは、大量のデータから代表的なサンプルを抽出するためのパターンです。特に以下のような場合に有用です：

- ログ出力が多すぎる場合に代表的なサンプルだけを表示したい
- 大量のデータから統計的に意味のあるサンプルを抽出したい
- デバッグ時に特定の条件に合致するデータだけを表示したい

## シンプルなサンプラーの実装

以下は、最小限の機能を持つサンプラーの実装例です：

```typescript
/**
 * シンプルなサンプラーのインターフェース
 */
interface SimpleSampler<T> {
  /** アイテムを追加する */
  add(item: T): void;
  /** 現在のサンプルを取得する */
  samples(): T[];
  /** Symbol.disposeメソッド */
  [Symbol.dispose](): void;
}

/**
 * シンプルなサンプラーを作成する
 * @param n 保持する最大アイテム数
 * @param displayFn 表示用関数（省略時はconsole.log）
 */
function createSimpleSampler<T>(
  n: number,
  displayFn: (items: T[]) => void = (items) => {
    console.log(`Sampled ${items.length} items:`);
    for (const [i, item] of items.entries()) {
      console.log(`- [${i}] ${String(item)}`);
    }
  },
): SimpleSampler<T> {
  const samples: T[] = [];
  let count = 0;

  return {
    add(item: T): void {
      count++;

      if (samples.length < n) {
        // nに達するまでは全て追加
        samples.push(item);
      } else {
        // リザバーサンプリング法
        // 確率 n/count で既存のサンプルを置き換える
        const r = Math.floor(Math.random() * count);
        if (r < n) {
          samples[r] = item;
        }
      }
    },

    samples(): T[] {
      return [...samples];
    },

    [Symbol.dispose](): void {
      // スコープ終了時に結果を表示
      displayFn(samples);
    },
  };
}
```

この実装は[リザバーサンプリング法](https://en.wikipedia.org/wiki/Reservoir_sampling)を使用しており、データストリームから均等な確率で`n`個のサンプルを選択します。

## 使用例

### 基本的な使用方法

```typescript
{
  // 最大5つのアイテムをサンプリングするサンプラーを作成
  using sampler = createSimpleSampler<number>(5);

  // 大量のデータを処理
  for (let i = 0; i < 1000; i++) {
    sampler.add(i);
  }

  // スコープを抜けると自動的に結果が表示される
}
// 出力例:
// Sampled 5 items:
// - [0] 42
// - [1] 137
// - [2] 501
// - [3] 723
// - [4] 982
```

### カスタム表示関数を使用

```typescript
{
  // カスタム表示関数を持つサンプラー
  using sampler = createSimpleSampler<string>(
    3,
    (items) => {
      console.log(`選択された ${items.length} 件のサンプル:`);
      for (const item of items) {
        console.log(`- ${item}`);
      }
    },
  );

  // データを追加
  const words = [
    "apple",
    "banana",
    "cherry",
    "date",
    "elderberry",
    "fig",
    "grape",
  ];
  for (const word of words) {
    sampler.add(word);
  }

  // スコープ終了時にカスタム形式で表示
}
// 出力例:
// 選択された 3 件のサンプル:
// - banana
// - elderberry
// - grape
```

### 複雑なデータ構造のサンプリング

```typescript
interface User {
  id: number;
  name: string;
  role: string;
}

{
  using sampler = createSimpleSampler<User>(
    3,
    (users) => {
      console.log(`サンプリングされたユーザー (${users.length}件):`);
      for (const user of users) {
        console.log(`- ID: ${user.id}, 名前: ${user.name}, 役割: ${user.role}`);
      }
    },
  );

  // ユーザーデータを処理
  const users: User[] = [
    { id: 1, name: "Alice", role: "Admin" },
    { id: 2, name: "Bob", role: "User" },
    { id: 3, name: "Charlie", role: "User" },
    { id: 4, name: "Dave", role: "Moderator" },
    { id: 5, name: "Eve", role: "User" },
  ];

  for (const user of users) {
    sampler.add(user);
  }
}
```

## 応用例: 条件付きサンプリング

特定の条件に合致するアイテムだけをサンプリングしたい場合は、`add`メソッドを呼び出す前にフィルタリングを行うことができます：

```typescript
{
  using sampler = createSimpleSampler<number>(5);

  for (let i = 0; i < 1000; i++) {
    // 偶数のみをサンプリング
    if (i % 2 === 0) {
      sampler.add(i);
    }
  }
}
```

## まとめ

`using` 構文と `Symbol.dispose`
を組み合わせたサンプラーパターンは、以下のような利点があります：

1. **自動クリーンアップ**:
   スコープを抜けると自動的に結果が表示されるため、表示処理の呼び出し忘れがない
2. **コードの簡潔さ**:
   明示的なクリーンアップコードが不要になり、コードがすっきりする
3. **デバッグの容易さ**:
   大量のデータから代表的なサンプルだけを表示することで、デバッグが容易になる

このパターンは特に、ログ出力やデバッグ、パフォーマンス測定などのシナリオで役立ちます。
