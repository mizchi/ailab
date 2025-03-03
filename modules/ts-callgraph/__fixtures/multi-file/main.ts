// メインファイル - 他のモジュールを使用する
import { BaseEntity } from "./base.ts";
import { createEntity, DerivedEntity, type Serializable } from "./derived.ts";
import { DataService } from "./service.ts";

// シリアライズ可能なオブジェクトを処理する関数
function processSerializable(obj: Serializable): void {
  console.log("Processing serialized data:");
  console.log(obj.serialize());
}

// メイン関数
function main() {
  // BaseEntityの使用
  const base = new BaseEntity("base-1");
  base.log("Base entity created");

  // 静的メソッドの使用
  const defaultBase = BaseEntity.createDefault();
  console.log(`Default base ID: ${defaultBase.getId()}`);

  // DerivedEntityの使用
  const derived = new DerivedEntity("derived-1", "Example");
  derived.log("Derived entity created");
  console.log(`Derived name: ${derived.getName()}`);

  // ヘルパー関数の使用
  const entity = createEntity("Helper Created");
  console.log(`Entity from helper: ${entity.getId()} - ${entity.getName()}`);

  // 静的メソッドの使用
  const namedEntity = DerivedEntity.createWithName("Static Created");
  console.log(`Named entity: ${namedEntity.getName()}`);

  // インターフェースを使った処理
  processSerializable(derived);

  // サービスの使用
  const service = new DataService();
  service.saveEntity(derived);

  const loadedEntity = service.loadEntity("derived-1");
  if (loadedEntity) {
    console.log(`Loaded entity: ${loadedEntity.getName()}`);
  }
}

// メイン関数の実行
main();
