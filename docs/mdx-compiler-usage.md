# MDX コンパイラ CLI ツール

MDX コンテンツをコンパイルするための Deno CLI
ツールです。[mdx-bundler](https://github.com/kentcdodds/mdx-bundler)
を使用して、Markdown + JSX (MDX) ファイルをコンパイルし、必要に応じて HTML
としてレンダリングします。

## 機能

- MDX ファイルのコンパイル
- フロントマターの抽出
- コンパイル結果の保存
- シンプルな HTML プレビューの生成

## 前提条件

- [Deno](https://deno.land/) がインストールされていること

## インストール

このツールは Deno
スクリプトとして実行するため、特別なインストール手順は必要ありません。リポジトリをクローンするか、スクリプトファイルをダウンロードするだけで使用できます。

```bash
# リポジトリをクローンする場合
git clone <repository-url>
cd <repository-directory>

# または scripts/mdx-compiler.ts だけをダウンロードする場合
curl -O https://raw.githubusercontent.com/<username>/<repository>/main/scripts/mdx-compiler.ts
```

## 使い方

### MDX ファイルのコンパイル

```bash
deno run -A scripts/mdx-compiler.ts compile <input.mdx> [--output <output.js>]
```

#### オプション

- `<input.mdx>`: コンパイルする MDX ファイルのパス（必須）
- `--output <output.js>` または `-o <output.js>`:
  コンパイル結果を保存するファイルパス（オプション）
  - 指定しない場合は、コンパイル結果の概要がコンソールに表示されます
- `--cwd <directory>` または `-c <directory>`:
  作業ディレクトリを指定（オプション）
  - 指定しない場合は、現在のディレクトリが使用されます

### コンパイル済みファイルのレンダリング

```bash
deno run -A scripts/mdx-compiler.ts render <compiled.js> [--output <output.html>]
```

#### オプション

- `<compiled.js>`: レンダリングするコンパイル済みの JS ファイルのパス（必須）
- `--output <output.html>` または `-o <output.html>`: HTML
  出力を保存するファイルパス（オプション）
  - 指定しない場合は、入力ファイル名に基づいて自動生成されます

## 使用例

### 基本的な MDX ファイルのコンパイル

```bash
deno run -A scripts/mdx-compiler.ts compile content/blog/hello-world.mdx --output dist/hello-world.js
```

### コンパイル結果の HTML プレビュー生成

```bash
deno run -A scripts/mdx-compiler.ts render dist/hello-world.js --output dist/hello-world.html
```

### ワンライナーでコンパイルとレンダリングを実行

```bash
deno run -A scripts/mdx-compiler.ts compile content/blog/hello-world.mdx --output dist/hello-world.js && deno run -A scripts/mdx-compiler.ts render dist/hello-world.js
```

## MDX ファイルの例

````mdx
---
title: Hello World
date: 2023-01-01
tags: [mdx, react]
---

# Hello, MDX!

これは MDX ファイルの例です。

## コードブロック

```js
function hello() {
  console.log("Hello, world!");
}
````

## コンポーネントのインポート

import { Button } from './components/Button';

<Button>Click me</Button>

```
## 注意事項

- このツールは簡易的な HTML レンダリングのみを提供します。完全な MDX のレンダリングには React が必要です。
- サーバーサイドでのレンダリングでは、クライアントサイドのインタラクティブな機能は動作しません。
- 本番環境での使用には、Next.js や Gatsby などのフレームワークと組み合わせることをお勧めします。

## トラブルシューティング

### エラー: ファイルが見つかりません

指定したファイルパスが正しいか確認してください。相対パスの場合は、現在のディレクトリからの相対パスになります。

### エラー: コンパイルに失敗しました

MDX ファイルの構文が正しいか確認してください。特に JSX 部分の構文エラーが一般的な原因です。

### エラー: ファイルの書き込みに失敗しました

出力先のディレクトリが存在し、書き込み権限があるか確認してください。

## ライセンス

このツールは MIT ライセンスの下で提供されています。
```
