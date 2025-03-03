/**
 * ts-callgraph の型定義
 */

// 関数呼び出しの関係を格納する型
export type CallInfo = {
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
  isStatic?: boolean; // 静的メソッド呼び出しかどうか
  isPropertyAccess?: boolean; // プロパティアクセスかどうか
};

// ノード情報を格納する型
export type NodeInfo = {
  name: string;
  type?: string;
  sourceFile?: string;
  isExported?: boolean;
  docComment?: string;
  kind?: string; // "function", "method", "class", etc.
  isStatic?: boolean; // 静的メソッドかどうか
  parentClass?: string; // メソッドの場合、所属するクラス名
  superClass?: string; // クラスの場合、継承元のクラス名
  implementsInterfaces?: string[]; // クラスの場合、実装しているインターフェース名
};

// ファイル情報を格納する型
export type FileInfo = {
  path: string;
  functions: string[]; // ファイル内で定義された関数名のリスト
};

// 関数間の呼び出し関係を格納する型
export type FunctionCallInfo = {
  caller: string; // 呼び出し元関数名
  callee: string; // 呼び出し先関数名
  count: number; // 呼び出し回数
};

// 関数の実装から関数の呼び出し関係を格納する型
export type FunctionImplementationInfo = {
  function: string; // 関数名
  calls: string[]; // 呼び出している関数のリスト
};
