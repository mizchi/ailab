/* @script */
/**
 * TypeScript Compiler APIを使ってコールグラフを生成するスクリプト
 * 関数から関数の関係を整理し、呼び出し方関係なく関数実装から関数の呼び出しとして要約する
 *
 * 使い方:
 * deno run -A poc/ts-callgraph.ts <ファイルパス> [--depth <数値>] [--output <出力ファイル>] [--format <形式>]
 *
 * 例:
 * deno run -A poc/ts-callgraph.ts poc/math.ts --output math-graph.dot
 * deno run -A poc/ts-callgraph.ts poc/callgraph-sample.ts --format function-summary
 */

import ts from "npm:typescript";
import { parse } from "https://deno.land/std/flags/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

// コマンドライン引数の解析
const flags = parse(Deno.args, {
  string: ["output", "depth", "width", "format", "ignore"],
  boolean: ["verbose", "ignore-stdlib", "ignore-npm", "ignore-jsr"],
  alias: {
    o: "output",
    d: "depth",
    w: "width",
    f: "format",
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
  },
});

// ヘルプメッセージの表示
if (flags.help || flags.h) {
  console.log(`
TypeScript コールグラフ生成ツール

使い方:
  deno run -A poc/ts-callgraph.ts <ファイルパス> [オプション]

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

  -v, --verbose              詳細なログを出力

フィルタリングオプション:
  --ignore-stdlib            標準ライブラリの呼び出しを無視 (デフォルト: true)
  --ignore-npm               npm パッケージの呼び出しを無視 (デフォルト: true)
  --ignore-jsr               JSR パッケージの呼び出しを無視 (デフォルト: true)
  -i, --ignore <パターン>    指定したパターンに一致する呼び出しを無視（カンマ区切りで複数指定可能）

  -h, --help                 このヘルプメッセージを表示

例:
  deno run -A poc/ts-callgraph.ts poc/math.ts
  deno run -A poc/ts-callgraph.ts poc/math.ts --depth 3 --output math-graph.dot
  deno run -A poc/ts-callgraph.ts poc/callgraph-sample.ts --no-ignore-stdlib
  deno run -A poc/ts-callgraph.ts poc/callgraph-sample.ts --format function-summary
  `);
  Deno.exit(0);
}

// 無視パターンの解析
const ignorePatterns: string[] = flags.ignore ? flags.ignore.split(",") : [];

// 標準ライブラリのメンバーかどうかを判定する関数
const isStdLibMember = (name: string): boolean => {
  // 標準ライブラリの代表的なオブジェクトとメソッド
  const stdLibPatterns = [
    /^console\./,
    /^Math\./,
    /^Array\./,
    /^Object\./,
    /^String\./,
    /^Number\./,
    /^Date\./,
    /^JSON\./,
    /^RegExp\./,
    /^Promise\./,
    /^Error\./,
    /^Map\./,
    /^Set\./,
    /^Symbol\./,
    /^WeakMap\./,
    /^WeakSet\./,
    /^Reflect\./,
    /^Proxy\./,
    /^Intl\./,
    /^ArrayBuffer\./,
    /^DataView\./,
    /^Int8Array\./,
    /^Uint8Array\./,
    /^Uint8ClampedArray\./,
    /^Int16Array\./,
    /^Uint16Array\./,
    /^Int32Array\./,
    /^Uint32Array\./,
    /^Float32Array\./,
    /^Float64Array\./,
    /^BigInt64Array\./,
    /^BigUint64Array\./,
  ];

  return stdLibPatterns.some((pattern) => pattern.test(name));
};

// npm パッケージからの呼び出しかどうかを判定する関数
const isNpmPackage = (name: string, sourceFile: string): boolean => {
  return sourceFile.includes("node_modules") ||
    sourceFile.includes("npm:") ||
    name.startsWith("npm:");
};

// JSR パッケージからの呼び出しかどうかを判定する関数
const isJsrPackage = (name: string, sourceFile: string): boolean => {
  return sourceFile.includes("jsr:") || name.startsWith("jsr:");
};

