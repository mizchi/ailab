// ロガーライブラリ
// 機能:
// - debug, info, error の各レベルでログを出力
// - 各レベルで色分け
// - 繰り返しメッセージのグループ化
// - オプションで履歴保存
// - フィルター機能
// - JSON構造体の色付け
// - 最大文字数制限
// - フォーマット関数
// - flush機能
// - テーブル表示

import { getCallerInfo, getCallerInfoDetailed } from "./stacktrace.ts";
import type {
  ConfigurableLogger,
  DefaultDisplayOptions,
  DisplayOptions,
  LogEntry,
  Logger,
  LogOptions,
  TopicLogger,
  TypedLogEntry,
  TypedTopicLogger,
} from "./types.ts";
import { displayLogEntry, getColorByTag } from "./display.ts";

// ログレベルの定義（優先度順）
export enum LogLevel {
  DEBUG = "debug", // 最も詳細なレベル
  INFO = "info", // 情報レベル
  LOG = "log", // 通常のログレベル
  WARN = "warn", // 警告レベル
  ERROR = "error", // エラーレベル（最も重要なレベル）
}

// ログレベルの数値マッピング（比較用）
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0, // 最も低い優先度
  [LogLevel.INFO]: 1,
  [LogLevel.LOG]: 2,
  [LogLevel.WARN]: 3,
  [LogLevel.ERROR]: 4, // 最も高い優先度
};

// 文字列からLogLevelへの変換
export function parseLogLevel(level: string): LogLevel {
  const normalizedLevel = level.toLowerCase();

  switch (normalizedLevel) {
    case "debug":
      return LogLevel.DEBUG;
    case "info":
      return LogLevel.INFO;
    case "log":
      return LogLevel.LOG;
    case "warn":
      return LogLevel.WARN;
    case "error":
      return LogLevel.ERROR;
    default:
      return LogLevel.ERROR; // デフォルトはエラーレベル
  }
}

// 環境変数からログレベルを取得する関数（テスト時のエラーを回避するため条件付きで実行）
function getEnvLogLevel(): LogLevel {
  try {
    // Denoの環境変数にアクセスできる場合
    const permissions = Deno.permissions.querySync({ name: "env" });
    if (permissions.state !== "granted") {
      return LogLevel.INFO;
    }
    return parseLogLevel(Deno.env.get("LOG") ?? "info");
  } catch (e) {
    // 環境変数にアクセスできない場合（テスト時など）
    return LogLevel.ERROR;
  }
}

// 現在のログレベル（環境変数から取得、デフォルトはERROR）
export const CURRENT_LOG_LEVEL = getEnvLogLevel();

/**
 * ロガーを作成する
 * @param tag ログに付けるタグ
 * @param options ロガーのオプション
 * @returns ロガーインスタンス
 */
