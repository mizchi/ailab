// ベースクラスと基本的なインターフェースを定義するファイル

// インターフェース
export interface Loggable {
  log(message: string): void;
}

// 基底クラス
export class BaseEntity implements Loggable {
  protected id: string;

  constructor(id: string) {
    this.id = id;
    this.initialize();
  }

  // 初期化メソッド
  protected initialize(): void {
    console.log(`BaseEntity initialized with id: ${this.id}`);
  }

  // ID取得メソッド
  public getId(): string {
    return this.id;
  }

  // ログ出力メソッド
  public log(message: string): void {
    console.log(`[${this.id}] ${message}`);
  }

  // 静的メソッド
  static createDefault(): BaseEntity {
    return new BaseEntity("default");
  }
}

// ユーティリティ関数
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
