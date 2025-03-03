import { createProgram, generateCallGraph } from "./parser.ts";
import { shouldFilterCall } from "./filter.ts";
import {
  toFunctionCallDot,
  toFunctionSummaryDot,
  toFunctionSummaryText,
} from "./formatter.ts";
import type { CallGraph } from "./callgraph.ts";
import { parse, type path, type ts } from "./deps.ts";

// コマンドライン引数の解析
const flags = parse(Deno.args, {
  string: [
    "output",
    "depth",
    "width",
    "format",
    "ignore",
    "imgcat",
    "max-label-length",
  ],
  boolean: ["verbose", "ignore-stdlib", "ignore-npm", "ignore-jsr"],
  alias: {
    o: "output",
    d: "depth",
    w: "width",
    f: "format",
    g: "imgcat",
    m: "max-label-length",
    v: "verbose",
    i: "ignore",
    "is": "ignore-stdlib",
    "in": "ignore-npm",
    "ij": "ignore-jsr",
  },
  default: {
    depth: "Infinity",
    width: "Infinity",
    output: "callgraph.dot",
    format: "dot", // "dot", "json", "summary", "function-call", "function-summary"
    verbose: false,
    "ignore-stdlib": true,
    "ignore-npm": true,
    "ignore-jsr": true,
    ignore: "",
    "max-label-length": "50",
  },
});

// ヘルプメッセージの表示
if (flags.help || flags.h) {
  console.log(`
TypeScript コールグラフ生成ツール

使い方:
  deno run -A ts-callgraph/cli.ts <ファイルパス> [オプション]

オプション:
  -o, --output <ファイル>    出力ファイル名 (デフォルト: callgraph.dot)
  -d, --depth <数値>         呼び出し深さの制限 (デフォルト: Infinity)
  -w, --width <数値>         呼び出し幅の制限 (各関数からの最大呼び出し数) (デフォルト: Infinity)
  -f, --format <形式>        出力形式 (デフォルト: dot)
                            dot: 詳細なコールグラフをGraphviz DOT形式で出力
                            json: 詳細な呼び出し情報をJSON形式で出力
                            summary: ファイルと関数、関数と関数の関係を要約したJSONを出力
                            function-call: 関数間の呼び出し関係のみをGraphviz DOT形式で出力
                            function-summary: 関数実装から関数の呼び出し関係のみを簡潔に出力
  -g, --imgcat               imgcatでターミナルに出力

  -v, --verbose              詳細なログを出力

フィルタリングオプション:
  --ignore-stdlib            標準ライブラリの呼び出しを無視 (デフォルト: true)
  --ignore-npm               npm パッケージの呼び出しを無視 (デフォルト: true)
  --ignore-jsr               JSR パッケージの呼び出しを無視 (デフォルト: true)
  -i, --ignore <パターン>    指定したパターンに一致する呼び出しを無視（カンマ区切りで複数指定可能）

  -h, --help                 このヘルプメッセージを表示

例:
  deno run -A ts-callgraph/cli.ts poc/math.ts
  deno run -A ts-callgraph/cli.ts poc/math.ts --depth 3 --output math-graph.dot
  deno run -A ts-callgraph/cli.ts poc/callgraph-sample.ts --no-ignore-stdlib
  deno run -A ts-callgraph/cli.ts poc/callgraph-sample.ts --format function-summary
  `);
  Deno.exit(0);
}

// 無視パターンの解析
const ignorePatterns: string[] = flags.ignore ? flags.ignore.split(",") : [];

const filePath = flags._[0];
if (!filePath) {
  console.error("ファイルパスを指定してください");
  console.error(
    "使い方: deno run -A ts-callgraph/cli.ts <ファイルパス> [オプション]",
  );
  console.error("詳細については --help を参照してください");
  Deno.exit(1);
}

// 深さと幅の制限（Infinity または数値）
const maxDepth = flags.depth === "Infinity" ? Infinity : parseInt(flags.depth);
const maxWidth = flags.width === "Infinity" ? Infinity : parseInt(flags.width);
const maxLabelLength = parseInt(flags["max-label-length"]);

