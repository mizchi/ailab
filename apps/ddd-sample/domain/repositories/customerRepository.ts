/**
 * 顧客リポジトリのインターフェース定義
 */
import type { Customer } from "../entities/customer.ts";
import type { CustomerId, Email } from "../types.ts";
import type {
  NotFoundError,
  Result,
  ValidationError,
} from "../../core/result.ts";

/**
 * 顧客リポジトリのインターフェース
 * ドメイン層ではインターフェースのみを定義し、具体的な実装はインフラストラクチャ層で行う
 */
export interface CustomerRepository {
  /**
   * IDで顧客を検索する
   * @param id 検索する顧客ID
   * @returns Result<Customer | null, ValidationError | NotFoundError>
   */
  findById(
    id: CustomerId,
  ): Promise<Result<Customer | null, ValidationError | NotFoundError>>;

  /**
   * メールアドレスで顧客を検索する
   * @param email 検索するメールアドレス
   * @returns Result<Customer | null, ValidationError | NotFoundError>
   */
  findByEmail(
    email: Email,
  ): Promise<Result<Customer | null, ValidationError | NotFoundError>>;

  /**
   * すべての顧客を取得する
   * @returns Result<Customer[], ValidationError | NotFoundError>
   */
  findAll(): Promise<Result<Customer[], ValidationError | NotFoundError>>;

  /**
   * アクティブな顧客のみを取得する
   * @returns Result<Customer[], ValidationError | NotFoundError>
   */
  findAllActive(): Promise<Result<Customer[], ValidationError | NotFoundError>>;

  /**
   * 顧客を保存する（新規作成または更新）
   * @param customer 保存する顧客エンティティ
   * @returns Result<void, ValidationError>
   */
  save(customer: Customer): Promise<Result<void, ValidationError>>;

  /**
   * 顧客を削除する
   * @param id 削除する顧客ID
   * @returns Result<void, ValidationError | NotFoundError>
   */
  delete(
    id: CustomerId,
  ): Promise<Result<void, ValidationError | NotFoundError>>;

  /**
   * IDの存在チェック
   * @param id チェックする顧客ID
   * @returns Result<boolean, ValidationError>
   */
  exists(id: CustomerId): Promise<Result<boolean, ValidationError>>;

  /**
   * メールアドレスの存在チェック
   * @param email チェックするメールアドレス
   * @returns Result<boolean, ValidationError>
   */
  existsByEmail(email: Email): Promise<Result<boolean, ValidationError>>;
}
