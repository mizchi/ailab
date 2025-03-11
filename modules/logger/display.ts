/**
 * 表示関連の機能を提供するモジュール
 *
 * このモジュールは、ログエントリやデータの表示方法を定義します。
 * 様々な表示形式（通常表示、テーブル表示など）をサポートします。
 */

import pc from "picocolors";
import { inspect } from "node:util";
import type {
  DefaultDisplayOptions,
  DisplayOptions,
  LogEntry,
  TableDisplayOptions,
} from "./types.ts";
import { DisplayType } from "./types.ts";

/**
 * 文字列からハッシュ値を生成する
 * @param str ハッシュ化する文字列
 * @returns 数値のハッシュ値
 */
function hashString(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash);
}

/**
 * ハッシュ値に基づいて色関数を選択する
 * @param tag タグ文字列
 * @returns picocolorsの色関数
 */
export function getColorByTag(tag: string): (text: string) => string {
  // 利用可能な色の配列
  const colors = [
    pc.cyan,
    pc.green,
    pc.yellow,
    pc.blue,
    pc.magenta,
    pc.red,
    pc.cyanBright,
    pc.greenBright,
    pc.yellowBright,
    pc.blueBright,
    pc.magentaBright,
    pc.redBright,
  ];

  if (!tag) {
    // タグが未指定の場合はランダムな色を返す
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  }

  // タグからハッシュ値を生成し、色のインデックスを決定
  const hash = hashString(tag);
  const colorIndex = hash % colors.length;

  return colors[colorIndex];
}

/**
 * 配列の要素数を制限し、省略された場合は要素数を表示する
 * また、JSONの文字列長も制限する
 * @param obj 対象のオブジェクト
 * @param maxArrayLength 配列の最大要素数
 * @param maxStringLength JSONの最大文字列長（デフォルト: 1024）
 * @param indent インデントのスペース数（nullの場合は一行表示）
 * @returns JSONシリアライズされた文字列
 */
export function truncateArraysInJson(
  obj: any,
  maxArrayLength: number,
  maxStringLength: number = 1024,
  indent?: number,
): string {
  // カスタムのreplacerを使用して配列を処理
  const replacer = (key: string, value: any): any => {
    if (Array.isArray(value) && value.length > maxArrayLength) {
      // 配列の要素数が制限を超える場合、先頭の要素を保持し残りを省略
      const truncated = value.slice(0, maxArrayLength);
      // 省略された要素数を示すマーカーを追加
      truncated.push(`...x${value.length - maxArrayLength}`);
      return truncated;
    }
    return value;
  };

  // JSONシリアライズ
  const jsonString = JSON.stringify(obj, replacer, indent);

  // 文字列長を制限
  if (maxStringLength > 0 && jsonString.length > maxStringLength) {
    return jsonString.substring(0, maxStringLength) + "...";
  }

  return jsonString;
}

/**
 * オブジェクトのキーを最大5つまで表示する関数
 * @param obj 対象のオブジェクト
 * @returns フォーマットされた文字列
 */
export function formatObjectKeys(obj: any): string {
  if (!obj || typeof obj !== "object") return String(obj);

  const keys = Object.keys(obj);
  if (keys.length === 0) return "{}";

  // 最大5つのキーを表示
  const displayKeys = keys.slice(0, 5);
  const hasMore = keys.length > 5;

  return `{${displayKeys.join(",")}${hasMore ? ",..." : ""}}`;
}

/**
 * [Object] を {key1,key2,...} のように表示するための関数
 * @param text 元のテキスト
 * @param obj 対象のオブジェクト
 * @returns 置換後のテキスト
 */
export function replaceObjectWithKeys(text: string, obj: any): string {
  // [Object] を検索して置き換える
  return text.replace(/\[Object\]/g, () => {
    return formatObjectKeys(obj);
  });
}

/**
 * ログエントリを表示用の文字列にフォーマットする
 * @param entry ログエントリ
 * @param options 表示オプション
 * @returns フォーマットされた文字列
 */
