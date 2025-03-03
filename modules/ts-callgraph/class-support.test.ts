import { expect } from "jsr:@std/expect";
import { test } from "jsr:@std/testing/bdd";
import { createProgram, generateCallGraph } from "./parser.ts";
import * as path from "jsr:@std/path";
import { ensureFileSync, existsSync } from "jsr:@std/fs";

// スナップショットを更新するかどうか
const UPDATE_SNAPSHOTS = Deno.args.includes("--update");

// スナップショットを保存・比較する関数
async function expectMatchesSnapshot(
  snapshotName: string,
  actual: string,
): Promise<void> {
  // 絶対パスで指定
  const snapshotDir = path.resolve("__snapshots__");
  const snapshotPath = path.join(snapshotDir, `${snapshotName}.snap`);

  console.log(`スナップショットのパス: ${snapshotPath}`);

  // スナップショットディレクトリが存在しない場合は作成
  ensureFileSync(snapshotPath);

  // スナップショットを更新するフラグが指定されている場合は強制的に更新
  if (UPDATE_SNAPSHOTS) {
    await Deno.writeTextFile(snapshotPath, actual);
    console.log(`Updated snapshot: ${snapshotPath}`);
    return;
  }

  if (existsSync(snapshotPath)) {
    // スナップショットが存在する場合は比較
    const expected = await Deno.readTextFile(snapshotPath);
    if (expected.trim() === "") {
      // ファイルが空の場合は新しい内容で上書き
      await Deno.writeTextFile(snapshotPath, actual);
      console.log(`Updated empty snapshot: ${snapshotPath}`);
    } else {
      expect(actual).toBe(expected);
    }
  } else {
    // スナップショットが存在しない場合は作成
    await Deno.writeTextFile(snapshotPath, actual);
    console.log(`Created snapshot: ${snapshotPath}`);
  }
}

test.skip("クラスサポートが正しく動作する", async () => {
  // サンプルファイルのパスを取得
  // 絶対パスで指定
  const filePath = path.resolve("__fixtures/class-sample.ts");

  console.log(`サンプルファイルのパス: ${filePath}`);

  // ファイルが存在するか確認
  if (!existsSync(filePath)) {
    // 別のパスも試してみる
    const alternativePath = path.resolve(
      "../ts-callgraph/__fixtures/class-sample.ts",
    );
    console.log(`代替パスを試します: ${alternativePath}`);

    if (!existsSync(alternativePath)) {
      throw new Error(
        `サンプルファイルが見つかりません: ${filePath} または ${alternativePath}`,
      );
    }

    console.log(`代替パスが見つかりました: ${alternativePath}`);
    // 見つかった場合は代替パスを使用
    return runTest(alternativePath);
  }

  return runTest(filePath);
});

// テスト実行関数
async function runTest(filePath: string) {
  // プログラムを作成
  const program = createProgram(filePath);

  // コールグラフを生成
  const callGraph = generateCallGraph(program);

  // 基本的な検証
  expect(callGraph.getAllNodes().size).toBeGreaterThan(0);
  expect(callGraph.getCalls().length).toBeGreaterThan(0);

  // クラス関連のノードが存在することを確認
  const nodes = callGraph.getAllNodes();
  const nodeNames = Array.from(nodes.keys());

  // クラス名が検出されていることを確認
  expect(nodeNames).toContain("BaseClass");
  expect(nodeNames).toContain("DerivedClass");

  // メソッドが検出されていることを確認
  expect(
    nodeNames.some((name) =>
      name.startsWith("BaseClass.") || name === "BaseClass.constructor"
    ),
  ).toBe(true);
  expect(
    nodeNames.some((name) =>
      name.startsWith("DerivedClass.") || name === "DerivedClass.constructor"
    ),
  ).toBe(true);

  // 静的メソッドが検出されていることを確認
  const baseClassCreateDefault = Array.from(nodes.values()).find(
    (node) => node.name === "BaseClass.createDefault",
  );
  expect(baseClassCreateDefault?.isStatic).toBe(true);

  const derivedClassCreateWithName = Array.from(nodes.values()).find(
    (node) => node.name === "DerivedClass.createWithName",
  );
  expect(derivedClassCreateWithName?.isStatic).toBe(true);

  // 継承関係が検出されていることを確認
  const derivedClass = Array.from(nodes.values()).find(
    (node) => node.name === "DerivedClass",
  );
  expect(derivedClass?.superClass).toBe("BaseClass");

  // DOT形式の出力をスナップショットとして保存・比較
  const dot = callGraph.toDot();
  await expectMatchesSnapshot("class-sample-dot", dot);

  // 関数実装の要約をスナップショットとして保存・比較
  const functionSummaryDot = callGraph.toFunctionSummaryDot();
  await expectMatchesSnapshot(
    "class-sample-function-summary-dot",
    functionSummaryDot,
  );

  // テキスト形式の要約をスナップショットとして保存・比較
  const functionSummaryText = callGraph.toFunctionSummaryText();
  await expectMatchesSnapshot(
    "class-sample-function-summary-text",
    functionSummaryText,
  );
}
