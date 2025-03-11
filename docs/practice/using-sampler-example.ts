type SampleLog = (<T = any>(t: T) => void) & Disposable;
function createSampleLog<T = any>(
  n: number,
  truncateSize = 4,
  print = console.log,
): SampleLog {
  const samples: Array<[T, number]> = [];
  let count = 0;
  return Object.assign((item: T) => {
    count++;
    if (samples.length < n) {
      samples.push([item, count]);
    } else {
      const r = ~~(Math.random() * count);
      if (r < n) samples[r] = [item, count];
    }
  }, {
    [Symbol.dispose]() {
      samples.sort(([, a], [, b]) => a - b).forEach(([item, order]) => {
        print(order, _truncate(item, truncateSize));
      });
    },
  }) as SampleLog;

  function _truncate(input: any, len: number): string {
    let str: string;
    if (input instanceof Object) {
      str = JSON.stringify(input, null, 2);
    } else {
      str = String(input);
    }
    return str.length > len ? str.slice(0, len) + "..." : str;
  }
}

// 基本的な使用例
function basicExample() {
  using log = createSampleLog<number>(5, 20);
  // 大量のデータを処理
  for (let i = 0; i < 1000; i++) {
    const len = ~~(Math.random() * 40) + 1;
    log(String.fromCharCode(~~(Math.random() * 50 + 30)).repeat(len));
  }
  // スコープを抜けると自動的に結果が表示される
}
basicExample();