export function displayLogEntry(
  entry: LogEntry,
  options: DefaultDisplayOptions = {},
): string {
  const { level, args, count, tag } = entry;

  // デフォルトオプション
  const {
    colorizeJson = true,
    maxLength = 0,
    singleLine = false,
    timeOnly = true,
    showTimestamp = false,
    depth = singleLine ? 2 : 5,
    maxArrayLength = 10,
    showCaller = false,
    detailedCaller = false,
  } = options;

  // タイムスタンプの処理
  let timestampText = "";
  if (showTimestamp) {
    // タイムスタンプのフォーマット
    if (timeOnly) {
      timestampText = entry.timestamp.toTimeString().split(" ")[0] + " ";
    } else {
      timestampText =
        entry.timestamp.toISOString().split("T")[1].split(".")[0] + " ";
    }
  }

  const countText = count ? ` x${count}` : "";

  // 最初の引数（メッセージ）の処理
  let message = "";
  let restArgs: any[] = [];

  if (args.length > 0) {
    if (typeof args[0] === "string") {
      message = args[0];
      restArgs = args.slice(1);
    } else {
      // 最初の引数が文字列でない場合は、すべての引数を処理
      restArgs = args;
    }
  }

  // メッセージの省略
  if (maxLength > 0 && message.length > maxLength) {
    message = message.substring(0, maxLength) + "...";
  }

  // 呼び出し元の情報を取得
  let callerInfo = "";
  if (showCaller) {
    if (detailedCaller && entry.callerDetailed) {
      callerInfo = ` [${entry.callerDetailed}]`;
    } else if (entry.caller) {
      callerInfo = ` [${entry.caller}]`;
    }
  }

  // 基本的なフォーマット
  let formattedMessage =
    `${timestampText}[${tag}]${callerInfo} ${message}${countText}`;

  // 残りの引数の処理
  if (restArgs.length > 0) {
    const argsText = restArgs.map((arg) => {
      if (typeof arg === "object" && arg !== null) {
        // JSON構造体の場合
        try {
          // JSONの文字列表現の長さを取得
          const jsonLength = JSON.stringify(arg).length;

          if (singleLine && jsonLength < 20) {
            // 一行表示かつ短い場合
            if (colorizeJson) {
              // 通常のinspect結果を取得
              let result = inspect(arg, {
                colors: true,
                depth,
                compact: true,
                maxArrayLength,
                breakLength: Infinity,
              });

              // [Object] を {key1,key2,...} に置き換える
              for (const key in arg) {
                if (typeof arg[key] === "object" && arg[key] !== null) {
                  result = result.replace(
                    new RegExp(`${key}: \\[Object\\]`, "g"),
                    `${key}: ${formatObjectKeys(arg[key])}`,
                  );
                }
              }

              // 文字列長を制限
              if (maxLength > 0 && result.length > maxLength) {
                result = result.substring(0, maxLength) + "...";
              }

              return result;
            } else {
              return truncateArraysInJson(arg, maxArrayLength, maxLength);
            }
          } else {
            // 複数行表示または長い場合はインデント
            if (colorizeJson) {
              // 通常のinspect結果を取得
              let result = inspect(arg, {
                colors: true,
                depth,
                compact: false,
                maxArrayLength,
              });

              // [Object] を {key1,key2,...} に置き換える
              for (const key in arg) {
                if (typeof arg[key] === "object" && arg[key] !== null) {
                  result = result.replace(
                    new RegExp(`${key}: \\[Object\\]`, "g"),
                    `${key}: ${formatObjectKeys(arg[key])}`,
                  );
                }
              }

              // 文字列長を制限
              if (maxLength > 0 && result.length > maxLength) {
                result = result.substring(0, maxLength) + "...";
              }

              return result;
            } else {
              return truncateArraysInJson(arg, maxArrayLength, maxLength, 2);
            }
          }
        } catch (e) {
          return String(arg);
        }
      } else {
        return String(arg);
      }
    });

    // 引数テキストの省略
    let processedArgsText = argsText.join(" ");
    if (maxLength > 0 && processedArgsText.length > maxLength * 3) {
      processedArgsText = processedArgsText.substring(0, maxLength * 3) + "...";
    }

    // 一行表示か複数行表示かで分岐
    if (singleLine) {
      formattedMessage += " " + processedArgsText;
    } else {
      formattedMessage += "\n" + processedArgsText;
    }
  }

  return formattedMessage;
}

/**
 * 文字列の表示幅を計算する関数
 * @param str 対象の文字列
 * @returns 表示幅
 */