export function createLogger(tag: string, options: LogOptions = {}): Logger {
  // デフォルトオプション
  const {
    maxRepeat = 0,
    useHistory = false,
    filter = () => true,
    output = {
      log: console.log,
      error: console.error,
    },
    colorizeJson = true,
    maxLength = 0,
    singleLine = false,
    timeOnly = true,
    display = true, // デフォルトは表示する
    logLevel = CURRENT_LOG_LEVEL, // デフォルトは環境変数から取得したレベル
    showTopics = false, // デフォルトはカスタムトピックを表示しない
  } = options;

  // 表示オプション
  const displayOptions: DisplayOptions = {
    colorizeJson,
    maxLength,
    singleLine,
    timeOnly,
    showTimestamp: options.showTimestamp || false,
    depth: options.depth,
    maxArrayLength: options.maxArrayLength,
    showCaller: options.showCaller || false,
    detailedCaller: options.detailedCaller || false,
  };

  // 履歴保存用の配列
  const history: LogEntry[] = [];

  // 最後のログエントリを追跡
  let lastEntry: LogEntry | null = null;
  let repeatCount = 1;

  // 表示関数の決定
  let displayFunction: ((entry: LogEntry) => string) | null = null;
  if (display === true) {
    // デフォルトの表示関数を使用
    displayFunction = (entry) => displayLogEntry(entry, displayOptions);
  } else if (typeof display === "function") {
    // カスタム表示関数を使用
    displayFunction = display;
  } else {
    // 表示しない
    displayFunction = null;
  }

  // ログを出力する関数
  function log(level: LogLevel, ...args: any[]): void {
    const timestamp = new Date();
    const entry: LogEntry = {
      timestamp,
      level,
      tag,
      args,
      caller: getCallerInfo(),
      callerDetailed: getCallerInfoDetailed(),
    };

    // 履歴に追加
    if (useHistory) {
      history.push(entry);
    }

    // ログレベルをチェック
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[logLevel]) {
      return;
    }

    // フィルターをチェック
    if (!filter(entry)) {
      return;
    }

    // 繰り返しメッセージの処理（引数が同じ場合のみ）
    if (
      lastEntry &&
      lastEntry.level === level &&
      JSON.stringify(lastEntry.args) === JSON.stringify(args) &&
      maxRepeat > 0
    ) {
      repeatCount++;

      // 繰り返し回数が閾値を超えたら、カウント付きで出力
      if (repeatCount === maxRepeat + 1) {
        const countedEntry = { ...lastEntry, count: repeatCount };
        outputEntry(countedEntry);
      } else if (repeatCount > maxRepeat + 1) {
        // 前回の出力を更新
        const countedEntry = { ...lastEntry, count: repeatCount };
        outputEntry(countedEntry);
      }
    } else {
      // 新しいメッセージの場合

      // 前のメッセージが繰り返されていた場合、最終的なカウントを出力
      if (lastEntry && repeatCount > 1 && maxRepeat > 0) {
        const countedEntry = { ...lastEntry, count: repeatCount };
        outputEntry(countedEntry);
      }

      repeatCount = 1;
      outputEntry(entry);
      lastEntry = entry;
    }
  }

  // エントリを出力する関数
  function outputEntry(entry: LogEntry): void {
    // 表示関数がnullの場合は表示しない
    if (displayFunction === null) {
      return;
    }

    const { level, tag } = entry;

    // エントリをフォーマット
    let formattedMessage = displayFunction(entry);

    // タグに基づいて色を選択
    const colorFn = getColorByTag(tag);

    // メッセージを分割してプレフィックス部分のみに色を適用
    // タイムスタンプがある場合とない場合の両方に対応
    const prefixMatch = formattedMessage.match(
      /^(?:(\d+:\d+:\d+\s+))?(\[\w+\](?:\s+\[[^\]]+\])?)/,
    );

    if (prefixMatch) {
      const timestamp = prefixMatch[1] || "";
      const tagPart = prefixMatch[2];
      const prefix = timestamp + tagPart;
      const rest = formattedMessage.substring(prefix.length);

      // プレフィックスに色を適用（タイムスタンプはそのまま、タグ部分のみ色付け）
      const coloredPrefix = timestamp + colorFn(tagPart);

      // レベルに応じた出力
      switch (level) {
        case LogLevel.DEBUG:
          output.log(coloredPrefix + rest);
          break;
        case LogLevel.INFO:
          output.log(coloredPrefix + rest);
          break;
        case LogLevel.LOG:
          output.log(coloredPrefix + rest);
          break;
        case LogLevel.WARN:
          output.log(coloredPrefix + rest);
          break;
        case LogLevel.ERROR:
          output.error(coloredPrefix + rest);
          break;
      }
    } else {
      // プレフィックスが見つからない場合は従来通りの処理
      switch (level) {
        case LogLevel.DEBUG:
          output.log(formattedMessage);
          break;
        case LogLevel.INFO:
          output.log(formattedMessage);
          break;
        case LogLevel.LOG:
          output.log(formattedMessage);
          break;
        case LogLevel.WARN:
          output.log(formattedMessage);
          break;
        case LogLevel.ERROR:
          output.error(formattedMessage);
          break;
      }
    }
  }

  // 履歴を取得して空にする関数
  function flush(
    displayFn?: boolean | ((entry: LogEntry) => string),
  ): LogEntry[] {
    const currentHistory = [...history];

    // 履歴を空にする
    history.length = 0;

    // 表示処理
    if (displayFn !== undefined) {
      // 一時的な表示関数を決定
      let tempDisplayFunction: ((entry: LogEntry) => string) | null = null;
      if (displayFn === true) {
        // デフォルトの表示関数を使用
        tempDisplayFunction = (entry) =>
          displayLogEntry(entry, displayOptions as DefaultDisplayOptions);
      } else if (typeof displayFn === "function") {
        // カスタム表示関数を使用
        tempDisplayFunction = displayFn;
      }

      // 履歴を表示
      if (tempDisplayFunction !== null) {
        currentHistory.forEach((entry) => {
          const { level, tag } = entry;
          let formattedMessage = tempDisplayFunction!(entry);

          // タグに基づいて色を選択
          const colorFn = getColorByTag(tag);

          // メッセージを分割してプレフィックス部分のみに色を適用
          // タイムスタンプがある場合とない場合の両方に対応
          const prefixMatch = formattedMessage.match(
            /^(?:(\d+:\d+:\d+\s+))?(\[\w+\](?:\s+\[[^\]]+\])?)/,
          );

          if (prefixMatch) {
            const timestamp = prefixMatch[1] || "";
            const tagPart = prefixMatch[2];
            const prefix = timestamp + tagPart;
            const rest = formattedMessage.substring(prefix.length);

            // プレフィックスに色を適用（タイムスタンプはそのまま、タグ部分のみ色付け）
            const coloredPrefix = timestamp + colorFn(tagPart);

            // レベルに応じた出力
            switch (level) {
              case LogLevel.DEBUG:
                output.log(coloredPrefix + rest);
                break;
              case LogLevel.INFO:
                output.log(coloredPrefix + rest);
                break;
              case LogLevel.LOG:
                output.log(coloredPrefix + rest);
                break;
              case LogLevel.WARN:
                output.log(coloredPrefix + rest);
                break;
              case LogLevel.ERROR:
                output.error(coloredPrefix + rest);
                break;
            }
          } else {
            // プレフィックスが見つからない場合は従来通りの処理
            switch (level) {
              case LogLevel.DEBUG:
                output.log(formattedMessage);
                break;
              case LogLevel.INFO:
                output.log(formattedMessage);
                break;
              case LogLevel.LOG:
                output.log(formattedMessage);
                break;
              case LogLevel.WARN:
                output.log(formattedMessage);
                break;
              case LogLevel.ERROR:
                output.error(formattedMessage);
                break;
            }
          }
        });
      }
    }

    return currentHistory;
  }

  // 一時的な設定を適用したロガーを作成する関数
  function config(tempOptions: DisplayOptions): ConfigurableLogger {
    // 元の設定と一時的な設定をマージ
    const mergedOptions = {
      ...displayOptions,
      ...tempOptions,
    };

    return {
      debug: (...args: any[]) => {
        const timestamp = new Date();
        const entry: LogEntry = {
          timestamp,
          level: LogLevel.DEBUG,
          tag,
          args,
          caller: getCallerInfo(),
          callerDetailed: getCallerInfoDetailed(),
        };

        // 履歴に追加
        if (useHistory) {
          history.push(entry);
        }

        // ログレベルをチェック
        if (LOG_LEVEL_PRIORITY[LogLevel.DEBUG] < LOG_LEVEL_PRIORITY[logLevel]) {
          return;
        }

        // フィルターをチェック
        if (!filter(entry)) {
          return;
        }

        // 一時的な設定を使用して表示
        let formattedMessage = displayLogEntry(
          entry,
          mergedOptions as DefaultDisplayOptions,
        );

        // タグに基づいて色を選択
        const colorFn = getColorByTag(tag);

        // メッセージを分割してプレフィックス部分のみに色を適用
        // タイムスタンプがある場合とない場合の両方に対応
        const prefixMatch = formattedMessage.match(
          /^(?:(\d+:\d+:\d+\s+))?(\[\w+\](?:\s+\[[^\]]+\])?)/,
        );

        if (prefixMatch) {
          const timestamp = prefixMatch[1] || "";
          const tagPart = prefixMatch[2];
          const prefix = timestamp + tagPart;
          const rest = formattedMessage.substring(prefix.length);

          // プレフィックスに色を適用（タイムスタンプはそのまま、タグ部分のみ色付け）
          const coloredPrefix = timestamp + colorFn(tagPart);
          output.log(coloredPrefix + rest);
        } else {
          output.log(formattedMessage);
        }
      },
      info: (...args: any[]) => {
        const timestamp = new Date();
        const entry: LogEntry = {
          timestamp,
          level: LogLevel.INFO,
          tag,
          args,
          caller: getCallerInfo(),
          callerDetailed: getCallerInfoDetailed(),
        };

        // 履歴に追加
        if (useHistory) {
          history.push(entry);
        }

        // ログレベルをチェック
        if (LOG_LEVEL_PRIORITY[LogLevel.INFO] < LOG_LEVEL_PRIORITY[logLevel]) {
          return;
        }

        // フィルターをチェック
        if (!filter(entry)) {
          return;
        }

        // 一時的な設定を使用して表示
        let formattedMessage = displayLogEntry(
          entry,
          mergedOptions as DefaultDisplayOptions,
        );

        // タグに基づいて色を選択
        const colorFn = getColorByTag(tag);

        // メッセージを分割してプレフィックス部分のみに色を適用
        // タイムスタンプがある場合とない場合の両方に対応
        const prefixMatch = formattedMessage.match(
          /^(?:(\d+:\d+:\d+\s+))?(\[\w+\](?:\s+\[[^\]]+\])?)/,
        );

        if (prefixMatch) {
          const timestamp = prefixMatch[1] || "";
          const tagPart = prefixMatch[2];
          const prefix = timestamp + tagPart;
          const rest = formattedMessage.substring(prefix.length);

          // プレフィックスに色を適用（タイムスタンプはそのまま、タグ部分のみ色付け）
          const coloredPrefix = timestamp + colorFn(tagPart);
          output.log(coloredPrefix + rest);
        } else {
          output.log(formattedMessage);
        }
      },
      log: (...args: any[]) => {
        const timestamp = new Date();
        const entry: LogEntry = {
          timestamp,
          level: LogLevel.LOG,
          tag,
          args,
          caller: getCallerInfo(),
          callerDetailed: getCallerInfoDetailed(),
        };

        // 履歴に追加
        if (useHistory) {
          history.push(entry);
        }

        // ログレベルをチェック
        if (LOG_LEVEL_PRIORITY[LogLevel.LOG] < LOG_LEVEL_PRIORITY[logLevel]) {
          return;
        }

        // フィルターをチェック
        if (!filter(entry)) {
          return;
        }

        // 一時的な設定を使用して表示
        let formattedMessage = displayLogEntry(
          entry,
          mergedOptions as DefaultDisplayOptions,
        );

        // タグに基づいて色を選択
        const colorFn = getColorByTag(tag);

        // メッセージを分割してプレフィックス部分のみに色を適用
        // タイムスタンプがある場合とない場合の両方に対応
        const prefixMatch = formattedMessage.match(
          /^(?:(\d+:\d+:\d+\s+))?(\[\w+\](?:\s+\[[^\]]+\])?)/,
        );

        if (prefixMatch) {
          const timestamp = prefixMatch[1] || "";
          const tagPart = prefixMatch[2];
          const prefix = timestamp + tagPart;
          const rest = formattedMessage.substring(prefix.length);

          // プレフィックスに色を適用（タイムスタンプはそのまま、タグ部分のみ色付け）
          const coloredPrefix = timestamp + colorFn(tagPart);
          output.log(coloredPrefix + rest);
        } else {
          output.log(formattedMessage);
        }
      },
      warn: (...args: any[]) => {
        const timestamp = new Date();
        const entry: LogEntry = {
          timestamp,
          level: LogLevel.WARN,
          tag,
          args,
          caller: getCallerInfo(),
          callerDetailed: getCallerInfoDetailed(),
        };

        // 履歴に追加
        if (useHistory) {
          history.push(entry);
        }

        // ログレベルをチェック
        if (LOG_LEVEL_PRIORITY[LogLevel.WARN] < LOG_LEVEL_PRIORITY[logLevel]) {
          return;
        }

        // フィルターをチェック
        if (!filter(entry)) {
          return;
        }

        // 一時的な設定を使用して表示
        let formattedMessage = displayLogEntry(
          entry,
          mergedOptions as DefaultDisplayOptions,
        );

        // タグに基づいて色を選択
        const colorFn = getColorByTag(tag);

        // メッセージを分割してプレフィックス部分のみに色を適用
        const prefixMatch = formattedMessage.match(
          /^(\d+:\d+:\d+\s+\[\w+\](?:\s+\[[^\]]+\])?)/,
        );

        if (prefixMatch) {
          const prefix = prefixMatch[1];
          const rest = formattedMessage.substring(prefix.length);

          // プレフィックスに色を適用
          const coloredPrefix = colorFn(prefix);
          output.log(coloredPrefix + rest);
        } else {
          output.log(formattedMessage);
        }
      },
      error: (...args: any[]) => {
        const timestamp = new Date();
        const entry: LogEntry = {
          timestamp,
          level: LogLevel.ERROR,
          tag,
          args,
          caller: getCallerInfo(),
          callerDetailed: getCallerInfoDetailed(),
        };

        // 履歴に追加
        if (useHistory) {
          history.push(entry);
        }

        // ログレベルをチェック
        if (LOG_LEVEL_PRIORITY[LogLevel.ERROR] < LOG_LEVEL_PRIORITY[logLevel]) {
          return;
        }

        // フィルターをチェック
        if (!filter(entry)) {
          return;
        }

        // 一時的な設定を使用して表示
        let formattedMessage = displayLogEntry(
          entry,
          mergedOptions as DefaultDisplayOptions,
        );

        // タグに基づいて色を選択
        const colorFn = getColorByTag(tag);

        // メッセージを分割してプレフィックス部分のみに色を適用
        const prefixMatch = formattedMessage.match(
          /^(\d+:\d+:\d+\s+\[\w+\](?:\s+\[[^\]]+\])?)/,
        );

        if (prefixMatch) {
          const prefix = prefixMatch[1];
          const rest = formattedMessage.substring(prefix.length);

          // プレフィックスに色を適用
          const coloredPrefix = colorFn(prefix);
          output.error(coloredPrefix + rest);
        } else {
          output.error(formattedMessage);
        }
      },
    };
  }

  // カスタムトピックロガーを作成する関数
  function createTopicLogger(topic: string): TopicLogger {
    // カスタムトピックが表示されるかどうかをチェック
    const shouldShowTopic = showTopics ||
      LOG_LEVEL_PRIORITY[CURRENT_LOG_LEVEL] > 0;

    if (!shouldShowTopic) {
      // 何もしないダミーロガーを返す
      return {
        debug: () => {},
        info: () => {},
        log: () => {},
        warn: () => {},
        error: () => {},
      };
    }

    // 実際のトピックロガーを返す
    return {
      debug: (...args: any[]) =>
        log(LogLevel.DEBUG, `[${tag}:${topic}]`, ...args),
      info: (...args: any[]) =>
        log(LogLevel.INFO, `[${tag}:${topic}]`, ...args),
      log: (...args: any[]) => log(LogLevel.LOG, `[${tag}:${topic}]`, ...args),
      warn: (...args: any[]) =>
        log(LogLevel.WARN, `[${tag}:${topic}]`, ...args),
      error: (...args: any[]) =>
        log(LogLevel.ERROR, `[${tag}:${topic}]`, ...args),
    };
  }

  // 型付きカスタムトピックロガーを作成する関数
  function createTypedTopicLogger<T>(topic: string): TypedTopicLogger<T> {
    // カスタムトピックが表示されるかどうかをチェック
    const shouldShowTopic = showTopics ||
      LOG_LEVEL_PRIORITY[CURRENT_LOG_LEVEL] > 0;

    if (!shouldShowTopic) {
      // 何もしないダミーロガーを返す
      return {
        debug: () => {},
        info: () => {},
        log: () => {},
        warn: () => {},
        error: () => {},
      };
    }

    // 実際の型付きトピックロガーを返す
    return {
      debug: (message: string, data: T) => {
        const entry: TypedLogEntry<T> = {
          timestamp: new Date(),
          level: LogLevel.DEBUG,
          tag: `${tag}:${topic}`,
          args: [message],
          data,
          caller: getCallerInfo(),
          callerDetailed: getCallerInfoDetailed(),
        };

        // 履歴に追加
        if (useHistory) {
          history.push(entry);
        }

        // ログレベルをチェック
        if (LOG_LEVEL_PRIORITY[LogLevel.DEBUG] < LOG_LEVEL_PRIORITY[logLevel]) {
          return;
        }

        // フィルターをチェック
        if (!filter(entry)) {
          return;
        }

        // ログを出力
        log(LogLevel.DEBUG, `[${tag}:${topic}]`, message, data);
      },
      info: (message: string, data: T) => {
        const entry: TypedLogEntry<T> = {
          timestamp: new Date(),
          level: LogLevel.INFO,
          tag: `${tag}:${topic}`,
          args: [message],
          data,
          caller: getCallerInfo(),
          callerDetailed: getCallerInfoDetailed(),
        };

        // 履歴に追加
        if (useHistory) {
          history.push(entry);
        }

        // ログレベルをチェック
        if (LOG_LEVEL_PRIORITY[LogLevel.INFO] < LOG_LEVEL_PRIORITY[logLevel]) {
          return;
        }

        // フィルターをチェック
        if (!filter(entry)) {
          return;
        }

        // ログを出力
        log(LogLevel.INFO, `[${tag}:${topic}]`, message, data);
      },
      log: (message: string, data: T) => {
        const entry: TypedLogEntry<T> = {
          timestamp: new Date(),
          level: LogLevel.LOG,
          tag: `${tag}:${topic}`,
          args: [message],
          data,
          caller: getCallerInfo(),
          callerDetailed: getCallerInfoDetailed(),
        };

        // 履歴に追加
        if (useHistory) {
          history.push(entry);
        }

        // ログレベルをチェック
        if (LOG_LEVEL_PRIORITY[LogLevel.LOG] < LOG_LEVEL_PRIORITY[logLevel]) {
          return;
        }

        // フィルターをチェック
        if (!filter(entry)) {
          return;
        }

        // ログを出力
        log(LogLevel.LOG, `[${tag}:${topic}]`, message, data);
      },
      warn: (message: string, data: T) => {
        const entry: TypedLogEntry<T> = {
          timestamp: new Date(),
          level: LogLevel.WARN,
          tag: `${tag}:${topic}`,
          args: [message],
          data,
          caller: getCallerInfo(),
          callerDetailed: getCallerInfoDetailed(),
        };

        // 履歴に追加
        if (useHistory) {
          history.push(entry);
        }

        // ログレベルをチェック
        if (LOG_LEVEL_PRIORITY[LogLevel.WARN] < LOG_LEVEL_PRIORITY[logLevel]) {
          return;
        }

        // フィルターをチェック
        if (!filter(entry)) {
          return;
        }

        // ログを出力
        log(LogLevel.WARN, `[${tag}:${topic}]`, message, data);
      },
      error: (message: string, data: T) => {
        const entry: TypedLogEntry<T> = {
          timestamp: new Date(),
          level: LogLevel.ERROR,
          tag: `${tag}:${topic}`,
          args: [message],
          data,
          caller: getCallerInfo(),
          callerDetailed: getCallerInfoDetailed(),
        };

        // 履歴に追加
        if (useHistory) {
          history.push(entry);
        }

        // ログレベルをチェック
        if (LOG_LEVEL_PRIORITY[LogLevel.ERROR] < LOG_LEVEL_PRIORITY[logLevel]) {
          return;
        }

        // フィルターをチェック
        if (!filter(entry)) {
          return;
        }

        // ログを出力
        log(LogLevel.ERROR, `[${tag}:${topic}]`, message, data);
      },
    };
  }

  // ロガーインスタンスを返す
  return {
    debug: (...args: any[]) => log(LogLevel.DEBUG, ...args),
    info: (...args: any[]) => log(LogLevel.INFO, ...args),
    log: (...args: any[]) => log(LogLevel.LOG, ...args),
    warn: (...args: any[]) => log(LogLevel.WARN, ...args),
    error: (...args: any[]) => log(LogLevel.ERROR, ...args),
    display: (entry: LogEntry, options?: DisplayOptions) =>
      displayLogEntry(
        entry,
        { ...displayOptions, ...options } as DefaultDisplayOptions,
      ),
    flush: <T = any>(
      displayFn?: boolean | ((entry: TypedLogEntry<T>) => string),
    ): TypedLogEntry<T>[] => {
      return flush(displayFn as any) as TypedLogEntry<T>[];
    },
    with: config,
    custom: createTopicLogger,
    topic: createTypedTopicLogger,
  };
}
