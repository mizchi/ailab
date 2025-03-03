// クラスとメソッドの呼び出し関係のサンプル

// 基底クラス
class BaseClass {
  protected value: number;

  constructor(value: number) {
    this.value = value;
    this.initialize();
  }

  // 初期化メソッド
  protected initialize(): void {
    console.log(`BaseClass initialized with value: ${this.value}`);
  }

  // 通常のメソッド
  public getValue(): number {
    return this.value;
  }

  // 静的メソッド
  static createDefault(): BaseClass {
    return new BaseClass(0);
  }
}

// 派生クラス
class DerivedClass extends BaseClass {
  private name: string;

  constructor(value: number, name: string) {
    super(value); // 基底クラスのコンストラクタを呼び出し
    this.name = name;
  }

  // オーバーライドメソッド
  protected override initialize(): void {
    super.initialize(); // 基底クラスのメソッドを呼び出し
    console.log(`DerivedClass initialized with name: ${this.name}`);
  }

  // 新しいメソッド
  public getName(): string {
    return this.name;
  }

  // 静的メソッド
  static createWithName(name: string): DerivedClass {
    return new DerivedClass(0, name);
  }
}

// インターフェース
interface Printable {
  print(): void;
}

// インターフェースを実装するクラス
class PrintableClass implements Printable {
  private content: string;

  constructor(content: string) {
    this.content = content;
  }

  public print(): void {
    console.log(this.content);
  }
}

// クラス式
const AnonymousClass = class {
  private id: number;

  constructor(id: number) {
    this.id = id;
  }

  public getId(): number {
    return this.id;
  }
};

// メイン関数
function main() {
  // 基底クラスのインスタンス作成
  const base = new BaseClass(10);
  console.log(`Base value: ${base.getValue()}`);

  // 静的メソッドの呼び出し
  const defaultBase = BaseClass.createDefault();
  console.log(`Default base value: ${defaultBase.getValue()}`);

  // 派生クラスのインスタンス作成
  const derived = new DerivedClass(20, "Example");
  console.log(`Derived value: ${derived.getValue()}`);
  console.log(`Derived name: ${derived.getName()}`);

  // 静的メソッドの呼び出し
  const namedDerived = DerivedClass.createWithName("Static Example");
  console.log(`Named derived name: ${namedDerived.getName()}`);

  // インターフェースを実装したクラスのインスタンス作成
  const printable = new PrintableClass("Hello, World!");
  printable.print();

  // クラス式のインスタンス作成
  const anonymous = new AnonymousClass(42);
  console.log(`Anonymous ID: ${anonymous.getId()}`);
}

// メイン関数の実行
main();
