/* @script */
/**
 * 数値を2倍にする関数
 * @param x 入力値
 * @returns 2倍の値
 */
export function double(x: number): number {
  return x * 2;
}

if (import.meta.main) {
  console.log(double(5));
}
