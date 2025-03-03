/* @script */
/**
 * git-shallow-search.ts
 *
 * リポジトリを clone して ripgrep で検索するスクリプト
 * 使用方法:
 *   deno run -A poc/git-shallow-search.ts <github-url> <search-pattern> [options]
 *   deno run -A poc/git-shallow-search.ts <github-url> --list-files [options]
 *
 * 例:
 *   deno run -A poc/git-shallow-search.ts github/Spoon-Knife "README"
 *   deno run -A poc/git-shallow-search.ts https://github.com/mizchi/monorepo "import" --glob="*.ts"
 *   deno run -A poc/git-shallow-search.ts mizchi/monorepo --list-files --glob="*.md" --branch=dev
 *   deno run -A poc/git-shallow-search.ts mizchi/monorepo "import" --files  # ファイル名のみ表示
 */

import { dirname, join, resolve } from "jsr:@std/path";
import $ from "jsr:@david/dax";
import {
  createNestedParser,
  type InferNestedParser,
} from "../modules/zodcli/mod.ts";
import { z } from "npm:zod";

// カラーログ用のヘルパー関数
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

// 情報レベルによってログに色をつける
function logInfo(message: string): void {
  console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

function logSuccess(message: string): void {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function logWarning(message: string): void {
  console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

function logError(message: string): void {
  console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function logAction(message: string): void {
  console.log(`${colors.magenta}[ACTION]${colors.reset} ${message}`);
}

function logResult(message: string): void {
  console.log(`${colors.cyan}[RESULT]${colors.reset} ${message}`);
}

// リポジトリ情報の型定義
type RepoInfo = {
  owner: string;
  repo: string;
  branch: string;
  dir: string;
};

// リポジトリの参照情報
type RepoReference = {
  path: string;
  lastAccessed: Date;
};

// 型の定義は自動生成されたものを使用
type SearchArgs = (CommandResult & { command: "search" })["data"];
type FilesArgs = (CommandResult & { command: "files" })["data"];

// ヘルパー型（共通部分の抽出）
type CommonRepoArgs = {
  repoUrl: string;
  branch?: string;
  temp: boolean;
  glob?: string;
};

// デフォルトのクローンディレクトリ
const DEFAULT_CLONE_DIR = resolve(Deno.env.get("HOME") || "~", ".tmpsrc");

// 共通の引数定義
const commonRepoArgs = {
  repoUrl: {
    positional: 0,
    type: z.string().describe("GitHub repository URL or owner/repo format"),
  },
  branch: {
    type: z.string().optional().describe("Branch to clone (default: main)"),
    short: "b",
  },
  temp: {
    type: z
      .boolean()
      .default(false)
      .describe("Clone to temporary directory and remove after search"),
    short: "t",
  },
  glob: {
    type: z
      .string()
      .optional()
      .describe('File pattern to include (e.g. "*.ts")'),
    short: "g",
  },
};

// コマンド定義
const subCommands = {
  files: {
    name: "files",
    description: "List files in a repository",
    args: {
      ...commonRepoArgs,
    },
  },
  vacuum: {
    name: "vacuum",
    description: "Vacuum old repositories manually",
    args: {},
  },
  search: {
    name: "search",
    description: "Search in a repository using ripgrep",
    args: {
      ...commonRepoArgs,
      pattern: {
        positional: 1,
        type: z
          .string()
          .optional()
          .describe("Search pattern (regular expression)"),
      },
      vacuum: {
        type: z
          .boolean()
          .default(false)
          .describe(
            "Clean up repositories that haven't been accessed in 3 days",
          ),
        short: "v",
      },
      files: {
        type: z
          .boolean()
          .default(false)
          .describe("Show only filenames instead of matching content"),
        short: "f",
      },
      lines: {
        type: z
          .boolean()
          .default(false)
          .describe("Show filenames with line numbers in VSCode jump format"),
        short: "L",
      },
      maxCount: {
        type: z
          .number()
          .optional()
          .default(5)
          .describe("Maximum number of matches per file"),
        short: "m",
      },
      context: {
        type: z
          .number()
          .optional()
          .describe("Show NUM lines before and after each match"),
        short: "C",
      },
      ignoreCase: {
        type: z.boolean().default(false).describe("Case insensitive search"),
        short: "i",
      },
      smartCase: {
        type: z
          .boolean()
          .default(false)
          .describe(
            "Smart case search (case-insensitive if pattern is all lowercase)",
          ),
        short: "S",
      },
      wordRegexp: {
        type: z
          .boolean()
          .default(false)
          .describe("Only show matches surrounded by word boundaries"),
        short: "w",
      },
    },
  },
};

// コマンドのスキーマから型を推論
type CommandResult = InferNestedParser<typeof subCommands>;

// パーサーの作成
const parser = createNestedParser(subCommands, {
  name: "ghs",
  description: "Shallow clone a repository and search with ripgrep",
});

// GitHub URL からリポジトリ情報を抽出
function parseRepoUrl(url: string): RepoInfo {
  if (url.startsWith("https")) {
    const u = new URL(url);
    const [, owner, repo, _tree, branch, ...paths] = u.pathname.split("/");
    return {
      owner,
      repo: repo.replace(/\.git/, ""),
      branch: branch ?? "main",
      dir: paths.join("/"),
    };
  }

  if (url.startsWith("git@")) {
    const [, expr] = url.split(":");
    const [owner, repo, _tree, branch, ...paths] = expr.split("/");
    return {
      owner,
      repo: repo.replace(/\.git/, ""),
      branch: branch ?? "main",
      dir: paths.join("/"),
    };
  }

  const [owner, repo, ...paths] = url.split("/");
  return {
    owner,
    repo,
    branch: "main",
    dir: paths.join("/"),
  };
}

// ファイルやディレクトリが存在するか確認
async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

// ディレクトリが存在することを確認し、存在しなければ作成
async function ensureDir(dir: string): Promise<void> {
  try {
    await Deno.mkdir(dir, { recursive: true });
  } catch (error) {
    // すでに存在する場合は無視
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
}

// リポジトリの参照情報ファイルのパス
function getReferencesFilePath(): string {
  return join(DEFAULT_CLONE_DIR, ".references.json");
}

// リポジトリの参照情報を読み込む
async function loadReferences(): Promise<Record<string, RepoReference>> {
  const path = getReferencesFilePath();

  if (await exists(path)) {
    try {
      const content = await Deno.readTextFile(path);
      return JSON.parse(content);
    } catch (error) {
      console.error("参照情報の読み込みに失敗しました:", error);
      return {};
    }
  }

  return {};
}

// リポジトリの参照情報を保存する
async function saveReferences(
  references: Record<string, RepoReference>,
): Promise<void> {
  const path = getReferencesFilePath();
  await ensureDir(dirname(path));
  await Deno.writeTextFile(path, JSON.stringify(references, null, 2));
}

// リポジトリの参照情報を更新する
async function updateReferences(
  repoKey: string,
  cloneDir: string,
): Promise<void> {
  const references = await loadReferences();
  references[repoKey] = {
    path: cloneDir,
    lastAccessed: new Date(),
  };
  await saveReferences(references);
}

// 3日以上前のリポジトリを掃除する
async function vacuumOldRepositories(): Promise<void> {
  logAction("古いリポジトリを掃除しています...");
  const references = await loadReferences();
  const now = new Date();
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  let removedCount = 0;

  for (const [repoKey, reference] of Object.entries(references)) {
    const lastAccessed = new Date(reference.lastAccessed);
    const ageInMs = now.getTime() - lastAccessed.getTime();

    if (ageInMs > threeDaysInMs) {
      try {
        if (await exists(reference.path)) {
          await Deno.remove(reference.path, { recursive: true });
          logSuccess(
            `古いリポジトリを削除しました: ${repoKey} (最終アクセス: ${lastAccessed.toLocaleString()})`,
          );
          removedCount++;
        }
        delete references[repoKey];
      } catch (error) {
        logError(`リポジトリの削除に失敗しました: ${repoKey} ${error}`);
      }
    }
  }

  await saveReferences(references);
  logResult(`掃除完了: ${removedCount}個のリポジトリを削除しました`);
}

// コマンドライン引数をパースする
function parseArgs() {
  try {
    // 後方互換性のため --list-files オプションを特別処理
    const hasListFilesOption = Deno.args.some(
      (arg) => arg === "--list-files" || arg === "-l",
    );
    // コマンドが明示されていない場合にsearchとみなす
    const args = [...Deno.args];
    if (
      args.length > 0 &&
      !args[0].startsWith("-") &&
      !["files", "vacuum", "search"].includes(args[0])
    ) {
      args.unshift("search");
    }

    const result = parser.parse(args);

    if (result.command === "search" && hasListFilesOption) {
      // 後方互換性のため、searchコマンドで--list-filesが指定されている場合は
      // filesコマンドに変換する
      return {
        command: "files",
        data: result.data,
      };
    }

    return result;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("引数のパースに失敗しました:", error.message);
    } else {
      console.error("引数のパースに失敗しました:", String(error));
    }
    console.log(parser.help());
    Deno.exit(1);
  }
}

// リポジトリを準備する共通処理
async function prepareRepository(
  repoUrl: string,
  branch?: string,
  temp = false,
): Promise<{
  cloneDir: string;
  searchDir: string;
  repoKey: string;
  useExisting: boolean;
  skipFetch: boolean;
  cleanup: () => Promise<void>;
}> {
  const info = parseRepoUrl(repoUrl);
  const gitUrl = `https://github.com/${info.owner}/${info.repo}`;
  const branchToUse = branch || info.branch;
  const repoKey = `${info.owner}/${info.repo}/${branchToUse}`;

  // クローン先ディレクトリの決定
  let cloneDir: string;
  let useExisting = false;
  let skipFetch = false;

  if (temp) {
    cloneDir = await Deno.makeTempDir();
    logInfo(`一時ディレクトリにクローン: ${cloneDir}`);
  } else {
    // デフォルトは ~/.tmpsrc/owner-repo-branch
    const dirName = `${info.owner}-${info.repo}-${branchToUse}`;
    cloneDir = join(DEFAULT_CLONE_DIR, dirName);

    // ディレクトリが既に存在するか確認
    if (await exists(cloneDir)) {
      useExisting = true;

      // 参照情報を確認して、最後のアクセス時刻をチェック
      const references = await loadReferences();
      const reference = references[repoKey];

      if (reference) {
        const lastAccessed = new Date(reference.lastAccessed);
        const now = new Date();
        const oneHourInMs = 60 * 60 * 1000; // 1時間（ミリ秒）
        const ageInMs = now.getTime() - lastAccessed.getTime();

        // 1時間以内にアクセスがあれば、fetchをスキップ
        if (ageInMs < oneHourInMs) {
          logSuccess(
            `最近（${
              Math.floor(
                ageInMs / 60000,
              )
            }分前）にアクセスしたリポジトリです。fetchをスキップします。`,
          );
          skipFetch = true;
        } else {
          logInfo(
            `既存のクローンを使用（最終アクセス: ${lastAccessed.toLocaleString()}）: ${cloneDir}`,
          );
        }
      } else {
        logInfo(`既存のクローンを使用: ${cloneDir}`);
      }
    } else {
      await ensureDir(dirname(cloneDir));
      logInfo(`クローン先: ${cloneDir}`);
    }
  }

  // クリーンアップ関数を定義
  const cleanup = async () => {
    if (temp) {
      await Deno.remove(cloneDir, { recursive: true });
      logInfo(`一時ディレクトリを削除しました: ${cloneDir}`);
    }
  };

  // ディレクトリが指定されていれば、そのディレクトリのみ検索
  const searchDir = info.dir ? join(cloneDir, info.dir) : cloneDir;

  return {
    cloneDir,
    searchDir,
    repoKey,
    useExisting,
    skipFetch,
    cleanup,
  };
}

// ファイル一覧を表示するコマンド
async function runFilesCommand(args: FilesArgs) {
  const { cloneDir, searchDir, repoKey, useExisting, skipFetch, cleanup } =
    await prepareRepository(args.repoUrl, args.branch, args.temp);

  try {
    // リポジトリ準備
    if (!useExisting) {
      // 新しくクローン
      logAction(`リポジトリをクローン中: ${args.repoUrl}`);
      await $`git clone https://github.com/${
        parseRepoUrl(args.repoUrl).owner
      }/${parseRepoUrl(args.repoUrl).repo} ${cloneDir} --depth 1 --branch ${
        args.branch || parseRepoUrl(args.repoUrl).branch
      }`;
    } else if (!skipFetch) {
      // 既存のリポジトリを更新（1時間以内のアクセスでなければ）
      logAction(`リポジトリを最新の状態に更新中...`);
      await $`cd ${cloneDir} && git fetch --depth 1`;
      await $`cd ${cloneDir} && git reset --hard origin/${
        args.branch || parseRepoUrl(args.repoUrl).branch
      }`;
    }

    // 参照情報を更新（一時ディレクトリでない場合のみ）
    if (!args.temp) {
      await updateReferences(repoKey, cloneDir);
    }

    logAction(`ファイル一覧を表示します...`);
    await listFiles(searchDir, args);
  } finally {
    await cleanup();
  }
}

// 検索を実行するコマンド
async function runSearchCommand(args: SearchArgs) {
  // vacuumオプションが指定されていれば古いリポジトリを掃除する
  if (args.vacuum) {
    await vacuumOldRepositories();
  }

  // パターンが必要
  if (!args.pattern) {
    logError("エラー: 検索パターンが必要です");
    Deno.exit(1);
  }

  const { cloneDir, searchDir, repoKey, useExisting, skipFetch, cleanup } =
    await prepareRepository(args.repoUrl, args.branch, args.temp);

  try {
    // リポジトリ準備
    if (!useExisting) {
      // 新しくクローン
      logAction(`リポジトリをクローン中: ${args.repoUrl}`);
      await $`git clone https://github.com/${
        parseRepoUrl(args.repoUrl).owner
      }/${parseRepoUrl(args.repoUrl).repo} ${cloneDir} --depth 1 --branch ${
        args.branch || parseRepoUrl(args.repoUrl).branch
      }`;
    } else if (!skipFetch) {
      // 既存のリポジトリを更新（1時間以内のアクセスでなければ）
      logAction(`リポジトリを最新の状態に更新中...`);
      await $`cd ${cloneDir} && git fetch --depth 1`;
      await $`cd ${cloneDir} && git reset --hard origin/${
        args.branch || parseRepoUrl(args.repoUrl).branch
      }`;
    }

    // 参照情報を更新（一時ディレクトリでない場合のみ）
    if (!args.temp) {
      await updateReferences(repoKey, cloneDir);
    }

    // ripgrep (rg) コマンドの存在確認
    const rgResult = await $`which rg`.noThrow();
    const hasRg = rgResult.code === 0;

    logAction(`パターン "${args.pattern}" で検索中...`);
    await searchFiles(searchDir, hasRg, args);
  } finally {
    await cleanup();
  }
}

// ファイル一覧を表示する（git ls-files を使用）
async function listFiles(searchDir: string, args: CommonRepoArgs) {
  try {
    let hasFiles = false;

    // git ls-files でファイル一覧を取得
    if (args.glob) {
      // グロブパターンがある場合はパイプでgrepを使用
      const pattern = args.glob.replace(/\*/g, ".*").replace(/\?/g, ".");

      // ファイルが存在するかチェック
      const checkResult =
        await $`cd ${searchDir} && git ls-files | grep -q -E "${pattern}"`
          .noThrow();
      hasFiles = checkResult.code === 0;

      if (hasFiles) {
        // ファイルが存在する場合は表示
        await $`cd ${searchDir} && git ls-files | grep -E "${pattern}"`;
      } else {
        logWarning(
          `パターン "${args.glob}" に一致するファイルはありませんでした。`,
        );
      }
    } else {
      // グロブパターンがない場合はそのまま表示
      // ファイル数をカウントして判定
      const fileCount = await $`cd ${searchDir} && git ls-files | wc -l`.text();
      hasFiles = parseInt(fileCount.trim()) > 0;

      if (hasFiles) {
        await $`cd ${searchDir} && git ls-files`;
      } else {
        logWarning(`リポジトリにファイルが見つかりません。`);
      }
    }
  } catch (error: unknown) {
    // エラーは無視
    logError(`ファイル一覧の取得中にエラーが発生しました: ${String(error)}`);
  }
}

// ファイル内を検索する
async function searchFiles(
  searchDir: string,
  hasRg: boolean,
  args: SearchArgs,
) {
  // 検索パターンがない場合は実行しない
  if (!args.pattern) {
    return;
  }

  let searchResult = "";
  let hasResults = false;

  // 表示モードの決定
  const filesOnlyMode = args.files === true;
  const linesMode = args.lines === true;

  if (filesOnlyMode && linesMode) {
    logInfo(
      "ファイル名と行番号を表示モードを有効化しました（VSCodeジャンプフォーマット）",
    );
  } else if (filesOnlyMode) {
    logInfo("ファイル名のみ表示モードを有効化しました");
  } else if (linesMode) {
    logInfo("行番号付きで表示モードを有効化しました");
  }

  if (hasRg) {
    // ripgrep コマンドオプションの構築
    const rgOptions = [];

    // オプションによる表示モードの決定
    if (filesOnlyMode && !linesMode) {
      // ファイル名のみ表示モード
      rgOptions.push(`--files-with-matches`);
    } else {
      // 通常の検索時の設定またはlinesMode
      // オプションの追加
      if (args.maxCount !== undefined) {
        rgOptions.push(`--max-count`, args.maxCount.toString());
      }

      if (args.context !== undefined && !linesMode) {
        rgOptions.push(`--context`, args.context.toString());
      }

      // 行番号表示（通常モードまたはlinesModeの場合）
      rgOptions.push(`--line-number`);
    }

    if (args.ignoreCase) {
      rgOptions.push(`--ignore-case`);
    }

    if (args.smartCase) {
      rgOptions.push(`--smart-case`);
    }

    if (args.wordRegexp) {
      rgOptions.push(`--word-regexp`);
    }

    // globパターンがあれば追加
    if (args.glob) {
      rgOptions.push("--glob", args.glob);
    }

    // 検索の実行
    try {
      // まず検索結果があるかチェック
      const checkResult =
        await $`cd ${searchDir} && rg --quiet "${args.pattern}"`.noThrow();
      hasResults = checkResult.code === 0;

      if (hasResults) {
        if (linesMode) {
          // 行番号付きの検索結果を取得
          const output = await $`cd ${searchDir} && rg --line-number ${
            filesOnlyMode ? "--no-heading" : ""
          } "${args.pattern}"`.text();
          const lines = output.trim().split("\n");
          const homeDir = Deno.env.get("HOME") || "~";

          // 各行を処理
          for (const line of lines) {
            if (line.trim()) {
              // 形式: file:line:content または file:line:column:content
              const parts = line.split(":");
              if (parts.length >= 2) {
                const filePath = parts[0];
                const lineNumber = parts[1];

                // 絶対パスに変換
                const absolutePath = join(searchDir, filePath);

                // ホームディレクトリからの相対パスに変換
                let displayPath;
                if (absolutePath.startsWith(homeDir)) {
                  // ~/path/to/file の形式で表示
                  displayPath = absolutePath.replace(homeDir, "~");
                } else {
                  // ホームディレクトリ以外は絶対パスのまま
                  displayPath = absolutePath;
                }

                // VSCodeジャンプフォーマット（ファイル:行）で表示
                console.log(`${displayPath}:${lineNumber}`);
              }
            }
          }
        } else if (filesOnlyMode) {
          // ファイル名のみの場合、結果を取得して相対パスに変換
          const output = await $`cd ${searchDir} && rg ${
            rgOptions.join(
              " ",
            )
          } "${args.pattern}"`.text();
          const files = output.trim().split("\n");
          const homeDir = Deno.env.get("HOME") || "~";

          // 各ファイルに対してホームディレクトリからの相対パスを表示
          for (const file of files) {
            if (file.trim()) {
              const absolutePath = join(searchDir, file);

              // ホームディレクトリからの相対パスに変換
              if (absolutePath.startsWith(homeDir)) {
                // ~/path/to/file の形式で表示
                const relativePath = absolutePath.replace(homeDir, "~");
                console.log(relativePath);
              } else {
                // ホームディレクトリ以外は絶対パスのまま
                console.log(absolutePath);
              }
            }
          }
        } else {
          // 通常の検索の場合はそのまま表示
          await $`cd ${searchDir} && rg ${
            rgOptions.join(" ")
          } "${args.pattern}"`;
        }
      }
    } catch (error: unknown) {
      // エラーは無視
      logError(`検索実行中にエラーが発生しました: ${String(error)}`);
    }
  } else {
    // ripgrep がなければ grep を使用
    logWarning("ripgrep (rg) が見つからないため grep を使用します");

    const grepOptions = [];

    if (args.ignoreCase) {
      grepOptions.push("-i");
    }

    // --files オプションが指定されている場合はファイル名のみ表示（grepの場合は-l）
    if (filesOnlyMode) {
      grepOptions.push("-l");
    } else {
      // 通常の検索時の設定
      if (args.context !== undefined) {
        grepOptions.push(`-C`, args.context.toString());
      }

      // 行番号を表示（ファイル名のみモードでない場合）
      grepOptions.push("-n");
    }

    // globパターンによるファイル絞り込み（簡易的な実装）
    let includePattern = "";
    if (args.glob) {
      includePattern = `--include="${args.glob}"`;
    }

    // 検索の実行
    try {
      // まず検索結果があるかチェック（-q = quiet）
      const checkResult =
        await $`cd ${searchDir} && grep -q -r ${includePattern} "${args.pattern}" .`
          .noThrow();
      hasResults = checkResult.code === 0;

      if (hasResults) {
        if (linesMode) {
          // 行番号付きの検索結果を取得
          const output =
            await $`cd ${searchDir} && grep -n -r ${includePattern} "${args.pattern}" .`
              .text();
          const lines = output.trim().split("\n");
          const homeDir = Deno.env.get("HOME") || "~";

          // 各行を処理
          for (const line of lines) {
            if (line.trim()) {
              // 形式: ./file:line:content
              const firstColonIndex = line.indexOf(":");
              if (firstColonIndex > 0) {
                let filePath = line.substring(0, firstColonIndex);
                const rest = line.substring(firstColonIndex + 1);
                const secondColonIndex = rest.indexOf(":");

                if (secondColonIndex > 0) {
                  const lineNumber = rest.substring(0, secondColonIndex);

                  // ファイル名が ./path/to/file の形式であれば ./ を削除
                  if (filePath.startsWith("./")) {
                    filePath = filePath.substring(2);
                  }

                  // 絶対パスに変換
                  const absolutePath = join(searchDir, filePath);

                  // ホームディレクトリからの相対パスに変換
                  let displayPath;
                  if (absolutePath.startsWith(homeDir)) {
                    // ~/path/to/file の形式で表示
                    displayPath = absolutePath.replace(homeDir, "~");
                  } else {
                    // ホームディレクトリ以外は絶対パスのまま
                    displayPath = absolutePath;
                  }

                  // VSCodeジャンプフォーマット（ファイル:行）で表示
                  console.log(`${displayPath}:${lineNumber}`);
                }
              }
            }
          }
        } else if (filesOnlyMode) {
          // ファイル名のみの場合、結果を取得して相対パスに変換
          const output =
            await $`cd ${searchDir} && grep -l -r ${includePattern} "${args.pattern}" .`
              .text();
          const files = output.trim().split("\n");
          const homeDir = Deno.env.get("HOME") || "~";

          // 各ファイルに対してホームディレクトリからの相対パスを表示
          for (const file of files) {
            if (file.trim()) {
              // ファイル名が ./path/to/file の形式であれば ./ を削除
              const cleanPath = file.startsWith("./")
                ? file.substring(2)
                : file;
              const absolutePath = join(searchDir, cleanPath);

              // ホームディレクトリからの相対パスに変換
              if (absolutePath.startsWith(homeDir)) {
                // ~/path/to/file の形式で表示
                const relativePath = absolutePath.replace(homeDir, "~");
                console.log(relativePath);
              } else {
                // ホームディレクトリ以外は絶対パスのまま
                console.log(absolutePath);
              }
            }
          }
        } else {
          // 通常の検索の場合はそのまま表示
          await $`cd ${searchDir} && grep -r ${
            grepOptions.join(
              " ",
            )
          } ${includePattern} "${args.pattern}" .`;
        }
      }
    } catch (error: unknown) {
      // エラーは無視
      logError(`検索実行中にエラーが発生しました: ${String(error)}`);
    }
  }

  // 検索結果がない場合はメッセージを表示
  if (!hasResults) {
    logWarning(
      `パターン "${args.pattern}" に一致する結果は見つかりませんでした。`,
    );
  }
}

// vacuum のみを実行
async function runVacuum() {
  await vacuumOldRepositories();
}

// メイン処理の実行
if (import.meta.main) {
  // 引数をパースして適切な処理を実行
  const result = parseArgs();

  if (result.command === "vacuum") {
    await runVacuum();
  } else if (result.command === "files") {
    await runFilesCommand(result.data);
  } else if (result.command === "search") {
    await runSearchCommand(result.data);
  }
}

/// test
import { test } from "@std/testing/bdd";
import { expect } from "@std/expect";

test("parseRepoUrl が正しく URL を解析できること", () => {
  const testCases = [
    {
      input: "https://github.com/mizchi/monorepo",
      expected: { owner: "mizchi", repo: "monorepo", branch: "main", dir: "" },
    },
    {
      input: "github/Spoon-Knife",
      expected: {
        owner: "github",
        repo: "Spoon-Knife",
        branch: "main",
        dir: "",
      },
    },
    {
      input: "https://github.com/mizchi/monorepo/tree/dev/packages/lib",
      expected: {
        owner: "mizchi",
        repo: "monorepo",
        branch: "dev",
        dir: "packages/lib",
      },
    },
    {
      input: "git@github.com:user/repo.git",
      expected: { owner: "user", repo: "repo", branch: "main", dir: "" },
    },
  ];

  for (const { input, expected } of testCases) {
    const result = parseRepoUrl(input);
    expect(result).toEqual(expected);
  }
});