// ユーザー定義のパターンにマッチするかを判定する関数
const matchesIgnorePattern = (name: string): boolean => {
  if (ignorePatterns.length === 0) return false;
  return ignorePatterns.some((pattern) => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(name);
    } catch {
      // 正規表現としてのパターンが無効な場合は単純な文字列比較を行う
      return name.includes(pattern);
    }
  });
};

// 呼び出しをフィルタリングするかどうかを判定する関数
const shouldFilterCall = (callInfo: CallInfo): boolean => {
  const { callee, sourceFile } = callInfo;

  // ユーザー定義のパターンにマッチする場合
  if (matchesIgnorePattern(callee)) {
    return true;
  }

  // 標準ライブラリの場合
  if (flags["ignore-stdlib"] && isStdLibMember(callee)) {
    return true;
  }

  // npm パッケージの場合
  if (flags["ignore-npm"] && isNpmPackage(callee, sourceFile)) {
    return true;
  }

  // JSR パッケージの場合
  if (flags["ignore-jsr"] && isJsrPackage(callee, sourceFile)) {
    return true;
  }

  return false;
};

const filePath = flags._[0];
if (!filePath) {
  console.error("ファイルパスを指定してください");
  console.error(
    "使い方: deno run -A poc/ts-callgraph.ts <ファイルパス> [オプション]",
  );
  console.error("詳細については --help を参照してください");
  Deno.exit(1);
}

// 深さと幅の制限（Infinity または数値）
const maxDepth = flags.depth === "Infinity" ? Infinity : parseInt(flags.depth);
const maxWidth = flags.width === "Infinity" ? Infinity : parseInt(flags.width);

// 関数呼び出しの関係を格納する型
type CallInfo = {
  // 呼び出し元と呼び出し先
  caller: string;
  callee: string;

  // ソース情報
  sourceFile: string;
  line: number;
  column: number;

  // 型情報（あれば）
  callerType?: string;
  calleeType?: string;

  // 追加情報
  isConstructor?: boolean;
  isRecursive?: boolean;
  isMethod?: boolean;
  className?: string;
};

// ノード情報を格納する型
type NodeInfo = {
  name: string;
  type?: string;
  sourceFile?: string;
  isExported?: boolean;
  docComment?: string;
  kind?: string; // "function", "method", "class", etc.
};

// ファイル情報を格納する型
type FileInfo = {
  path: string;
  functions: string[]; // ファイル内で定義された関数名のリスト
};

// 関数間の呼び出し関係を格納する型
type FunctionCallInfo = {
  caller: string; // 呼び出し元関数名
  callee: string; // 呼び出し先関数名
  count: number; // 呼び出し回数
};

// 関数の実装から関数の呼び出し関係を格納する型
type FunctionImplementationInfo = {
  function: string; // 関数名
  calls: string[]; // 呼び出している関数のリスト
};

// コールグラフのデータ構造
class CallGraph {
  private calls: CallInfo[] = [];
  private nodes = new Map<string, NodeInfo>();
  private nodeCallCounts = new Map<string, number>(); // 各ノードからの呼び出し数をカウント

  // ノード情報へのアクセサメソッド
  getNode(name: string): NodeInfo | undefined {
    return this.nodes.get(name);
  }

  // すべてのノード情報を取得
  getAllNodes(): Map<string, NodeInfo> {
    return new Map(this.nodes);
  }

  // すべての呼び出し情報を取得
  getCalls(): CallInfo[] {
    return [...this.calls];
  }

  // フィルタリング条件に基づいて呼び出しをフィルタリング
  filterCalls(filterFn: (call: CallInfo) => boolean): void {
    this.calls = this.calls.filter((call) => !filterFn(call));

    // 使われなくなったノードを削除
    const usedNodes = new Set<string>();
    for (const call of this.calls) {
      usedNodes.add(call.caller);
      usedNodes.add(call.callee);
    }

    const allNodes = Array.from(this.nodes.keys());
    for (const nodeName of allNodes) {
      if (!usedNodes.has(nodeName)) {
        this.nodes.delete(nodeName);
      }
    }
  }

  addNode(name: string, info: Partial<NodeInfo> = {}) {
    if (!this.nodes.has(name)) {
      this.nodes.set(name, {
        name,
        ...info,
      });
    } else {
      // 既存のノード情報を拡張
      const existingInfo = this.nodes.get(name)!;
      this.nodes.set(name, { ...existingInfo, ...info });
    }
  }

