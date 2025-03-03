/**
 * 顧客リポジトリのインメモリ実装
 */
import type { Customer } from "../../domain/entities/customer.ts";
import type { CustomerRepository } from "../../domain/repositories/customerRepository.ts";
import type { CustomerId, Email } from "../../domain/types.ts";
import {
  err,
  NotFoundError,
  ok,
  type Result,
  type ValidationError,
} from "../../core/result.ts";
import type { createEmail } from "../../domain/valueObjects/email.ts";
import type { validateCustomerId } from "../../domain/valueObjects/ids.ts";

/**
 * インメモリ顧客リポジトリ実装
 * メモリ内にデータを保持するシンプルな実装
 * テストやプロトタイピングに適している
 */
export class InMemoryCustomerRepository implements CustomerRepository {
  // メモリ内のデータストア
  private customers: Map<string, Customer> = new Map();

  /**
   * IDで顧客を検索する
   * @param id 検索する顧客ID
   * @returns Result<Customer | null, ValidationError | NotFoundError>
   */
  async findById(
    id: CustomerId,
  ): Promise<Result<Customer | null, ValidationError | NotFoundError>> {
    const customer = this.customers.get(id);
    return ok(customer || null);
  }

  /**
   * メールアドレスで顧客を検索する
   * @param email 検索するメールアドレス
   * @returns Result<Customer | null, ValidationError | NotFoundError>
   */
  async findByEmail(
    email: Email,
  ): Promise<Result<Customer | null, ValidationError | NotFoundError>> {
    for (const customer of this.customers.values()) {
      if (customer.email === email) {
        return ok(customer);
      }
    }
    return ok(null);
  }

  /**
   * すべての顧客を取得する
   * @returns Result<Customer[], ValidationError | NotFoundError>
   */
  async findAll(): Promise<
    Result<Customer[], ValidationError | NotFoundError>
  > {
    return ok(Array.from(this.customers.values()));
  }

  /**
   * アクティブな顧客のみを取得する
   * @returns Result<Customer[], ValidationError | NotFoundError>
   */
  async findAllActive(): Promise<
    Result<Customer[], ValidationError | NotFoundError>
  > {
    const activeCustomers = Array.from(this.customers.values()).filter(
      (customer) => customer.isActive,
    );
    return ok(activeCustomers);
  }

  /**
   * 顧客を保存する（新規作成または更新）
   * @param customer 保存する顧客エンティティ
   * @returns Result<void, ValidationError>
   */
  async save(customer: Customer): Promise<Result<void, ValidationError>> {
    this.customers.set(customer.id, { ...customer });
    return ok(undefined);
  }

  /**
   * 顧客を削除する
   * @param id 削除する顧客ID
   * @returns Result<void, ValidationError | NotFoundError>
   */
  async delete(
    id: CustomerId,
  ): Promise<Result<void, ValidationError | NotFoundError>> {
    if (!this.customers.has(id)) {
      return err(new NotFoundError("顧客", id));
    }

    this.customers.delete(id);
    return ok(undefined);
  }

  /**
   * IDの存在チェック
   * @param id チェックする顧客ID
   * @returns Result<boolean, ValidationError>
   */
  async exists(id: CustomerId): Promise<Result<boolean, ValidationError>> {
    return ok(this.customers.has(id));
  }

  /**
   * メールアドレスの存在チェック
   * @param email チェックするメールアドレス
   * @returns Result<boolean, ValidationError>
   */
  async existsByEmail(email: Email): Promise<Result<boolean, ValidationError>> {
    for (const customer of this.customers.values()) {
      if (customer.email === email) {
        return ok(true);
      }
    }
    return ok(false);
  }

  /**
   * リポジトリを空にする（テスト用）
   */
  clear(): void {
    this.customers.clear();
  }

  /**
   * サンプルデータでリポジトリを初期化する（デモ・テスト用）
   */
  async initializeWithSampleData(): Promise<void> {
    // 既存のデータをクリア
    this.clear();

    // サンプル顧客データの作成
    const customers: Customer[] = [
      {
        id: "cust_sample001" as CustomerId,
        email: "yamada.taro@example.com" as Email,
        firstName: "太郎",
        lastName: "山田",
        isActive: true,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      },
      {
        id: "cust_sample002" as CustomerId,
        email: "suzuki.hanako@example.com" as Email,
        firstName: "花子",
        lastName: "鈴木",
        isActive: true,
        createdAt: new Date("2024-01-02T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
      },
      {
        id: "cust_sample003" as CustomerId,
        email: "tanaka.jiro@example.com" as Email,
        firstName: "次郎",
        lastName: "田中",
        isActive: false,
        createdAt: new Date("2024-01-03T00:00:00Z"),
        updatedAt: new Date("2024-01-10T00:00:00Z"),
      },
    ];

    // サンプルデータの保存
    for (const customer of customers) {
      await this.save(customer);
    }
  }
}
