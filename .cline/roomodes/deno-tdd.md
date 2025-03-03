---
name: Deno:TDD
groups:
  - read
  - edit
  - browser
  - command
  - mcp
source: "project"
---

# TDDモード

TDDモードでは、TDDの思想に基づき、ステップバイステップでテストの追加、テストの修正、リファクターを順次行います。

ファイル冒頭に `@tdd` を含む場合、それはテストファーストモードです。

### 考え方: テストは仕様である

テストは仕様を表すと考えます。そのモジュールのREADME.mdとテスト一覧から、仕様を推測してください。

```
$ deno test -A <module> --report=pretty
```

### テストの実装順序

テストコードは以下の順序で実装する：

1. 期待する結果（アサーション）を最初に書く
2. アサーションの妥当性をユーザーに確認
3. 確認が取れたら、操作（Act）のコードを書く
4. 最後に、準備（Arrange）のコードを書く

これは実行順序（Arrange → Act →
Assert）とは異なる。実装を結果から始めることで、目的を明確にしてから実装を進められる。

実装例：

```ts
// @script @tdd
import { err, ok, Result } from "npm:neverthrow";

// 型定義
export interface User {
  id: string;
  name: string;
}

export type ApiError =
  | { type: "unauthorized"; message: string }
  | { type: "network"; message: string };

// インターフェース定義
declare function getUser(
  token: string,
  id: string,
): Promise<Result<User, ApiError>>;

import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("有効なトークンの場合にユーザー情報を取得すると成功すること", async () => {
  // 1. まず期待する結果を書く
  const expectedUser: User = {
    id: "1",
    name: "Test User",
  };

  // 2. ここでユーザーに結果の妥当性を確認

  // 3. 次に操作を書く
  const result = await getUser("valid-token", "1");

  // 4. 最後に準備を書く（この例では不要）

  // アサーション
  expect(result.isOk()).toBe(true);
  result.map((user) => {
    expect(user).toEqual(expectedUser);
  });
});

test("無効なトークンの場合にユーザー情報を取得するとエラーになること", async () => {
  // 1. まず期待する結果を書く
  const expectedError: ApiError = {
    type: "unauthorized",
    message: "Invalid token",
  };

  // 2. ユーザーに結果の妥当性を確認

  // 3. 次に操作を書く
  const result = await getUser("invalid-token", "1");

  // アサーション
  expect(result.isErr()).toBe(true);
  result.mapErr((error) => {
    expect(error).toEqual(expectedError);
  });
});
```

### テストとアサーションの命名規約

テスト名は以下の形式で記述する：

```
「{状況}の場合に{操作}をすると{結果}になること」
```

例：

- 「有効なトークンの場合にユーザー情報を取得すると成功すること」
- 「無効なトークンの場合にユーザー情報を取得するとエラーになること」

### 開発手順の詳細

1. 型シグネチャの定義
   ```ts
   declare function getUser(
     token: string,
     id: string,
   ): Promise<Result<User, ApiError>>;
   ```

   ライブラリの時は export をつける

2. テストケースごとに：

   a. 期待する結果を定義
   ```ts
   const expectedUser: User = {
     id: "1",
     name: "Test User",
   };
   ```

   b. **ユーザーと結果の確認**
   - この時点で期待する結果が適切か確認
   - 仕様の見直しや追加が必要な場合は、ここで修正

   c. 操作コードの実装
   ```ts
   const result = await getUser("valid-token", "1");
   ```

   d. 必要な準備コードの実装
   ```ts
   // 必要な場合のみ
   const mockApi = new MockApi();
   mockApi.setup();
   ```

TDDモードは他のモードと両立する。

## Deno における TDD の例

この例では、Deno におけるテスト駆動開発 (TDD) のプロセスを示します。

### ディレクトリ構成

```
tdd-example/
  mod.ts    - 公開インターフェース (再エクスポートのみ)
  lib.ts    - 実装 (deps.ts からのインポートを使用)
  mod.test.ts - テストコード
```

### 実際にTDDを行う手順 (Steps)

1. **テストを書く**: コードの期待される動作を定義するテストケースを
   `mod.test.ts` に記述します。
2. **テストの失敗を確認する**:
   実装がないため、テストが失敗することを確認します。
3. **コードを実装する**: テストケースを満たすコードを `lib.ts` に実装します。
4. **テストの成功を確認する**: テストが成功することを確認します。

### 落ちるテストを追加するときの手順

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

### リファクターフェーズ

テストが取ったあと、ユーザーにリファクタを提案してください。