  addCall(
    caller: string,
    callee: string,
    sourceFile: string,
    line: number,
    column: number,
    additionalInfo: Partial<CallInfo> = {},
  ) {
    // ノードが存在しない場合は追加
    this.addNode(caller);
    this.addNode(callee);

    // 再帰呼び出しかどうかを判定
    const isRecursive = caller === callee;

    // 呼び出し情報を追加
    this.calls.push({
      caller,
      callee,
      sourceFile,
      line,
      column,
      isRecursive,
      ...additionalInfo,
    });

    // 呼び出し数をカウント
    const currentCount = this.nodeCallCounts.get(caller) || 0;
    this.nodeCallCounts.set(caller, currentCount + 1);
  }

  // 呼び出し関係を幅の制限に従って整理
  pruneByWidth(maxWidth: number) {
    if (maxWidth === Infinity || this.calls.length <= maxWidth) return;

    // 各呼び出し元からの呼び出しをグループ化
    const callsByNode = new Map<string, CallInfo[]>();
    for (const call of this.calls) {
      if (!callsByNode.has(call.caller)) {
        callsByNode.set(call.caller, []);
      }
      callsByNode.get(call.caller)!.push(call);
    }

    // 各ノードの呼び出しを制限
    const newCalls: CallInfo[] = [];
    for (const [node, nodeCalls] of callsByNode.entries()) {
      // maxWidth以下になるように選ぶ
      const limitedCalls = nodeCalls.slice(0, maxWidth);
      newCalls.push(...limitedCalls);
    }

    this.calls = newCalls;
  }

  // Graphviz DOT形式でグラフを出力
  toDot(): string {
    let dot = "digraph CallGraph {\n";
    dot += "  node [shape=box, style=filled, fillcolor=lightblue];\n";

    // ノードの定義
    for (const [nodeName, nodeInfo] of this.nodes.entries()) {
      let label = nodeName;
      if (nodeInfo.kind) {
        label = `${nodeInfo.kind}: ${label}`;
      }
      if (nodeInfo.type) {
        label += `\\n: ${nodeInfo.type}`;
      }

      let attrs = `label="${label}"`;

      // エクスポートされている関数は特別な色で表示
      if (nodeInfo.isExported) {
        attrs += ", fillcolor=lightgreen";
      }

      dot += `  "${nodeName}" [${attrs}];\n`;
    }

    // エッジの定義
    for (const call of this.calls) {
      let edgeLabel = `Line: ${call.line}`;
      if (call.isMethod) {
        edgeLabel += " (method)";
      }
      if (call.isConstructor) {
        edgeLabel += " (constructor)";
      }
      if (call.isRecursive) {
        edgeLabel += " (recursive)";
      }

      let attrs = `label="${edgeLabel}"`;

      // 再帰呼び出しは特別なスタイルで表示
      if (call.isRecursive) {
        attrs += ", color=red, style=dashed";
      }

      dot += `  "${call.caller}" -> "${call.callee}" [${attrs}];\n`;
    }

    dot += "}\n";
    return dot;
  }

  // JSON形式でエクスポート
  toJSON(): string {
    return JSON.stringify(
      {
        nodes: Array.from(this.nodes.values()),
        calls: this.calls,
      },
      null,
      2,
    );
  }

  // ファイルと関数の関係を要約
  summarizeFilesFunctions(): FileInfo[] {
    const fileMap = new Map<string, Set<string>>();

    // 各ノードのソースファイルと関数名を収集
    for (const [nodeName, nodeInfo] of this.nodes.entries()) {
      if (
        nodeInfo.sourceFile &&
        (nodeInfo.kind === "function" || nodeInfo.kind === "method")
      ) {
        if (!fileMap.has(nodeInfo.sourceFile)) {
          fileMap.set(nodeInfo.sourceFile, new Set<string>());
        }
        fileMap.get(nodeInfo.sourceFile)!.add(nodeName);
      }
    }

    // ファイル情報の配列に変換
    return Array.from(fileMap.entries()).map(([path, functions]) => ({
      path,
      functions: Array.from(functions),
    }));
  }

