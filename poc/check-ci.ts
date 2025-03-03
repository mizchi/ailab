/* @script */
/**
 * GitHub Actions の CI 実行結果を確認するスクリプト
 *
 * このスクリプトは最新の CI 実行結果を取得し、表示します。
 *
 * 使用方法:
 * ```bash
 * deno run -A poc/check-ci.ts
 * ```
 */

import $ from "jsr:@david/dax";

type RunListItem = {
  databaseId: number;
};

/**
 * 最新のCI実行を取得して表示
 */
async function checkLatestCI() {
  const runs = await $`gh run list --json databaseId --limit 1`.json<
    RunListItem[]
  >();
  if (runs.length === 0) {
    console.error("❌ No CI runs found");
    return;
  }
  try {
    await $`gh run view ${runs[0].databaseId} --exit-status`;
  } catch (_error) {
    console.log("---- CI Log ----");
    await $`gh run view ${runs[0].databaseId} --log-failed`.noThrow();
  }
}

// スクリプト実行
if (import.meta.main) {
  await checkLatestCI();
}
