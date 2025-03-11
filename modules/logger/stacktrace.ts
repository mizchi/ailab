/**
 * スタックトレース関連のユーティリティ
 *
 * このモジュールはスタックトレースの取得と整形を行う関数を提供します。
 * ロガー自身のスタックフレームを除外し、実際の呼び出し元の情報を取得します。
 */

/**
 * スタックトレース情報を表すインターフェース
 */
export interface StackFrame {
  /** ファイル名 */
  fileName: string;
  /** 行番号 */
  lineNumber: number;
  /** 列番号 */
  columnNumber: number;
  /** 関数名 */
  functionName: string;
  /** 完全なスタックフレーム文字列 */
  raw: string;
}

/**
 * 現在のスタックトレースを取得し、指定されたフレーム数だけ返す
 * @param skipFrames スキップするフレーム数（ロガー自身のフレームを除外するため）
 * @param maxFrames 取得する最大フレーム数
 * @returns スタックフレームの配列
 */
export function getStackTrace(skipFrames = 3, maxFrames = 1): StackFrame[] {
  // Error オブジェクトを作成してスタックトレースを取得
  const stack = new Error().stack;
  if (!stack) return [];

  // スタックトレースを行ごとに分割
  const lines = stack.split("\n").slice(1); // 最初の行（Error:）を除外

  // 指定されたフレーム数をスキップし、最大フレーム数まで取得
  return lines
    .slice(skipFrames, skipFrames + maxFrames)
    .map(parseStackLine)
    .filter((frame): frame is StackFrame => frame !== null);
}

/**
 * スタックトレースの行をパースしてStackFrameオブジェクトに変換する
 * @param line スタックトレースの行
 * @returns パースされたStackFrameオブジェクト、またはパース失敗時はnull
 */
function parseStackLine(line: string): StackFrame | null {
  // V8エンジンのスタックトレース形式をパース
  // 例: "    at functionName (/path/to/file.ts:123:45)"
  const v8Match = line.match(
    /^\s*at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+)|\[.+\])\)?$/,
  );

  if (v8Match) {
    const [
      ,
      functionName = "<anonymous>",
      fileName = "",
      lineStr = "0",
      columnStr = "0",
    ] = v8Match;
    return {
      fileName: fileName,
      lineNumber: parseInt(lineStr, 10),
      columnNumber: parseInt(columnStr, 10),
      functionName: functionName,
      raw: line.trim(),
    };
  }

  // パースに失敗した場合は生のテキストだけを含むオブジェクトを返す
  return {
    fileName: "",
    lineNumber: 0,
    columnNumber: 0,
    functionName: "",
    raw: line.trim(),
  };
}

/**
 * スタックフレームを短い形式でフォーマットする
 * @param frame スタックフレーム
 * @returns フォーマットされた文字列（例: "file.ts:123:45"）
 */
export function formatStackFrameShort(frame: StackFrame): string {
  if (!frame.fileName) return frame.raw;

  // ファイルパスから最後のセグメントだけを取得
  const fileName = frame.fileName.split("/").pop() || frame.fileName;
  return `${fileName}:${frame.lineNumber}:${frame.columnNumber}`;
}

/**
 * スタックフレームを詳細な形式でフォーマットする
 * @param frame スタックフレーム
 * @returns フォーマットされた文字列（例: "functionName (file.ts:123:45)"）
 */
export function formatStackFrameDetailed(frame: StackFrame): string {
  if (!frame.fileName) return frame.raw;

  // ファイルパスから最後のセグメントだけを取得
  const fileName = frame.fileName.split("/").pop() || frame.fileName;
  const functionName = frame.functionName || "<anonymous>";

  return `${functionName} (${fileName}:${frame.lineNumber}:${frame.columnNumber})`;
}

/**
 * 現在の呼び出し元の情報を短い形式で取得する
 * @returns 呼び出し元の情報（例: "file.ts:123:45"）
 */
export function getCallerInfo(): string {
  const frames = getStackTrace(3, 1);
  if (frames.length === 0) return "";

  return formatStackFrameShort(frames[0]);
}

/**
 * 現在の呼び出し元の情報を詳細な形式で取得する
 * @returns 呼び出し元の情報（例: "functionName (file.ts:123:45)"）
 */
export function getCallerInfoDetailed(): string {
  const frames = getStackTrace(3, 1);
  if (frames.length === 0) return "";

  return formatStackFrameDetailed(frames[0]);
}