  // 関数間の呼び出し関係を簡略化
  summarizeFunctionCalls(): FunctionCallInfo[] {
    const callMap = new Map<string, Map<string, number>>();

    // 関数呼び出しをカウント
    for (const call of this.calls) {
      const caller = call.caller;
      const callee = call.callee;

      if (!callMap.has(caller)) {
        callMap.set(caller, new Map<string, number>());
      }

      const calleeMap = callMap.get(caller)!;
      const currentCount = calleeMap.get(callee) || 0;
      calleeMap.set(callee, currentCount + 1);
    }

    // 呼び出し情報の配列に変換
    const result: FunctionCallInfo[] = [];
    for (const [caller, callees] of callMap.entries()) {
      for (const [callee, count] of callees.entries()) {
        result.push({
          caller,
          callee,
          count,
        });
      }
    }

    return result;
  }

  // 関数の実装から関数の呼び出し関係を要約
  summarizeFunctionImplementations(): FunctionImplementationInfo[] {
    const functionMap = new Map<string, Set<string>>();

    // 関数ごとに呼び出している関数を収集
    for (const call of this.calls) {
      const caller = call.caller;
      const callee = call.callee;

      // グローバルスコープは除外
      if (caller.startsWith("<global>")) continue;

      if (!functionMap.has(caller)) {
        functionMap.set(caller, new Set<string>());
      }

      functionMap.get(caller)!.add(callee);
    }

    // 関数実装情報の配列に変換
    return Array.from(functionMap.entries())
      .map(([func, callees]) => ({
        function: func,
        calls: Array.from(callees),
      }))
      .sort((a, b) => a.function.localeCompare(b.function));
  }

  // 要約情報をJSON形式で出力
  toSummaryJSON(): string {
    return JSON.stringify(
      {
        files: this.summarizeFilesFunctions(),
        functionCalls: this.summarizeFunctionCalls(),
      },
      null,
      2,
    );
  }

  // 要約情報をDOT形式で出力（関数間の呼び出しのみ）
  toFunctionCallDot(): string {
    const functionCalls = this.summarizeFunctionCalls();

    let dot = "digraph FunctionCallGraph {\n";
    dot += "  node [shape=box, style=filled, fillcolor=lightblue];\n";

    // ノードの定義（関数名のみ）
    const nodes = new Set<string>();
    for (const call of functionCalls) {
      nodes.add(call.caller);
      nodes.add(call.callee);
    }

    for (const node of nodes) {
      const nodeInfo = this.nodes.get(node);
      let fillColor = "lightblue";

      if (nodeInfo?.isExported) {
        fillColor = "lightgreen";
      }

      dot += `  "${node}" [label="${node}", fillcolor=${fillColor}];\n`;
    }

    // エッジの定義（呼び出し回数を表示）
    for (const call of functionCalls) {
      dot +=
        `  "${call.caller}" -> "${call.callee}" [label="calls: ${call.count}"];\n`;
    }

    dot += "}\n";
    return dot;
  }

  // 関数の実装から関数の呼び出し関係のみを簡潔に出力
  toFunctionSummaryDot(): string {
    const functionImplementations = this.summarizeFunctionImplementations();

    let dot = "digraph FunctionImplementationGraph {\n";
    dot += "  node [shape=box, style=filled];\n";

    // ノードの定義（関数名のみ）
    const nodes = new Set<string>();
    for (const impl of functionImplementations) {
      nodes.add(impl.function);
      for (const call of impl.calls) {
        nodes.add(call);
      }
    }

    for (const node of nodes) {
      const nodeInfo = this.nodes.get(node);
      let fillColor = "lightblue";
      let nodeKind = "";

      if (nodeInfo?.kind) {
        nodeKind = nodeInfo.kind;
      }

      if (nodeInfo?.isExported) {
        fillColor = "lightgreen";
      }

      // 関数の種類によって色を変える
      if (nodeKind === "function") {
        fillColor = "lightgreen";
      } else if (nodeKind === "method") {
        fillColor = "lightblue";
      } else if (nodeKind === "class") {
        fillColor = "lightyellow";
      } else if (nodeKind === "global") {
        fillColor = "lightgray";
      }

      // 関数の型情報を表示
      let label = node;
      if (nodeInfo?.type) {
        label += `\\n: ${nodeInfo.type}`;
      }

      dot += `  "${node}" [label="${label}", fillcolor=${fillColor}];\n`;
    }

    // エッジの定義（シンプルな矢印のみ）
    for (const impl of functionImplementations) {
      for (const call of impl.calls) {
        dot += `  "${impl.function}" -> "${call}";\n`;
      }
    }

    dot += "}\n";
    return dot;
  }

