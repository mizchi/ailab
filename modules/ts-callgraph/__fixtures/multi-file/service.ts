// サービスクラスを定義するファイル
import { DerivedEntity } from "./derived.ts";

// データストレージのインターフェース
export interface DataStorage {
  save(id: string, data: string): void;
  load(id: string): string | null;
}

// インメモリストレージの実装
class MemoryStorage implements DataStorage {
  private data: Map<string, string> = new Map();

  save(id: string, data: string): void {
    this.data.set(id, data);
    console.log(`Data saved with id: ${id}`);
  }

  load(id: string): string | null {
    const data = this.data.get(id);
    return data || null;
  }
}

// データサービスクラス
export class DataService {
  private storage: DataStorage;

  constructor(storage?: DataStorage) {
    this.storage = storage || new MemoryStorage();
  }

  // エンティティを保存
  saveEntity(entity: DerivedEntity): void {
    const id = entity.getId();
    const data = entity.serialize();
    this.storage.save(id, data);
  }

  // エンティティを読み込み
  loadEntity(id: string): DerivedEntity | null {
    const data = this.storage.load(id);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return new DerivedEntity(parsed.id, parsed.name);
    } catch (e) {
      console.error("Failed to parse entity data:", e);
      return null;
    }
  }
}