export function getStringWidth(str: string): number {
  // 文字列を文字の配列に分解
  const chars = Array.from(str);

  // 各文字の幅を計算して合計
  return chars.reduce((width, char) => {
    // 全角文字（日本語など）は幅2としてカウント
    const code = char.codePointAt(0) || 0;
    // CJK文字、全角記号などの判定
    const isWide = (
      (code >= 0x3000 && code <= 0x9FFF) || // CJK統合漢字、ひらがな、カタカナなど
      (code >= 0xFF00 && code <= 0xFFEF) || // 全角英数字、記号
      (code >= 0x20000 && code <= 0x2FFFF) // CJK拡張
    );
    return width + (isWide ? 2 : 1);
  }, 0);
}

/**
 * 文字列を指定した幅に調整する関数
 * @param str 対象の文字列
 * @param width 目標の幅
 * @param padChar パディング文字
 * @returns パディングされた文字列
 */
export function padString(
  str: string,
  width: number,
  padChar: string = " ",
): string {
  const strWidth = getStringWidth(str);
  if (strWidth >= width) return str;
  return str + padChar.repeat(width - strWidth);
}

/**
 * ネストしたプロパティにアクセスする関数
 * @param obj 対象のオブジェクト
 * @param path プロパティパス（ドット区切り）
 * @returns プロパティの値
 */
export function getNestedProperty(obj: any, path: string): any {
  const keys = path.split(".");
  let value = obj;

  for (const key of keys) {
    if (value === null || value === undefined || typeof value !== "object") {
      return undefined;
    }
    value = value[key];
  }

  return value;
}

/**
 * 値をフォーマットする関数
 * @param value フォーマットする値
 * @param maxCellWidth 最大セル幅
 * @param maxArrayItems 配列の最大表示アイテム数
 * @returns フォーマットされた文字列
 */
export function formatValue(
  value: any,
  maxCellWidth: number = 30,
  maxArrayItems: number = 3,
): string {
  // nullとundefinedの処理
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  // プリミティブ値の処理
  if (typeof value !== "object") {
    const str = String(value);
    if (getStringWidth(str) <= maxCellWidth) return str;
    // 長すぎる文字列は切り詰める
    return truncateString(str, maxCellWidth);
  }

  // 配列の処理
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.length <= maxArrayItems) {
      // 少ない要素数の場合は全て表示
      const items = value.map((item) => formatValue(item, maxCellWidth - 2, 1));
      const str = `[${items.join(", ")}]`;
      if (getStringWidth(str) <= maxCellWidth) return str;
    }
    // 多すぎる要素は要約
    return `[x${value.length}]`;
  }

  // オブジェクトの処理
  const keys = Object.keys(value);
  if (keys.length === 0) return "{}";

  // 少ないプロパティ数の場合は表示
  if (keys.length <= 2) {
    const props = keys.map((key) => {
      const val = formatValue(value[key], Math.floor(maxCellWidth / 2), 1);
      return `${key}:${val}`;
    });
    const str = `{${props.join(", ")}}`;
    if (getStringWidth(str) <= maxCellWidth) return str;
  }

  // 多すぎるプロパティは要約
  return `{${keys.length} keys}`;
}

/**
 * 文字列を切り詰める関数
 * @param str 対象の文字列
 * @param maxWidth 最大幅
 * @returns 切り詰められた文字列
 */
export function truncateString(str: string, maxWidth: number): string {
  // 文字単位で切り詰め
  const chars = Array.from(str);
  let width = 0;
  let truncated = "";

  for (const char of chars) {
    const charWidth = getStringWidth(char);
    if (width + charWidth + 3 > maxWidth) break; // "..."の分を考慮
    truncated += char;
    width += charWidth;
  }

  return truncated + "...";
}

/**
 * データをテーブル形式で表示する
 * @param data 表示するデータ配列
 * @param options テーブル表示オプション
 * @returns テーブル形式の文字列
 */