  // 関数の実装から関数の呼び出し関係を簡潔にテキスト形式で出力
  toFunctionSummaryText(): string {
    const functionImplementations = this.summarizeFunctionImplementations();
    let result = "関数実装から関数の呼び出し関係の要約:\n\n";

    for (const impl of functionImplementations) {
      const nodeInfo = this.nodes.get(impl.function);
      let functionType = "";

      if (nodeInfo?.type) {
        functionType = `: ${nodeInfo.type}`;
      }

      result += `${impl.function}${functionType}\n`;

      if (impl.calls.length === 0) {
        result += "  - 呼び出している関数はありません\n";
      } else {
        for (const call of impl.calls) {
          const calleeInfo = this.nodes.get(call);
          let calleeType = "";

          if (calleeInfo?.type) {
            calleeType = `: ${calleeInfo.type}`;
          }

          result += `  - ${call}${calleeType}\n`;
        }
      }
      result += "\n";
    }

    return result;
  }
}

// ファイルを読み込んでTypeScriptのプログラムを作成
function createProgram(filePath: string): ts.Program {
  const absolutePath = path.resolve(filePath as string);

  // TypeScriptのコンパイラオプション
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowJs: true,
    checkJs: true,
  };

  // プログラムの作成
  const program = ts.createProgram([absolutePath], compilerOptions);
  return program;
}

