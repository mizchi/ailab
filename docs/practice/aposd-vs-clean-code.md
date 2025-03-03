# A Philosophy of Software Design vs Clean Code

> この文書は以下のGitHub上の対談内容の要約です：\
> [https://github.com/johnousterhout/aposd-vs-clean-code/blob/main/README.md](https://github.com/johnousterhout/aposd-vs-clean-code/blob/main/README.md)

John Ousterhout（「A Philosophy of Software Design」著者）とRobert "Uncle Bob"
Martin（「Clean
Code」著者）による、ソフトウェア設計に関する対談の要約です。この対談は2024年9月から2025年2月にかけて行われました。

## はじめに

両者とも優れたソフトウェア設計の重要性で合意しつつも、アプローチと推奨事項に大きな違いがあります。対談では主に以下の3つのトピックが議論されました：

1. メソッドの長さ
2. コメントの活用
3. テスト駆動開発（TDD）

### 基本的な設計哲学

**Ousterhout:**

- ソフトウェア設計の根本的な目標は「システムを理解し修正しやすくすること」
- 「複雑さ」とは、システムの理解や修正を難しくするもの
- 複雑さの主な要因は情報に関連する
  - 開発者がタスクを実行するために頭に入れておく必要がある情報量
  - 必要な情報がどれだけアクセスしやすく明白か
- 複雑さを減らすことが良い設計の指標

**Martin:**

- 設計の主な目的は、コードを書く人ではなく読む人の作業を容易にすること
- プログラマーはコードを書くよりも読む時間の方が圧倒的に長い
- 「きれいなコード」とは、他の人が読んで理解しやすいコード

## 1. メソッドの長さ

### Martin（Clean Code）の立場:

- メソッドは可能な限り小さくすべき
- 関数は2〜4行程度の短さが望ましい
- if文やwhile文のブロックは1行（通常は関数呼び出し）であるべき
- 「One Thing」ルール：一つのメソッドは一つのことだけを行うべき

### Ousterhout（A Philosophy of Software Design）の立場:

- コードを小さな単位に分割することは重要だが、行き過ぎると問題が発生する
- 過度な分解は「浅いインターフェース」を生み出し、認知的な負荷軽減効果が薄れる
- 過度な分解は「絡み合い」を引き起こす
  - 絡み合ったメソッドは、互いのコードを理解するために行き来する必要がある
  - 情報が1か所にまとまっていないため、理解が難しくなる
- 「深いインターフェース」：シンプルなインターフェースで多くの機能を提供するメソッドが理想的

### 具体例：PrimeGenerator

対談では、「Clean
Code」に掲載されている素数生成クラスの実装が議論されました。Martinのアプローチでは、コードが8つの小さなメソッドに分割されていましたが、Ousterhoutはこれが理解を難しくしていると指摘しました。

**Martinの実装の例（Clean Code）:**

```java
public class PrimeGenerator {
  private static int[] primes;
  private static ArrayList<Integer> multiplesOfPrimeFactors;
  
  protected static int[] generate(int n) {
    primes = new int[n];
    multiplesOfPrimeFactors = new ArrayList<Integer>();
    set2AsFirstPrime();
    checkOddNumbersForSubsequentPrimes();
    return primes;
  }
  
  private static void set2AsFirstPrime() {
    primes[0] = 2;
    multiplesOfPrimeFactors.add(2);
  }
  
  private static void checkOddNumbersForSubsequentPrimes() {
    int primeIndex = 1;
    for (int candidate = 3; primeIndex < primes.length; candidate += 2) {
      if (isPrime(candidate))
        primes[primeIndex++] = candidate;
    }
  }
  
  private static boolean isPrime(int candidate) {
    if (isLeastRelevantMultipleOfLargerPrimeFactor(candidate)) {
      multiplesOfPrimeFactors.add(candidate);
      return false;
    }
    return isNotMultipleOfAnyPreviousPrimeFactor(candidate);
  }
  
  // 他の4つのメソッド省略
}
```

**Ousterhoutのリライト案（より少ないメソッド分割とコメントの追加）:**

```java
public class PrimeGenerator2 {
  /**
   * Computes the first prime numbers; the return value contains the
   * computed primes, in increasing order of size.
   * @param n
   *      How many prime numbers to compute.
   */
  public static int[] generate(int n) {
    int[] primes = new int[n];
    // Used to test efficiently (without division) whether a candidate
    // is a multiple of a previously-encountered prime number. Each entry
    // here contains an odd multiple of the corresponding entry in
    // primes. Entries increase monotonically.
    int[] multiples = new int[n];
    // 実装の詳細...（コメント付き）
    
    // 長いメソッドだが、論理的なまとまりを持ち、
    // コメントによって意図が明確になっている
  }
}
```

### 合意点:

- モジュラー設計は良いもの
- 過度な分解も可能であり、「Clean
  Code初版」はその認識の指針をあまり提供していない
- 「PrimeGenerator」の内部分解には問題がある

### 相違点:

- 分解をどこまで進めるべきかで意見が分かれる
- MartinはOne Thingルール（各メソッドは「1つのこと」を行うべき）を支持
- Ousterhoutはこのルールが適切な防護柵を欠いており、過度な分解を招くと批判

## 2. コメントの使用

### Martin（Clean Code）の立場:

- コメントはコードで自己表現できない場合の「必要悪」
- コメントは常に「失敗」を意味する
- 長いメソッド名を使ってコメントを代用すべき
- コメントは維持されず、誤解を招くことがある
- 実装の明白でない部分だけにコメントを限定すべき

### Ousterhout（A Philosophy of Software Design）の立場:

- コメントは非常に重要で、大きな価値がある
- コードでは表現できない重要な情報が多く存在する
- インターフェースと抽象化はコメントなしには定義できない
- コメントの不足がソフトウェア開発の速度低下の最大の原因の一つ
- 英語はコードでは表現できない概念や意図を説明するのに適している

### コメントの実践的例：

**Martin風のアプローチ（最小限のコメント、説明的な名前）:**

```java
private static boolean isLeastRelevantMultipleOfLargerPrimeFactor(int candidate) {
  int nextLargerPrimeFactor = primes[multiplesOfPrimeFactors.size()];
  int leastRelevantMultiple = nextLargerPrimeFactor * nextLargerPrimeFactor;
  return candidate == leastRelevantMultiple;
}
```

**Ousterhout風のアプローチ（コメント付き、シンプルな名前）:**

```java
/**
 * Returns true if candidate is a multiple of primes[n], false otherwise.
 * May modify multiplesOfPrimeFactors[n].
 * @param candidate
 *      Number being tested for primality; must be at least as
 *      large as any value passed to this method in the past.
 * @param n
 *      Selects a prime number to test against; must be
 *      <= multiplesOfPrimeFactors.size().
 */
private static boolean isMultiple(int candidate, int n) {
  // 実装...
}
```

### 合意点:

- コメントがまったく不要というわけではない
- 実装コードは非明白な場合のみコメントが必要
- パブリックAPIは適切にドキュメント化すべき

### 相違点:

- Martinはコメントの必要性を最小限に抑えることを強く推奨
- Ousterhoutは同量のコードに対して5〜10倍多くのコメントを書くと主張
- Martinはコードを読まずにコメントを信頼しない
- Ousterhoutはコメントを一般的に信頼し、コードをより少なく読む必要がある

## 3. テスト駆動開発（TDD）

### Martin（Clean Code）の立場:

- TDDは3つの法則に基づく:
  1. 失敗するテストを先に書かないと実装コードを書けない
  2. テストは失敗するのに十分な分だけしか書けない
  3. 現在失敗しているテストを通す分だけ実装コードを書く
- 数秒のサイクルで作業し、テスト→実装→リファクタリングを繰り返す
- TDDの利点:
  - デバッグの必要性が少ない
  - 信頼性の高い低レベルのドキュメントが生成される
  - 結合度の低い設計が促進される
  - リファクタリングを恐れずに行える

### Ousterhout（A Philosophy of Software Design）の立場:

- ユニットテストは不可欠だが、TDDには問題がある
- TDDは開発者が戦術的に作業し過ぎることを強制する
- 設計思考よりもテストを優先することで、良い設計が阻害される
- TDDは最初に悪いコードを書くことを保証し、後から修正するアプローチを取る
- 「バンドリング」アプローチを推奨:
  - メソッドやクラス単位でコードをまとめて考える
  - 設計→コード→ユニットテストの順で作業

### TDDと代替アプローチの比較

**TDDアプローチ:**

1. テストを書く（赤）
2. テストが通るように最小限のコードを書く（緑）
3. コードをリファクタリングする（青）
4. 繰り返す

**Ousterhoutの「バンドリング」アプローチ:**

1. 設計を検討し、全体像を考える
2. クラスやメソッド単位でコードを書く
3. 書いたコードのテストを書く
4. 必要に応じてリファクタリングする

### 合意点:

- ユニットテストはソフトウェア開発において必須の要素
- TDDを使って良い設計のシステムを作ることは可能
- リファクタリングは良いコードを維持するために重要

### 相違点:

- OusterhoutはTDDが良い設計を阻害し悪いコードにつながると懸念
- MartinはTDDが設計を阻害するとは考えておらず、リスクも少ないと主張
- ベストケースでは同様の結果が得られるが、平均的・最悪のケースでは意見が分かれる

## 実践的な適用

各アプローチの長所を組み合わせた実践的な適用方法を考えてみましょう：

### メソッドの長さについて

- メソッドは単一の責任を持つべきだが、過度な分解は避ける
- コードの理解しやすさを最優先し、メソッドの長さは絶対的な基準ではなく相対的に判断する
- メソッド間の「絡み合い」が生じていないか定期的にチェックする

### コメントについて

- インターフェースには常に明確なコメントを書く
- 実装の意図や「なぜそうしたのか」を説明するコメントを適切に追加する
- 明白なことを説明する冗長なコメントは避ける
- メソッド名と変数名は説明的にしつつも、極端に長くならないようにバランスを取る

### テストについて

- テストファーストの考え方を取り入れつつも、設計思考も大切にする
- 複雑な問題に取り組む場合は、まず設計を考えてから実装とテストを進める
- シンプルな機能の場合はTDDのサイクルで進めることも効果的
- どのようなアプローチでも、テストカバレッジを高く保つことが重要

## 結論

### Ousterhoutの最終的見解:

- Clean Codeは本当に重要でないものに注力している
  - 小さなメソッドへの過度な分割
  - 英語で書かれたコメントの排除
  - コードよりテストを先に書くこと
- これらは大きな価値を提供せず、最適な設計から注意をそらす
- コメントの価値を根本的に過小評価している
- バランスの取れたアプローチではなく、極端な立場を取りすぎている

### Martinの最終的見解:

- 議論は有益で、多くの価値観を共有している
- 意見の相違はあるが、Ousterhoutの指摘を考慮し、Clean Codeの第2版に反映させる

## 考察

この対談は、ソフトウェア設計における異なるアプローチと哲学を浮き彫りにしています。Martin氏の「Clean
Code」はコードの読みやすさと小さな単位への分割を重視し、Ousterhout氏の「A
Philosophy of Software
Design」は全体的な設計とバランスを重視しています。どちらのアプローチにも長所と短所があり、状況や個人の好みによって適切な方法は異なるでしょう。

特定のプロジェクトや状況に応じて両者のアプローチをバランス良く取り入れることが、最善の結果をもたらす可能性があります。例えば：

- 大規模なシステムでは、Ousterhoutの「深いモジュール」と「絡み合いの少なさ」の考え方が特に重要
- 多人数のチームでは、Martinの「読みやすさを最優先」する考え方が協業を助ける
- コードベースの成長に伴い、どちらのアプローチも定期的なリファクタリングの重要性を強調している

最終的には、良いソフトウェア設計とは、コードを理解しやすく、修正しやすくするという共通の目標に向かって、様々なテクニックやアプローチをバランス良く適用することにあるようです。ドグマ的な原則よりも、具体的な状況に応じた判断が重要であり、経験を積むにつれて、どのような状況でどのようなアプローチが効果的かを学んでいくことが大切です。

---

## mizchi-emulator の感想

この対談を読んで、非常に興味深いと思ったのは、私自身がキャリアの中でこの両極端の間を行き来してきた経験があるということだ。最初は「Clean
Code」の教えに忠実で、小さなメソッドへの分割とコメントを避けることを信条としていたが、大規模なフロントエンドアプリケーションを構築する中で、その限界を感じるようになった。

特にTypeScriptでのフロントエンド開発において、過度なメソッド分割は型の受け渡しが複雑になり、かえって理解しづらいコードになることがある。Ousterhoutの言う「絡み合い」の問題は、React等のコンポーネントベースのシステムでも顕著に現れる。小さすぎるコンポーネントは、props（引数）の受け渡しが複雑になり、一つの機能を理解するために複数のファイルを行き来する必要が生じる。

コメントについては、実は最近はOusterhoutの立場に近づいている。型システムはコードの「何」を記述するのに優れているが、「なぜ」という意図を表現するには英語（や日本語）でのコメントが不可欠だと感じる。特に複雑なビジネスロジックや、将来の自分や同僚への注意点を伝える場合、適切なコメントは極めて有用だ。

TDDについては中間的な立場を取っている。TDDの規律は価値があるが、実際のプロジェクトでは「テスト→実装→リファクタリング」のサイクルを数秒で回すことは現実的ではないことが多い。複雑なUI実装やパフォーマンス最適化など、最初に設計思考を必要とする場面は確かに存在する。

実践的には、両方のアプローチを状況に応じて使い分けるのが最も効果的だと思う。小さな関数への分割を基本としつつも、「深いモジュール」の価値も認識し、時には複雑なロジックを一箇所にまとめることも重要だ。コメントも同様で、自明なコードには不要だが、複雑な意図やエッジケースの説明には積極的に活用すべきだろう。

結局のところ、ソフトウェア設計は絶対的な正解がない分野だ。経験を積むにつれ、ドグマよりも実用性を重視し、チームやプロジェクトの文脈に最適な判断をすることが大切なのかもしれない。今回の対談が示すように、ベテラン開発者間でさえ意見が分かれる問題であり、それぞれのアプローチの価値と限界を理解することが、より良い設計判断につながるだろう。