- `deno check <target>`
- `deno lint <target>`

#### コードカバレッジの測定と確認

テストが通った段階で、コードカバレッジを測定して、テストがコードの全ての部分をカバーしているか確認することを推奨します。

1. カバレッジデータの収集：
   ```bash
   deno test --coverage=coverage <テストファイル>
   ```
   - カバレッジデータは指定したディレクトリ（この例では「coverage」）に保存されます

2. カバレッジレポートの生成と確認：
   ```bash
   deno coverage coverage
   ```
   - 基本的なカバレッジレポート（ファイルごとのブランチカバレッジとラインカバレッジ）が表示されます

3. より詳細なレポートの確認：
   ```bash
   deno coverage --detailed coverage
   ```
   - ファイルごとの詳細なカバレッジ情報が表示されます

4. HTML形式のレポート生成（オプション）：
   ```bash
   deno coverage --html --output=coverage_html coverage
   ```
   - ブラウザで閲覧可能なHTMLレポートが生成されます

カバレッジが100%でない場合は、テストケースを追加してカバレッジを向上させることを検討してください。

#### デッドコード削除のためのTSRの活用

テストが通った段階で、TSR（TypeScript
Remove）を使ってデッドコード（未使用コード）を検出することも推奨します。

1. まずデッドコードの検出：
   ```bash
   deno run -A npm:tsr 'mod\.ts$'
   ```

2. 検出結果を確認：
   - 未使用のエクスポートやファイルが表示されます
   - 注意：テストファイルはエントリーポイントから参照されないため、デッドコードとして検出されます

3. ユーザーに削除するか確認：
   - 「TSRが以下のデッドコードを検出しました。削除しますか？」
   - ユーザーが同意した場合のみ、以下のコマンドを実行：
     ```bash
     deno run -A npm:tsr --write 'mod\.ts$'
     ```
   - テストファイルを除外したい場合：
     ```bash
     deno run -A npm:tsr --write 'mod\.ts$' '.*\.test\.ts$'
     ```

デッドコードを削除することで、コードベースがクリーンに保たれ、将来のメンテナンスが容易になります。

#### Gitワークフローの活用

TDDプロセスでは、各フェーズでの変更を適切にバージョン管理することが重要です。以下のGitワークフローを推奨します：

1. **コミット状況の確認**:
   ```bash
   git status
   ```
   - 作業開始前や各ステップの移行前に、現在の変更状態を確認します

2. **テスト修正後のコミット**:
   - テストを追加・修正した後、ユーザーにコミットするか確認します
   - 「テストを修正しました。これをコミットしますか？」
   - ユーザーが同意した場合、コミットメッセージを考えて実行します：
     ```bash
     git add <変更ファイル>
     git commit -m "test: 〇〇の機能のテストを追加"
     ```

3. **実装後のコミット**:
   - テストが通るように実装した後、ユーザーにコミットするか確認します
   - 「実装が完了しました。これをコミットしますか？」
   - ユーザーが同意した場合：
     ```bash
     git add <変更ファイル>
     git commit -m "feat: 〇〇の機能を実装"
     ```

4. **リファクタリング後のコミット**:
   - リファクタリングを行った後、ユーザーにコミットするか確認します
   - 「リファクタリングが完了しました。これをコミットしますか？」
   - ユーザーが同意した場合：
     ```bash
     git add <変更ファイル>
     git commit -m "refactor: 〇〇の実装をリファクタリング"
     ```

5. **コミットメッセージの作成**:
   - 変更ログを分析し、適切なコミットメッセージを考えます
   - プレフィックスを使い分けて意図を明確にします：
     - `test:` - テストの追加・修正
     - `feat:` - 新機能の実装
     - `fix:` - バグ修正
     - `refactor:` - コードのリファクタリング
     - `docs:` - ドキュメントの更新
     - `chore:` - ビルドプロセスやツールの変更

このように各ステップでGitコミットを行うことで、TDDのサイクルが明確に記録され、後から変更履歴を追跡しやすくなります。

### TypeFirst モード

型を一緒に考えようと言われたときは、TypeFirst モードです。

実装の型シグネチャとテストコードを先に書きます。型チェックのみ行い、型チェックがパスしたら、ユーザーにその型シグネチャを提案します。

型シグネチャの確認が取れたら、その使い方をテストコードとして記述します。この型シグネチャで仕様を書いたらどうなる？と聞かれたときも、テストコードを書きます。

仕様を合意したら、実装に移ります。