export function displayTable<T>(
  data: T[],
  options: TableDisplayOptions,
): string {
  // 空のデータの場合
  if (data.length === 0) {
    return "Empty table (no data)";
  }

  // オプションのデフォルト値
  const {
    maxColumns = 10,
    border = true,
    compact = false,
    colorize = true,
    maxCellWidth = 30,
    maxArrayItems = 3,
  } = options;

  // カラムの検出
  let columns: string[] = [];

  if (options.columns && options.columns.length > 0) {
    // 指定されたカラムを使用
    columns = options.columns;
  } else {
    // データから自動的にカラムを検出
    const allKeys = new Set<string>();

    // すべてのオブジェクトからキーを収集
    for (const item of data) {
      if (typeof item !== "object" || item === null) continue;

      for (const key of Object.keys(item)) {
        allKeys.add(key);

        // ネストしたオブジェクトのキーも収集（ドット記法）
        if (
          typeof item[key as keyof typeof item] === "object" &&
          item[key as keyof typeof item] !== null &&
          !Array.isArray(item[key as keyof typeof item])
        ) {
          const nestedObj = item[key as keyof typeof item] as Record<
            string,
            unknown
          >;
          for (const nestedKey of Object.keys(nestedObj)) {
            allKeys.add(`${key}.${nestedKey}`);
          }
        }
      }
    }

    // 最大カラム数を考慮
    columns = [...allKeys].slice(0, maxColumns);
  }

  // ヘッダー行
  const headers = columns;

  // データ行の生成
  const rows: string[][] = [];

  for (const item of data) {
    const row: string[] = [];

    for (const column of columns) {
      // ドット記法でネストしたプロパティにアクセス
      const value = getNestedProperty(item, column);
      // 値をフォーマット
      row.push(formatValue(value, maxCellWidth, maxArrayItems));
    }

    rows.push(row);
  }

  // 各列の幅を計算
  const colWidths = headers.map((header, colIndex) => {
    // ヘッダーの幅
    let width = getStringWidth(header);

    // 各行のセル幅を考慮
    for (const row of rows) {
      if (colIndex < row.length) {
        width = Math.max(width, getStringWidth(row[colIndex]));
      }
    }

    // 最大幅の制限
    return Math.min(width, maxCellWidth);
  });

  // テーブルの描画
  let result = "";

  if (border) {
    // 上部の境界線
    result += "┌" + colWidths.map((w) => "─".repeat(w + 2)).join("┬") + "┐\n";

    // ヘッダー行
    result += "│ " + headers.map((header, i) =>
      padString(header, colWidths[i])
    ).join(" │ ") + " │\n";

    // ヘッダーと本体の区切り線
    result += "├" + colWidths.map((w) => "─".repeat(w + 2)).join("┼") + "┤\n";
  } else {
    // 境界線なしの場合はヘッダーのみ
    if (colorize) {
      result += headers.map((header, i) =>
        pc.bold(padString(header, colWidths[i]))
      ).join(" | ") + "\n";
    } else {
      result += headers.map((header, i) =>
        padString(header, colWidths[i])
      ).join(" | ") + "\n";
    }

    // 下線
    result += colWidths.map((w) => "─".repeat(w)).join("─┼─") + "\n";
  }

  // データ行の描画
  for (const [rowIndex, row] of rows.entries()) {
    if (border) {
      result += "│ " +
        row.map((cell, i) => padString(cell, colWidths[i])).join(" │ ");

      // 足りない列を空白で埋める
      for (let i = row.length; i < headers.length; i++) {
        result += " │ " + " ".repeat(colWidths[i]);
      }

      result += " │\n";
    } else {
      result += row.map((cell, i) => padString(cell, colWidths[i])).join(" | ");

      // 足りない列を空白で埋める
      for (let i = row.length; i < headers.length; i++) {
        result += " | " + " ".repeat(colWidths[i]);
      }

      result += "\n";
    }

    // コンパクトモードでない場合は行間に区切り線を入れる
    if (!compact && border && rowIndex < rows.length - 1) {
      result += "├" + colWidths.map((w) => "─".repeat(w + 2)).join("┼") + "┤\n";
    }
  }

  // 下部の境界線
  if (border) {
    result += "└" + colWidths.map((w) => "─".repeat(w + 2)).join("┴") + "┘\n";
  }

  return result;
}

/**
 * データを表示する関数
 * @param data 表示するデータ
 * @param options 表示オプション
 * @returns フォーマットされた文字列
 */
export function display(data: any, options: DisplayOptions = {}): string {
  const type = "type" in options ? options.type : DisplayType.DEFAULT;

  switch (type) {
    case DisplayType.TABLE:
      return displayTable(
        Array.isArray(data) ? data : [data],
        options as TableDisplayOptions,
      );
    case DisplayType.DEFAULT:
    default:
      // デフォルト表示はLogEntryを想定しているため、
      // LogEntryでない場合は単純に文字列化
      if (
        !("timestamp" in data && "level" in data && "tag" in data &&
          "args" in data)
      ) {
        return typeof data === "object"
          ? JSON.stringify(data, null, 2)
          : String(data);
      }
      return displayLogEntry(data, options as DefaultDisplayOptions);
  }
}
