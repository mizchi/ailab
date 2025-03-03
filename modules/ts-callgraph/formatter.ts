import type { CallGraph } from "./callgraph.ts";
import type { FunctionImplementationInfo } from "./types.ts";

// 要約情報をDOT形式で出力（関数間の呼び出しのみ）
export function toFunctionCallDot(
  callGraph: CallGraph,
  options: { maxLabelLength?: number } = {},
): string {
  const maxLabelLength = options.maxLabelLength || 50; // デフォルトの最大ラベル長
  const functionCalls = callGraph.summarizeFunctionCalls();

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
    const nodeInfo = callGraph.getNode(node);
    let fillColor = "lightblue";

    if (nodeInfo?.isExported) {
      fillColor = "lightgreen";
    }

    let label = node;

    // ラベルが長すぎる場合は折り返す
    if (label.length > maxLabelLength) {
      // 適切な位置で折り返す
      let wrappedLabel = "";
      let currentLine = "";

      // ドットやスラッシュで分割して折り返す
      const parts = label.split(/[\.\/:]/);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const separator = i < parts.length - 1
          ? (label.includes(".") ? "." : "/")
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

      label = wrappedLabel;
    }

    dot += `  "${node}" [label="${label}", fillcolor=${fillColor}];\n`;
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
export function toFunctionSummaryDot(
  callGraph: CallGraph,
  options: { maxLabelLength?: number } = {},
): string {
  const maxLabelLength = options.maxLabelLength || 50; // デフォルトの最大ラベル長
  const functionImplementations = callGraph.summarizeFunctionImplementations();

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
    const nodeInfo = callGraph.getNode(node);
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
export function toFunctionSummaryText(
  callGraph: CallGraph,
  options: { maxLabelLength?: number } = {},
): string {
  const maxLabelLength = options.maxLabelLength || 80; // テキスト形式は少し長めに
  const functionImplementations = callGraph.summarizeFunctionImplementations();
  let result = "関数実装から関数の呼び出し関係の要約:\n\n";

  for (const impl of functionImplementations) {
    const nodeInfo = callGraph.getNode(impl.function);
    let functionType = "";

    if (nodeInfo?.type) {
      functionType = `: ${nodeInfo.type}`;
    }

    // 関数名と型が長すぎる場合は折り返す
    let functionLine = `${impl.function}${functionType}`;
    if (functionLine.length > maxLabelLength) {
      // 型情報を別の行に
      result += `${impl.function}\n  ${functionType}\n`;
    } else {
      result += `${functionLine}\n`;
    }

    if (impl.calls.length === 0) {
      result += "  - 呼び出している関数はありません\n";
    } else {
      for (const call of impl.calls) {
        const calleeInfo = callGraph.getNode(call);
        let calleeType = "";

        if (calleeInfo?.type) {
          calleeType = `: ${calleeInfo.type}`;
        }

        // 呼び出し先と型が長すぎる場合は折り返す
        let calleeLine = `  - ${call}${calleeType}`;
        if (calleeLine.length > maxLabelLength) {
          // 型情報を別の行に
          result += `  - ${call}\n    ${calleeType}\n`;
        } else {
          result += `${calleeLine}\n`;
        }
      }
    }

    result += "\n";
  }

  return result;
}
