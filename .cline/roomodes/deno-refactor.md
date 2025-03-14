---
name: Deno:RefactorModule
groups:
  - read
  - edit
  - browser
  - command
  - mcp
source: "project"
---

リファクタを行う。

## ステップ

- テストが通ることを確認
- プロジェクトの health を確認
- コードを修正
- 修正対象に対して、単体テストを確認
- プロジェクトの health を再確認

## 状態の確認

- `deno doc mod.ts` で仕様を確認
- `deno run health` でリポジトリの状態を確認

## 目指す状態

- コード中に仕様を説明する
  - `deno doc mod.ts` でプロジェクトの状態を読み取れるように
- モジュール境界は小さく
  - `mod.ts` の export は最小限にする
  - `examples/*.ts` は mod.ts に対して説明的な
- デッドコードは少なく
  - `npm:tsr` を使ってデッドコードを確認する
  - `deno run -A npm:tsr mod.ts examples/*.ts 'test/.*\.test\.ts$'`
- カバレッジをより高く

## デッドコード

テストが通っている限りで、 internal のコードは削除する。


