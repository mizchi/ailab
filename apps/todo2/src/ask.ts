/**
 * ユーザーに対して質問するユーティリティ関数を提供するモジュール
 */

// テキストエンコーダー/デコーダー
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * ユーザーに質問を表示して回答を取得する
 * @param question 表示する質問
 * @param defaultValue デフォルト値（Enterキーだけで入力された場合に使用）
 * @returns ユーザーの回答
 */
export async function ask(
  question: string,
  defaultValue = "",
): Promise<string> {
  // プロンプトを表示
  Deno.stdout.write(
    encoder.encode(`${question}${defaultValue ? ` (${defaultValue})` : ""}: `),
  );

  // 入力を読み込む
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);

  if (n === null) {
    // 入力がない場合はデフォルト値
    return defaultValue;
  }

  const answer = decoder.decode(buf.subarray(0, n)).trim();

  // 回答が空の場合はデフォルト値
  return answer || defaultValue;
}

/**
 * ユーザーに確認を求める（Yes/No質問）
 * @param question 表示する質問
 * @param defaultIsYes デフォルトの回答がYesかどうか
 * @returns ユーザーがYesと答えた場合はtrue、Noと答えた場合はfalse
 */
export async function confirm(
  question: string,
  defaultIsYes = true,
): Promise<boolean> {
  const defaultText = defaultIsYes ? "Y/n" : "y/N";
  const defaultValue = defaultIsYes ? "y" : "n";

  // プロンプトを表示
  Deno.stdout.write(encoder.encode(`${question} [${defaultText}]: `));

  // 入力を読み込む
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);

  if (n === null) {
    // 入力がない場合はデフォルト値
    return defaultIsYes;
  }

  const answer = decoder.decode(buf.subarray(0, n)).trim().toLowerCase();

  // 回答が空の場合はデフォルト値
  if (!answer) {
    return defaultIsYes;
  }

  // y, yes, trueのいずれかであればtrue
  return ["y", "yes", "true"].includes(answer);
}

/**
 * 複数の選択肢からユーザーに選択してもらう
 * @param question 表示する質問
 * @param choices 選択肢の配列
 * @param defaultIndex デフォルトの選択肢のインデックス
 * @returns 選択された選択肢
 */
export async function select<T extends string>(
  question: string,
  choices: readonly T[],
  defaultIndex = 0,
): Promise<T> {
  if (choices.length === 0) {
    throw new Error("選択肢がありません");
  }

  // 選択肢を表示
  console.log(`${question}`);
  choices.forEach((choice, index) => {
    const marker = index === defaultIndex ? ">" : " ";
    console.log(`${marker} ${index + 1}: ${choice}`);
  });

  // プロンプトを表示
  const defaultValue = String(defaultIndex + 1);
  Deno.stdout.write(
    encoder.encode(
      `選択してください (1-${choices.length}) [${defaultValue}]: `,
    ),
  );

  // 入力を読み込む
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);

  if (n === null) {
    // 入力がない場合はデフォルト値
    return choices[defaultIndex];
  }

  const answer = decoder.decode(buf.subarray(0, n)).trim();

  // 回答が空の場合はデフォルト値
  if (!answer) {
    return choices[defaultIndex];
  }

  // 数値をパース
  const selectedIndex = parseInt(answer, 10) - 1;

  // 有効な選択肢かチェック
  if (
    isNaN(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= choices.length
  ) {
    console.log(
      `無効な選択です。デフォルトの ${defaultIndex + 1} を使用します。`,
    );
    return choices[defaultIndex];
  }

  return choices[selectedIndex];
}