// メイン処理
async function main() {
  try {
    const verbose = flags.verbose;
    console.log(`解析対象ファイル: ${filePath}`);

    // プログラムの作成
    const program = createProgram(filePath as string);

    // コールグラフの生成
    const callGraph = generateCallGraph(program, maxDepth, verbose);

    // フィルタリングの適用
    if (
      flags["ignore-stdlib"] || flags["ignore-npm"] || flags["ignore-jsr"] ||
      ignorePatterns.length > 0
    ) {
      if (verbose) {
        console.log("フィルタリングを適用中...");
      }
      callGraph.filterCalls((callInfo) =>
        shouldFilterCall(callInfo, flags, ignorePatterns)
      );
    }

    // 幅の制限を適用
    if (maxWidth !== Infinity) {
      callGraph.pruneByWidth(maxWidth);
    }

    // 出力形式の選択
    const format = flags.format.toLowerCase();
    const outputPath = flags.output;

    switch (format) {
      case "json":
        // JSON形式で出力
        await Deno.writeTextFile(outputPath, callGraph.toJSON());
        console.log(`コールグラフを ${outputPath} にJSON形式で出力しました`);
        break;

      case "summary":
        // 要約情報をJSON形式で出力
        await Deno.writeTextFile(outputPath, callGraph.toSummaryJSON());
        console.log(
          `コールグラフの要約を ${outputPath} にJSON形式で出力しました`,
        );
        break;

      case "function-call": {
        // 関数間の呼び出し関係のみをDOT形式で出力
        await Deno.writeTextFile(
          outputPath,
          toFunctionCallDot(callGraph, { maxLabelLength }),
        );
        console.log(
          `関数間の呼び出し関係を ${outputPath} にDOT形式で出力しました`,
        );
        console.log(
          `可視化するには: dot -Tpng ${outputPath} -o function-calls.png`,
        );

        // ファイルと関数の関係も別ファイルに出力
        const fileInfoPath = outputPath.replace(/\.\w+$/, "_files.json");
        await Deno.writeTextFile(
          fileInfoPath,
          JSON.stringify(callGraph.summarizeFilesFunctions(), null, 2),
        );
        console.log(`ファイルと関数の関係を ${fileInfoPath} に出力しました`);
        break;
      }

      case "function-summary": {
        // 関数の実装から関数の呼び出し関係のみを出力
        await Deno.writeTextFile(
          outputPath,
          toFunctionSummaryDot(callGraph, { maxLabelLength }),
        );
        console.log(
          `関数実装からの呼び出し関係を ${outputPath} にDOT形式で出力しました`,
        );
        console.log(
          `可視化するには: dot -Tpng ${outputPath} -o function-summary.png`,
        );

        // テキスト形式の要約も別ファイルに出力
        const textSummaryPath = outputPath.replace(/\.\w+$/, "_summary.txt");
        await Deno.writeTextFile(
          textSummaryPath,
          toFunctionSummaryText(callGraph, { maxLabelLength }),
        );
        console.log(`関数実装の要約を ${textSummaryPath} に出力しました`);
        break;
      }
      case "imgcat": {
        // imgcatでターミナルに出力
        await Deno.writeTextFile(
          outputPath,
          callGraph.toDot({ maxLabelLength }),
        );
        console.log(`コールグラフを ${outputPath} にDOT形式で出力しました`);
        console.log(`可視化するには: dot -Tpng ${outputPath} -o callgraph.png`);
        const dotCommand = new Deno.Command("dot", {
          args: ["-Tpng", outputPath, "-o", "callgraph.png"],
        });
        const imgcatCommand = new Deno.Command("imgcat", {
          args: ["callgraph.png"],
        });
        await dotCommand.spawn().status;
        await imgcatCommand.spawn().status;
        break;
      }
      default:
        // DOT形式で出力（デフォルト）
        await Deno.writeTextFile(
          outputPath,
          callGraph.toDot({ maxLabelLength }),
        );
        console.log(`コールグラフを ${outputPath} にDOT形式で出力しました`);
        console.log(`可視化するには: dot -Tpng ${outputPath} -o callgraph.png`);
        break;
    }

    // 統計情報の表示（verboseモードの場合）
    if (verbose) {
      const nodeCount = callGraph.getAllNodes().size;
      const callCount = callGraph.getCalls().length;
      console.log(`ノード数: ${nodeCount}`);
      console.log(`呼び出し数: ${callCount}`);

      if (maxDepth !== Infinity) {
        console.log(`深さ制限: ${maxDepth}`);
      }

      if (maxWidth !== Infinity) {
        console.log(`幅制限: ${maxWidth}`);
      }
    }
  } catch (error) {
    console.error("エラーが発生しました:", error);
    Deno.exit(1);
  }
}

// スクリプトが直接実行された場合のみメイン処理を実行
if (import.meta.main) {
  main();
}