// ソースファイルからコールグラフを生成
function generateCallGraph(
  program: ts.Program,
  maxDepth: number = Infinity,
  verbose: boolean = false,
): CallGraph {
  const callGraph = new CallGraph();
  const typeChecker = program.getTypeChecker();

  // 処理済みのノードパスを保存（再帰制限のため）
  const visitedNodes = new Set<string>();

  // ノードの深さを追跡
  const nodeDepth = new Map<string, number>();

  // ソースファイルを巡回
  for (const sourceFile of program.getSourceFiles()) {
    // 外部ライブラリは除外
    if (sourceFile.isDeclarationFile) continue;

    // ファイルパスをログ出力
    if (verbose) {
      console.log(`Processing file: ${sourceFile.fileName}`);
    }

    // 型情報や追加情報を取得するヘルパー関数
    function getNodeTypeString(node: ts.Node): string | undefined {
      try {
        const type = typeChecker.getTypeAtLocation(node);
        return typeChecker.typeToString(type);
      } catch (e) {
        return undefined;
      }
    }

    function getDocComment(node: ts.Node): string | undefined {
      const commentRanges = ts.getLeadingCommentRanges(
        sourceFile.text,
        node.getFullStart(),
      );

      if (!commentRanges || commentRanges.length === 0) {
        return undefined;
      }

      return commentRanges
        .map((range) => {
          const comment = sourceFile.text.substring(range.pos, range.end);
          return comment.startsWith("/*")
            ? comment.replace(/^\/\*\*?/, "").replace(/\*\/$/, "").trim()
            : comment.replace(/^\/\/\s*/, "").trim();
        })
        .join("\n");
    }

    function isNodeExported(node: ts.Declaration): boolean {
      // Deferred function to check if node has export modifier
      const modifiers = ts.canHaveModifiers(node)
        ? ts.getModifiers(node)
        : undefined;

      if (modifiers) {
        for (const modifier of modifiers) {
          if (modifier.kind === ts.SyntaxKind.ExportKeyword) {
            return true;
          }
        }
      }

      // Check if parent is export declaration
      const parent = node.parent;
      return ts.isSourceFile(parent) ||
        (ts.isModuleBlock(parent) && ts.isModuleDeclaration(parent.parent) &&
          !!parent.parent.name);
    }

    // ノードの巡回
    function visit(
      node: ts.Node,
      currentScope: string | undefined,
      depth: number = 0,
    ) {
      // 最大深さのチェック
      if (depth > maxDepth) {
        return;
      }

      // クラス、インターフェース、型エイリアスなどを検出
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        const isExported = isNodeExported(node);
        const docComment = getDocComment(node);

        callGraph.addNode(className, {
          kind: "class",
          isExported,
          docComment,
          sourceFile: sourceFile.fileName,
        });

        // クラスのメンバーを処理
        for (const member of node.members) {
          if (ts.isMethodDeclaration(member) && member.name) {
            let methodName = `${className}.`;

            if (ts.isIdentifier(member.name)) {
              methodName += member.name.text;
            } else {
              methodName += "<computed>";
            }

            const docComment = getDocComment(member);
            const typeString = getNodeTypeString(member);

            callGraph.addNode(methodName, {
              kind: "method",
              type: typeString,
              docComment,
              sourceFile: sourceFile.fileName,
              isExported,
            });

            // メソッド本体を処理
            if (member.body) {
              const prevScope = currentScope;
              currentScope = methodName;
              nodeDepth.set(currentScope, depth);
              ts.forEachChild(
                member.body,
                (n) => visit(n, currentScope, depth + 1),
              );
              currentScope = prevScope;
            }
          }
        }
      }

      // 関数宣言、関数式、アロー関数などを検出
      if (
        ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)
      ) {
        // 関数名の取得
        let functionName: string;
        let isExported = false;

        if (ts.isFunctionDeclaration(node)) {
          if (node.name) {
            functionName = node.name.text;
            isExported = isNodeExported(node);
          } else {
            // 無名関数の場合は位置情報を名前にする
            const { line, character } = sourceFile
              .getLineAndCharacterOfPosition(node.getStart());
            functionName = `anonymous_${
              sourceFile.fileName.split("/").pop()
            }_${line}_${character}`;
          }
        } else if (ts.isFunctionExpression(node) && node.name) {
          functionName = node.name.text;
        } else {
          // 無名関数の場合は位置情報を名前にする
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(),
          );
          functionName = `anonymous_${
            sourceFile.fileName.split("/").pop()
          }_${line}_${character}`;
        }

        // 型情報を取得
        const typeString = getNodeTypeString(node);
        const docComment = getDocComment(node);

        // ノード情報を追加
        callGraph.addNode(functionName, {
          kind: "function",
          type: typeString,
          isExported,
          docComment,
          sourceFile: sourceFile.fileName,
        });

        // 関数スコープを更新して子ノードを巡回
        const prevScope = currentScope;
        currentScope = functionName;
        nodeDepth.set(currentScope, depth);

        // 再帰呼び出しの制限
        const nodePath = `${sourceFile.fileName}:${functionName}`;
        if (!visitedNodes.has(nodePath)) {
          visitedNodes.add(nodePath);

          if (node.body) {
            ts.forEachChild(
              node.body,
              (n) => visit(n, currentScope, depth + 1),
            );
          }

          visitedNodes.delete(nodePath);
        }

        currentScope = prevScope;
        return;
      }

      // 現在のスコープがない場合はグローバルスコープとして扱う
      if (!currentScope) {
        currentScope = `<global>_${sourceFile.fileName.split("/").pop()}`;
        nodeDepth.set(currentScope, 0);
        callGraph.addNode(currentScope, {
          kind: "global",
          sourceFile: sourceFile.fileName,
        });
      }

      // 関数呼び出しを検出
      if (ts.isCallExpression(node)) {
        let calleeName: string;
        let isMethod = false;
        let isConstructor = false;
        let className: string | undefined;

        // 呼び出される関数の名前を取得
        const expr = node.expression;

        if (ts.isIdentifier(expr)) {
          calleeName = expr.text;
        } else if (
          ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)
        ) {
          // obj.method() のような呼び出し
          isMethod = true;
          calleeName = expr.name.text;

          // 可能ならオブジェクト名も追加
          if (ts.isIdentifier(expr.expression)) {
            className = expr.expression.text;
            calleeName = `${className}.${calleeName}`;
          }
        } else if (ts.isNewExpression(expr)) {
          // new Class() のようなコンストラクタ呼び出し
          isConstructor = true;

          if (ts.isIdentifier(expr.expression)) {
            calleeName = expr.expression.text;
            className = calleeName;
          } else {
            const { line, character } = sourceFile
              .getLineAndCharacterOfPosition(expr.getStart());
            calleeName = `<constructor>_${line}_${character}`;
          }
        } else {
          // 複雑な呼び出しの場合
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            expr.getStart(),
          );
          calleeName = `<complex>_${line}_${character}`;
        }

        // 呼び出し情報の準備
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(),
        );
        const calleeType = getNodeTypeString(expr);
        const callerType = currentScope
          ? callGraph.getNode(currentScope)?.type
          : undefined;

        // 呼び出し情報をグラフに追加
        callGraph.addCall(
          currentScope,
          calleeName,
          sourceFile.fileName,
          line + 1,
          character + 1,
          {
            isMethod,
            isConstructor,
            className,
            callerType: callerType as string | undefined,
            calleeType,
          },
        );
      }

      // 子ノードを再帰的に巡回
      ts.forEachChild(node, (n) => visit(n, currentScope, depth + 1));
    }

    // ファイルのルートから巡回を開始
    visit(sourceFile, undefined);
  }

  return callGraph;
}

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
      callGraph.filterCalls(shouldFilterCall);
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

      case "function-call":
        // 関数間の呼び出し関係のみをDOT形式で出力
        await Deno.writeTextFile(outputPath, callGraph.toFunctionCallDot());
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

      case "function-summary":
        // 関数の実装から関数の呼び出し関係のみを出力
        await Deno.writeTextFile(outputPath, callGraph.toFunctionSummaryDot());
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
          callGraph.toFunctionSummaryText(),
        );
        console.log(`関数実装の要約を ${textSummaryPath} に出力しました`);
        break;

      default:
        // DOT形式で出力（デフォルト）
        await Deno.writeTextFile(outputPath, callGraph.toDot());
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
  }
}

