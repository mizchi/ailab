# mdx-to-md

MDX ファイルを Markdown に変換するライブラリなのだ。

## インストール

```bash
# npm
npm install mdx-to-md

# yarn
yarn add mdx-to-md
```

## 基本的な使い方

### JavaScript/TypeScript から使用

```typescript
import { mdxToMd } from "mdx-to-md";

// MDX ファイルを Markdown に変換
async function convertMdx() {
  const markdown = await mdxToMd("path/to/file.mdx");
  console.log(markdown);
}

// 変換結果をファイルに書き込む例
import { writeFile } from "fs/promises";

async function convertAndSave() {
  const markdown = await mdxToMd("README.mdx");
  const banner = "This README was auto-generated";
  const readme = `<!--- ${banner} -->\n\n${markdown}`;

  await writeFile("README.md", readme);
  console.log("📝 Converted README.mdx -> README.md");
}
```

### CLI から使用

```bash
# 基本的な使い方
mdx-to-md [sourcePath] [outPath]

# 例: README.mdx を README.md に変換
mdx-to-md README.mdx README.md

# 出力先を省略すると、拡張子を .md に変えたファイル名になる
mdx-to-md README.mdx

# ウォッチモード (ファイルの変更を監視して自動変換)
mdx-to-md README.mdx --watch
```

## API リファレンス

### mdxToMd(path, options?)

MDX ファイルを Markdown に変換する関数なのだ。

**引数:**

- `path` (string): MDX ファイルのパス
- `options` (object, オプション):
  [mdx-bundler](https://github.com/kentcdodds/mdx-bundler) のオプション

**戻り値:**

- `Promise<string>`: 変換された Markdown 文字列

## 内部実装の概要

1. MDX ファイルを読み込む
2. mdx-bundler を使用して MDX をバンドルし、React コンポーネントに変換
3. React の renderToString を使用して HTML に変換
4. node-html-markdown を使用して HTML を Markdown に変換

## ユースケース

- README.mdx から README.md を自動生成
- MDX で書かれたドキュメントを Markdown 形式で配布
- MDX の機能（コンポーネントのインポートなど）を使いつつ、最終的には Markdown
  として出力

## 依存ライブラリ

- [mdx-bundler](https://github.com/kentcdodds/mdx-bundler): MDX のバンドル
- [node-html-markdown](https://github.com/crosstype/node-html-markdown): HTML
  から Markdown への変換
- [react](https://reactjs.org/): React コンポーネントのレンダリング
- [react-dom/server](https://reactjs.org/docs/react-dom-server.html):
  サーバーサイドレンダリング

## 参考リンク

- [GitHub リポジトリ](https://github.com/souporserious/mdx-to-md)
- [npm パッケージ](https://www.npmjs.com/package/mdx-to-md)
