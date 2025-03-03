/**
 * コールグラフテスト用のサンプルファイル
 */

// 数値を2倍にする関数
function double(n: number): number {
  return n * 2;
}

// 数値を二乗する関数
function square(n: number): number {
  return n * n;
}

// 数値の合計を計算する関数
function sum(...numbers: number[]): number {
  return numbers.reduce((total, num) => total + num, 0);
}

// 平均値を計算する関数
function average(...numbers: number[]): number {
  const total = sum(...numbers);
  return total / numbers.length;
}

// factorial関数 - 再帰呼び出しの例
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

// 複数の数学関数を組み合わせる関数
function calculate(n: number): number {
  const doubled = double(n);
  const squared = square(doubled);
  return squared;
}

// 複雑な計算を行う関数
function complexCalculation(a: number, b: number): number {
  const avg = average(a, b, a + b);
  const fact = factorial(Math.min(5, Math.floor(avg)));
  return calculate(fact);
}

// オブジェクトメソッド呼び出しの例
const MathUtils = {
  add(a: number, b: number): number {
    return a + b;
  },

  multiply(a: number, b: number): number {
    return a * b;
  },

  compute(a: number, b: number): number {
    const sum = this.add(a, b);
    const product = this.multiply(a, b);
    return average(sum, product);
  },
};

// メイン関数 - 全ての関数を呼び出す
function main() {
  console.log("Double of 5:", double(5));
  console.log("Square of 4:", square(4));
  console.log("Sum of 1,2,3:", sum(1, 2, 3));
  console.log("Average of 10,20,30:", average(10, 20, 30));
  console.log("Factorial of 5:", factorial(5));
  console.log("Calculate with 3:", calculate(3));
  console.log("Complex calculation with 4 and 6:", complexCalculation(4, 6));
  console.log("Math Utils compute 5 and 7:", MathUtils.compute(5, 7));
}

// スクリプトが直接実行された場合はmain関数を呼び出す
if (import.meta.main) {
  main();
}
