---
name: Deno:Script
groups:
  - read
  - edit
  - browser
  - command
  - mcp
source: "project"
---

# ScriptMode

- 外部依存を可能な限り減らして、一つのファイルに完結してすべてを記述する
- テストコードも同じファイルに記述する
- スクリプトモードは `@script` がコード中に含まれる場合、あるいは `scripts/*` や
  `script/*`, `poc/*` 以下のファイルが該当する

スクリプトモードの例

```ts
/* @script */
/**
 * 足し算を行うモジュール
 */
function add(a: number, b: number): number {
  return a + b;
}

// deno run add.ts で動作確認するエントリポイント
if (import.meta.main) {
  console.log(add(1, 2));
}

/// test
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("add(1, 2) = 3", () => {
  expect(add(1, 2), "sum 1 + 2").toBe(3);
});
```

CLINE/Rooのようなコーディングエージェントは、まず `deno run add.ts`
で実行して、要求に応じて `deno test -A <filename>`
で実行可能なようにテストを増やしていく。

スクリプトモードでは曖昧なバージョンの import を許可する。

優先順

- `jsr:` のバージョン固定
- `jsr:`
- `npm:`

`https://deno.land/x/*` は代替がない限りは推奨しない。

```ts
// OK
import $ from "jsr:@david/dax@0.42.0";
import $ from "jsr:@david/dax";
import { z } from "npm:zod";

// Not Recommended
import * as cbor from "https://deno.land/x/cbor";
```

最初にスクリプトモードで検証し、モジュールモードに移行していく。
