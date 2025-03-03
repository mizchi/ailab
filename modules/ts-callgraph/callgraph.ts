import type {
  CallInfo,
  FileInfo,
  FunctionCallInfo,
  FunctionImplementationInfo,
  NodeInfo,
} from "./types.ts";

// コールグラフのデータ構造
export class CallGraph {
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
  toDot(options: { maxLabelLength?: number } = {}): string {
    const maxLabelLength = options.maxLabelLength || 50; // デフォルトの最大ラベル長

    let dot = "digraph CallGraph {\n";
    dot += "  // グラフの設定\n";
    dot += "  node [shape=box, style=filled, fillcolor=lightblue];\n\n";

    // レイアウト設定を追加
    dot += "  // レイアウト設定\n";
    dot += "  rankdir=LR;       // 左から右へのレイアウト\n";
    dot += "  concentrate=true; // エッジの集約\n";
    dot += "  splines=ortho;    // 直角の線でエッジを描画\n";
    dot += "  nodesep=0.5;      // 同じランク内のノード間の距離\n";
    dot += "  ranksep=1.0;      // ランク間の距離\n";
    dot += "  overlap=false;    // ノードの重なりを避ける\n\n";

    dot += "  compound=true; // サブグラフ間のエッジを許可\n\n";
    dot += "  // ラベルの折り返し設定\n";
    dot += `  graph [fontsize=10, newrank=true];\n`;
    dot += `  node [fontsize=10, width=0, height=0, margin=0.1, shape=box];\n`;
    dot += `  edge [fontsize=8];\n\n`;

    // 表示するノードをフィルタリング
    const filteredNodes = new Map<string, NodeInfo>();
    for (const [nodeName, nodeInfo] of this.nodes.entries()) {
      // private メソッドは表示しない
      if (nodeInfo.kind === "method" && nodeName.includes("private")) {
        continue;
      }

      // export されていないトップレベルのシンボルは表示しない
      if (
        !nodeInfo.isExported &&
        !nodeName.includes(".") && // クラスメンバーは除外
        nodeInfo.kind !== "class" && // クラスは常に表示
        nodeInfo.kind !== "global"
      ) { // グローバルスコープは表示
        continue;
      }

      filteredNodes.set(nodeName, nodeInfo);
    }

    // ファイルごとにグループ化
    const fileNodes = new Map<string, string[]>();
    for (const [nodeName, nodeInfo] of filteredNodes.entries()) {
      if (nodeInfo.sourceFile) {
        const fileName = nodeInfo.sourceFile.split("/").pop() ||
          nodeInfo.sourceFile;
        if (!fileNodes.has(fileName)) {
          fileNodes.set(fileName, []);
        }
        fileNodes.get(fileName)!.push(nodeName);
      }
    }

    // ファイルごとにサブグラフを作成
    for (const [fileName, nodes] of fileNodes.entries()) {
      dot += `  // ${fileName} ファイルのシンボル\n`;
      dot += `  subgraph "cluster_file_${fileName}" {\n`;
      dot += `    label="${fileName}";\n`;
      dot += `    style=filled;\n`;
      dot += `    fillcolor=aliceblue;\n`;

      for (const nodeName of nodes) {
        // クラスメンバーはクラスのサブグラフに含まれるので、ここでは出力しない
        if (!nodeName.includes(".")) {
          dot += `    "${nodeName}";\n`;
        }
      }

      dot += `  }\n\n`;
    }

    // サブグラフの定義（クラスごとにグループ化）
    const classMethods = new Map<string, string[]>();

    for (const [nodeName, nodeInfo] of filteredNodes.entries()) {
      if (
        nodeInfo.kind === "method" || nodeInfo.kind === "constructor" ||
        nodeInfo.kind === "property"
      ) {
        if (nodeInfo.parentClass) {
          if (!classMethods.has(nodeInfo.parentClass)) {
            classMethods.set(nodeInfo.parentClass, []);
          }
          classMethods.get(nodeInfo.parentClass)!.push(nodeName);
        }
      }
    }

    // クラスごとにサブグラフを作成
    for (const [className, methods] of classMethods.entries()) {
      dot += `  // ${className} クラスのメンバー\n`;
      dot += `  subgraph "cluster_${className}" {\n`;
      dot += `    label="${className}";\n`;
      dot += `    style=filled;\n`;
      dot += `    fillcolor=lightyellow;\n`;

      for (const method of methods) {
        dot += `    "${method}";\n`;
      }

      dot += `  }\n\n`;
    }

    // ノードの定義
    for (const [nodeName, nodeInfo] of filteredNodes.entries()) {
      let label = nodeName;

      if (nodeInfo.kind) {
        // ノードの種類に応じてラベルを調整
        if (nodeInfo.kind === "method" || nodeInfo.kind === "property") {
          // メソッド名だけを表示（クラス名は省略）
          const parts = nodeName.split(".");
          if (parts.length > 1) {
            label = parts[parts.length - 1];

            // 静的メソッド/プロパティの場合は static を追加
            if (nodeInfo.isStatic) {
              label = `static ${label}`;
            }

            label = `${nodeInfo.kind}: ${label}`;
          } else {
            label = `${nodeInfo.kind}: ${label}`;
          }
        } else if (nodeInfo.kind === "constructor") {
          label = "constructor";
        } else {
          label = `${nodeInfo.kind}: ${label}`;
        }
      }

      if (nodeInfo.type) {
        label += `\\n: ${nodeInfo.type}`;
      }

      // ラベルが長すぎる場合は折り返す
      if (label.length > maxLabelLength) {
        // 適切な位置で折り返す
        let wrappedLabel = "";
        let currentLine = "";

        const words = label.split(" ");
        for (const word of words) {
          if (currentLine.length + word.length + 1 > maxLabelLength) {
            wrappedLabel += currentLine + "\\n";
            currentLine = word;
          } else {
            currentLine += (currentLine ? " " : "") + word;
          }
        }

        if (currentLine) {
          wrappedLabel += currentLine;
        }

        label = wrappedLabel;
      }

      let attrs = `label="${label}"`;

      // ノードの種類に応じて色を変える
      if (nodeInfo.kind === "class") {
        attrs += ", fillcolor=lightyellow, shape=ellipse";
      } else if (nodeInfo.kind === "method") {
        if (nodeInfo.isStatic) {
          attrs += ", fillcolor=lightcyan";
        } else {
          attrs += ", fillcolor=lightblue";
        }
      } else if (nodeInfo.kind === "constructor") {
        attrs += ", fillcolor=lightpink";
      } else if (nodeInfo.kind === "property") {
        if (nodeInfo.isStatic) {
          attrs += ", fillcolor=lightgrey";
        } else {
          attrs += ", fillcolor=lightgrey";
        }
      } else if (nodeInfo.isExported) {
        attrs += ", fillcolor=lightgreen";
      }

      dot += `  "${nodeName}" [${attrs}];\n`;
    }

    // クラス継承関係のエッジを追加
    dot += "\n  // クラス継承関係\n\n";

    // クラスノードと継承関係を明示的に追加
    const classNodes: { name: string; node: NodeInfo }[] = [];
    for (const [nodeName, nodeInfo] of filteredNodes.entries()) {
      if (nodeInfo.kind === "class") {
        classNodes.push({ name: nodeName, node: nodeInfo });
      }
    }

    // 継承関係を追加
    for (const { name: className, node: classInfo } of classNodes) {
      if (classInfo.superClass && filteredNodes.has(classInfo.superClass)) {
        // 継承関係を追加
        dot +=
          `  "${className}" -> "${classInfo.superClass}" [style=dashed, color=blue, label="extends"];\n`;
      }

      if (
        classInfo.implementsInterfaces &&
        classInfo.implementsInterfaces.length > 0
      ) {
        // インターフェース実装関係を追加
        for (const interfaceName of classInfo.implementsInterfaces) {
          if (filteredNodes.has(interfaceName)) {
            dot +=
              `  "${className}" -> "${interfaceName}" [style=dotted, color=green, label="implements"];\n`;
          }
        }
      }
    }

    dot += "\n  // 関数呼び出し\n";

    // エッジの定義
    const filteredCalls: CallInfo[] = [];

    // 表示するノード間の呼び出しのみをフィルタリング
    for (const call of this.calls) {
      if (filteredNodes.has(call.caller) && filteredNodes.has(call.callee)) {
        filteredCalls.push(call);
      }
    }

    // エッジの定義
    for (const call of filteredCalls) {
      let edgeLabel = `Line: ${call.line}`;

      if (call.isMethod) {
        if (call.isStatic) {
          edgeLabel += " (static method)";
        } else {
          edgeLabel += " (method)";
        }
      }

      if (call.isConstructor) {
        edgeLabel += " (constructor)";
      }

      if (call.isPropertyAccess) {
        edgeLabel += " (property)";
      }

      if (call.isRecursive) {
        edgeLabel += " (recursive)";
      }

      // エッジラベルが長すぎる場合は折り返す
      if (edgeLabel.length > maxLabelLength / 2) {
        edgeLabel = edgeLabel.substring(0, maxLabelLength / 2) + "...";
      }

      let attrs = `label="${edgeLabel}"`;

      // 呼び出しの種類に応じてスタイルを変える
      if (call.isPropertyAccess) {
        attrs += ", color=grey, style=dotted";
      } else if (call.isConstructor) {
        attrs += ", color=red";
      } else if (call.isMethod && call.isStatic) {
        attrs += ", color=blue";
      } else if (call.isMethod) {
        attrs += ", color=green";
      } else if (call.isRecursive) {
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
  toFunctionCallDot(options: { maxLabelLength?: number } = {}): string {
    const maxLabelLength = options.maxLabelLength || 50; // デフォルトの最大ラベル長
    const functionCalls = this.summarizeFunctionCalls();

    let dot = "digraph FunctionCallGraph {\n";
    dot +=
      "  node [shape=box, style=filled, fillcolor=lightblue, fontsize=10, width=0, height=0, margin=0.1];\n";
    dot += "  graph [fontsize=10, nodesep=0.8, ranksep=1.0, newrank=true];\n";
    dot += "  edge [fontsize=8];\n";

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

      // ノード名が長すぎる場合は折り返す
      let nodeLabel = node;
      if (nodeLabel.length > maxLabelLength) {
        // 適切な位置で折り返す
        let wrappedLabel = "";
        let currentLine = "";

        // ドットやスラッシュで分割して折り返す
        const parts = nodeLabel.split(/[\.\/:]/);
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const separator = i < parts.length - 1
            ? (nodeLabel.includes(".") ? "." : "/")
            : "";

          if (
            currentLine.length + part.length + separator.length > maxLabelLength
          ) {
            wrappedLabel += currentLine + "\\n";
            currentLine = part + separator;
          } else {
            currentLine += part + separator;
          }
        }

        if (currentLine) {
          wrappedLabel += currentLine;
        }

        nodeLabel = wrappedLabel;
      }

      dot += `  "${node}" [label="${nodeLabel}", fillcolor=${fillColor}];\n`;
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
  toFunctionSummaryDot(options: { maxLabelLength?: number } = {}): string {
    const maxLabelLength = options.maxLabelLength || 50; // デフォルトの最大ラベル長
    const functionImplementations = this.summarizeFunctionImplementations();

    let dot = "digraph FunctionImplementationGraph {\n";
    dot +=
      "  node [shape=box, style=filled, fontsize=10, width=0, height=0, margin=0.1];\n";
    dot += "  graph [fontsize=10, nodesep=0.8, ranksep=1.0, newrank=true];\n";
    dot += "  edge [fontsize=8];\n";

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
      let nodeKind: string | undefined = "";

      if (nodeInfo) {
        nodeKind = nodeInfo.kind;

        // 関数の種類によって色を変える
        if (nodeKind === "function") {
          fillColor = "lightgreen";
        } else if (nodeKind === "method") {
          if (nodeInfo.isStatic) {
            fillColor = "lightcyan";
          } else {
            fillColor = "lightblue";
          }
        } else if (nodeKind === "constructor") {
          fillColor = "lightpink";
        } else if (nodeKind === "property") {
          fillColor = "lightgrey";
        } else if (nodeKind === "class") {
          fillColor = "lightyellow";
        } else if (nodeKind === "global") {
          fillColor = "lightgray";
        } else if (nodeInfo.isExported) {
          fillColor = "lightgreen";
        }
      }

      // 関数の型情報を表示
      let label = node;

      // メソッドの場合はクラス名を省略
      if (
        nodeInfo?.kind === "method" || nodeInfo?.kind === "constructor" ||
        nodeInfo?.kind === "property"
      ) {
        const parts = node.split(".");
        if (parts.length > 1) {
          let memberName = parts[parts.length - 1];

          if (nodeInfo.kind === "method" || nodeInfo.kind === "property") {
            // 静的メソッド/プロパティの場合は static を追加
            if (nodeInfo.isStatic) {
              memberName = `static ${memberName}`;
            }

            label = `${parts[0]}.${memberName}`;
          } else if (nodeInfo.kind === "constructor") {
            label = `${parts[0]}.constructor`;
          }
        }
      }

      if (nodeInfo?.type) {
        label += `\\n: ${nodeInfo.type}`;
      }

      // ラベルが長すぎる場合は折り返す
      if (label.length > maxLabelLength) {
        // 適切な位置で折り返す
        let wrappedLabel = "";
        let currentLine = "";

        const words = label.split(" ");
        for (const word of words) {
          if (currentLine.length + word.length + 1 > maxLabelLength) {
            wrappedLabel += currentLine + "\\n";
            currentLine = word;
          } else {
            currentLine += (currentLine ? " " : "") + word;
          }
        }

        if (currentLine) {
          wrappedLabel += currentLine;
        }

        label = wrappedLabel;
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
      let functionKind = ""; // デフォルト値を空文字列に設定
      let isStatic = false;
      let parentClass: string | undefined = "";

      if (nodeInfo) {
        if (nodeInfo.type) {
          functionType = `: ${nodeInfo.type}`;
        }

        // nodeInfo.kind が undefined の場合は空文字列のままになる
        functionKind = nodeInfo.kind || "";

        if (nodeInfo.isStatic) {
          isStatic = true;
        }

        // nodeInfo.parentClass が undefined の場合は空文字列のままになる
        parentClass = nodeInfo.parentClass;
      }

      // 関数の種類に応じて表示を変える
      let functionDisplay = impl.function;

      if (
        functionKind === "method" || functionKind === "constructor" ||
        functionKind === "property"
      ) {
        const parts = impl.function.split(".");
        if (parts.length > 1) {
          const className = parentClass || parts[0];
          const memberName = parts[1];

          if (functionKind === "method") {
            functionDisplay = isStatic
              ? `${className}.static ${memberName}`
              : `${className}.${memberName}`;
          } else if (functionKind === "constructor") {
            functionDisplay = `${className}.constructor`;
          } else if (functionKind === "property") {
            functionDisplay = isStatic
              ? `${className}.static ${memberName} (property)`
              : `${className}.${memberName} (property)`;
          }
        }
      } else if (functionKind === "class") {
        // クラスの場合は継承関係を表示
        if (nodeInfo?.superClass) {
          functionDisplay += ` extends ${nodeInfo.superClass}`;
        }

        if (
          nodeInfo?.implementsInterfaces &&
          nodeInfo.implementsInterfaces.length > 0
        ) {
          functionDisplay += ` implements ${
            nodeInfo.implementsInterfaces.join(", ")
          }`;
        }
      }

      result += `${functionDisplay}${functionType}\n`;

      if (impl.calls.length === 0) {
        result += "  - 呼び出している関数はありません\n";
      } else {
        for (const call of impl.calls) {
          const calleeInfo = this.nodes.get(call);
          let calleeType = "";
          let calleeKind = ""; // デフォルト値を空文字列に設定
          let isCalleeStatic = false;

          if (calleeInfo) {
            if (calleeInfo.type) {
              calleeType = `: ${calleeInfo.type}`;
            }

            // calleeInfo.kind が undefined の場合は空文字列のままになる
            calleeKind = calleeInfo.kind || "";

            if (calleeInfo.isStatic) {
              isCalleeStatic = true;
            }
          }

          // 呼び出し先の種類に応じて表示を変える
          let calleeDisplay = call;

          if (
            calleeKind === "method" || calleeKind === "constructor" ||
            calleeKind === "property"
          ) {
            const parts = call.split(".");
            if (parts.length > 1) {
              const className = parts[0];
              const memberName = parts[1];

              if (calleeKind === "method") {
                calleeDisplay = isCalleeStatic
                  ? `${className}.static ${memberName}`
                  : `${className}.${memberName}`;
              } else if (calleeKind === "constructor") {
                calleeDisplay = `${className}.constructor`;
              } else if (calleeKind === "property") {
                calleeDisplay = isCalleeStatic
                  ? `${className}.static ${memberName} (property)`
                  : `${className}.${memberName} (property)`;
              }
            }
          }

          result += `  - ${calleeDisplay}${calleeType}\n`;
        }
      }
      result += "\n";
    }

    return result;
  }
}
