/* @script */
/**
 * npm レジストリの検索APIを使用して、
 * モジュールを検索するスクリプト
 *
 * Usage:
 *   deno run -A poc/search_jsr.ts <search_query>
 *
 * Example:
 *   deno run -A poc/search_jsr.ts zod
 */

import type { PackageJSON } from "@npm/types";

function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  // @ts-ignore xxx
  return keys.reduce((acc, key) => ({ ...acc, [key]: obj[key] }), {});
}

type SearchResult = {
  downloads: {
    monthly: number;
    weekly: number;
  };
  dependents: number;
  updated: string; // Date
  searchScore: number;
  score: {
    final: number;
    detail: {
      popularity: number;
      quality: number;
      maintenance: number;
    };
  };
  flags: {
    insecure: 0;
  };
  package: PackageJSON;
};

/**
 * npmのモジュールを検索する
 * @param query 検索クエリ
 * @returns 検索結果の配列
 */
export async function searchNpm(query: string): Promise<SearchResult[]> {
  const url = `http://registry.npmjs.com/-/v1/search?text=${
    encodeURIComponent(
      query,
    )
  }&size=20`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { objects: SearchResult[] };
  return data.objects;
}

// エントリポイント
if (import.meta.main) {
  const query = Deno.args[0];
  if (!query) {
    console.error("Please provide a search query");
    Deno.exit(1);
  }

  try {
    const results = await searchNpm(query);
    const summary = results.map((t) => {
      return {
        name: t.package.name,
        version: t.package.version,
        downloads: t.downloads,
        dependents: t.dependents,
        updated: t.updated,
        score: pick(t.score.detail, ["popularity", "quality", "maintenance"]),
      };
    });
    console.dir(summary, { depth: undefined });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    } else {
      console.error("Unknown error occurred:", error);
    }
    Deno.exit(1);
  }
}