// スクリプトが直接実行された場合のみメイン処理を実行
if (import.meta.main) {
  main();
}

/// test
import { expect } from "jsr:@std/expect";
import { test } from "jsr:@std/testing/bdd";

test("CallGraph クラスが正しく動作する", () => {
  const graph = new CallGraph();

  graph.addCall("main", "helper", "test.ts", 10, 5);
  graph.addCall("helper", "util", "test.ts", 15, 3);

  const dot = graph.toDot();

  expect(dot).toContain("main");
  expect(dot).toContain("helper");
  expect(dot).toContain("util");
  expect(dot).toContain("main" + '" -> "' + "helper");
  expect(dot).toContain("helper" + '" -> "' + "util");
});

test("関数実装の要約が正しく動作する", () => {
  const graph = new CallGraph();

  // ノード情報を追加
  graph.addNode("main", { kind: "function", type: "() => void" });
  graph.addNode("helper", { kind: "function", type: "(x: number) => number" });
  graph.addNode("util", { kind: "function", type: "(s: string) => string" });

  // 呼び出し情報を追加
  graph.addCall("main", "helper", "test.ts", 10, 5);
  graph.addCall("main", "util", "test.ts", 11, 3);
  graph.addCall("helper", "util", "test.ts", 15, 3);

  // 関数実装の要約を取得
  const summary = graph.summarizeFunctionImplementations();

  // 期待される結果
  expect(summary.length).toBe(2);

  // main関数の呼び出し
  const mainImpl = summary.find((impl) => impl.function === "main");
  expect(mainImpl).toBeDefined();
  expect(mainImpl?.calls).toContain("helper");
  expect(mainImpl?.calls).toContain("util");

  // helper関数の呼び出し
  const helperImpl = summary.find((impl) => impl.function === "helper");
  expect(helperImpl).toBeDefined();
  expect(helperImpl?.calls).toContain("util");

  // DOT形式の出力をテスト
  const dot = graph.toFunctionSummaryDot();
  expect(dot).toContain("main");
  expect(dot).toContain("helper");
  expect(dot).toContain("util");
  expect(dot).toContain("main" + '" -> "' + "helper");
  expect(dot).toContain("main" + '" -> "' + "util");
  expect(dot).toContain("helper" + '" -> "' + "util");

  // テキスト形式の出力をテスト
  const text = graph.toFunctionSummaryText();
  expect(text).toContain("main: () => void");
  expect(text).toContain("helper: (x: number) => number");
  expect(text).toContain("util: (s: string) => string");
});
