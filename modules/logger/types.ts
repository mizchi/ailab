import type { LogLevel } from "./logger.ts";

// ログエントリの型定義
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  tag: string;
  args: any[]; // すべての引数を配列として保持
  count?: number;
  caller?: string; // 呼び出し元の情報（短い形式）
  callerDetailed?: string; // 呼び出し元の情報（詳細な形式）
}

// 型付きのログエントリ
export interface TypedLogEntry<T = any> extends LogEntry {
  data?: T; // 型付きデータ
}

// 出力インターフェース
export interface LogOutput {
  log: (message: string) => void;
  error: (message: string) => void;
}

// ロガーのオプション
export interface LogOptions extends DefaultDisplayOptions {
  maxRepeat?: number; // 繰り返しメッセージをグループ化する閾値
  useHistory?: boolean; // 履歴を保存するかどうか
  filter?: (entry: LogEntry) => boolean; // フィルター関数
  output?: LogOutput; // 出力先
  display?: boolean | ((entry: LogEntry) => string); // 表示するかどうか、または表示関数
  logLevel?: LogLevel; // ログレベル（このレベル以上のログのみ表示）
  showTopics?: boolean; // カスタムトピックを表示するかどうか
}

// 一時的な設定を持つロガーインターフェース
export interface ConfigurableLogger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

// カスタムトピックロガーインターフェース
export interface TopicLogger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

// 型付きのカスタムトピックロガーインターフェース
export interface TypedTopicLogger<T> {
  debug: (message: string, data: T) => void;
  info: (message: string, data: T) => void;
  log: (message: string, data: T) => void;
  warn: (message: string, data: T) => void;
  error: (message: string, data: T) => void;
}

// ロガーインターフェース
export interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  display: (entry: LogEntry, options?: DisplayOptions) => string; // 表示用関数
  flush: <T = any>(
    displayFn?: boolean | ((entry: TypedLogEntry<T>) => string),
  ) => TypedLogEntry<T>[]; // 履歴を取得して空にする
  with: (options: DisplayOptions) => ConfigurableLogger; // 一時的な設定を適用したロガーを返す
  custom: (topic: string) => TopicLogger; // カスタムトピックロガーを作成
  topic: <T>(topic: string) => TypedTopicLogger<T>; // 型付きカスタムトピックロガーを作成
}

/**
 * 表示タイプの列挙型
 */
export enum DisplayType {
  DEFAULT = "default",
  TABLE = "table",
}

/**
 * 表示オプションのベースインターフェース
 */
export interface BaseDisplayOptions {
  type?: DisplayType;
  colorize?: boolean;
}

/**
 * デフォルト表示のオプション
 */
export interface DefaultDisplayOptions extends BaseDisplayOptions {
  type?: DisplayType.DEFAULT;
  colorizeJson?: boolean;
  maxLength?: number;
  singleLine?: boolean;
  timeOnly?: boolean;
  showTimestamp?: boolean; // タイムスタンプを表示するかどうか
  depth?: number;
  maxArrayLength?: number;
  showCaller?: boolean;
  detailedCaller?: boolean;
}

/**
 * テーブル表示のオプション
 */
export interface TableDisplayOptions extends BaseDisplayOptions {
  type: DisplayType.TABLE;
  title?: string;
  columns?: string[];
  maxColumns?: number;
  border?: boolean;
  compact?: boolean;
  maxCellWidth?: number;
  maxArrayItems?: number;
}

/**
 * 統合された表示オプション型
 */
export type DisplayOptions = DefaultDisplayOptions | TableDisplayOptions;
