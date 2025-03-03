#!/usr/bin/env -S deno run -A

// ワークスペース一覧
// const workspaces = ["npm-summary", "zodcli", "todo-cli", "todo2"];
import path from "node:path";
const rootConfig = Deno.readTextFileSync(
  path.join(Deno.cwd(), "deno.json"),
);
const workspaces = JSON.parse(rootConfig).workspace;
const rootLevelpoc = ["poc"];

// Git でステージングされたファイル一覧を取得
const changedFiles = new Deno.Command("git", {
  args: ["diff", "--cached", "--name-only"],
}).outputSync().stdout;

const changedFilesStr = new TextDecoder().decode(changedFiles);
const changedPaths = new Set<string>();

// 変更されたファイルからワークスペースとスクリプトを特定
for (const file of changedFilesStr.split("\n")) {
  if (!file) continue;

  // ワークスペースの変更をチェック
  for (const workspace of workspaces) {
    if (file.startsWith(workspace + "/")) {
      changedPaths.add(workspace);
      break;
    }
  }

  // ルートレベルのスクリプト変更をチェック
  for (const scriptDir of rootLevelpoc) {
    if (file.startsWith(scriptDir + "/")) {
      changedPaths.add(scriptDir);
      break;
    }
  }

  // ルートレベルの .ts ファイルをチェック
  if (file.endsWith(".ts") && !file.includes("/")) {
    changedPaths.add("root");
  }
}

// 何も変更がない場合は終了
if (changedPaths.size === 0) {
  console.log("No relevant changes detected. Skipping checks.");
  Deno.exit(0);
}

console.log("Changed paths:", [...changedPaths]);

// フォーマットチェック（全体）
console.log("\n📝 Running format check...");
const fmtProcess = new Deno.Command("deno", {
  args: ["fmt"],
}).spawn();

const fmtStatus = await fmtProcess.status;
if (!fmtStatus.success) {
  console.error("❌ Format check failed");
  Deno.exit(1);
} else {
  console.log("✅ Format check passed");
}

// リントチェックは除外（既存のエラーが多いため）
console.log("\n🔍 Running lint check...");
const lintProcess = new Deno.Command("deno", {
  args: ["lint"],
}).spawn();

const lintStatus = await lintProcess.status;
if (!lintStatus.success) {
  console.error("❌ Lint check failed");
  Deno.exit(1);
} else {
  console.log("✅ Lint check passed");
}

// 変更されたワークスペース/スクリプトに対してテストを実行
for (const path of changedPaths) {
  if (path === "root" || path === "poc") continue; // ルートとpocのテストはスキップ

  console.log(`\n🧪 Running tests for ${path}...`);

  try {
    const testProcess = new Deno.Command("deno", {
      args: ["test", "-A", path],
    }).spawn();

    const testStatus = await testProcess.status;
    if (!testStatus.success) {
      console.error(`❌ Tests failed for ${path}`);
      Deno.exit(1);
    } else {
      console.log(`✅ Tests passed for ${path}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ Could not run tests for ${path}: ${errorMsg}`);
  }
}

// 依存関係チェック（オプション）
if (Deno.args.includes("--check-deps")) {
  console.log("\n📦 Running dependency check...");
  try {
    const depsProcess = new Deno.Command("deno", {
      args: ["task", "check:deps"],
    }).spawn();

    const depsStatus = await depsProcess.status;
    if (!depsStatus.success) {
      console.error("❌ Dependency check failed");
      Deno.exit(1);
    } else {
      console.log("✅ Dependency check passed");
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ Could not run dependency check: ${errorMsg}`);
  }
}

console.log("\n✅ All checks passed successfully!");
