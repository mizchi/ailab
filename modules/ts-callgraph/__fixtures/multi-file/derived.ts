// 派生クラスを定義するファイル
import { BaseEntity, generateId, type Loggable } from "./base.ts";

// 追加のインターフェース
export interface Serializable {
  serialize(): string;
}

// 派生クラス
export class DerivedEntity extends BaseEntity implements Serializable {
  private name: string;
  private createdAt: Date;

  constructor(id: string, name: string) {
    super(id); // 基底クラスのコンストラクタを呼び出し
    this.name = name;
    this.createdAt = new Date();
  }

  // オーバーライドメソッド
  protected override initialize(): void {
    super.initialize(); // 基底クラスのメソッドを呼び出し
    console.log(`DerivedEntity initialized with name: ${this.name}`);
  }

  // 新しいメソッド
  public getName(): string {
    return this.name;
  }

  // インターフェースの実装
  public serialize(): string {
    return JSON.stringify({
      id: this.getId(),
      name: this.name,
      createdAt: this.createdAt.toISOString(),
    });
  }

  // 静的メソッド
  static createWithName(name: string): DerivedEntity {
    return new DerivedEntity(generateId(), name);
  }
}

// ヘルパー関数
export function createEntity(name: string): DerivedEntity {
  const id = generateId();
  return new DerivedEntity(id, name);
}
