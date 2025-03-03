/**
 * 顧客アプリケーションサービス
 * 顧客に関するユースケースを実装
 */
import {
  activateCustomer,
  changeCustomerEmail,
  changeCustomerName,
  createCustomer,
  type CreateCustomerParams,
  type Customer,
  deactivateCustomer,
} from "../domain/entities/customer.ts";
import type { CustomerRepository } from "../domain/repositories/customerRepository.ts";
import { createEmail } from "../domain/valueObjects/email.ts";
import { validateCustomerId } from "../domain/valueObjects/ids.ts";
import {
  type AppError,
  err,
  NotFoundError,
  ok,
  type Result,
  ValidationError,
} from "../core/result.ts";

/**
 * 顧客登録DTOインターフェース
 */
export interface RegisterCustomerDto {
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * 顧客情報更新DTOインターフェース
 */
export interface UpdateCustomerDto {
  customerId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

/**
 * 顧客アプリケーションサービス
 */
export class CustomerApplicationService {
  /**
   * コンストラクタ
   * @param customerRepository 顧客リポジトリの実装
   */
  constructor(private readonly customerRepository: CustomerRepository) {}

  /**
   * 顧客登録ユースケース
   * @param dto 顧客登録情報
   * @returns Result<string, AppError> 登録した顧客ID
   */
  async registerCustomer(
    dto: RegisterCustomerDto,
  ): Promise<Result<string, AppError>> {
    // メールアドレスの重複チェック
    const emailResult = createEmail(dto.email);
    if (emailResult.isErr()) {
      return err(emailResult.error);
    }

    const emailExistsResult = await this.customerRepository.existsByEmail(
      emailResult.value,
    );
    if (emailExistsResult.isErr()) {
      return err(emailExistsResult.error);
    }

    if (emailExistsResult.value) {
      return err(
        new ValidationError(
          `メールアドレス ${dto.email} は既に使用されています`,
        ),
      );
    }

    // 顧客エンティティの作成
    const customerParams: CreateCustomerParams = {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
    };

    const customerResult = createCustomer(customerParams);
    if (customerResult.isErr()) {
      return err(customerResult.error);
    }

    // 顧客の保存
    const saveResult = await this.customerRepository.save(customerResult.value);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(customerResult.value.id);
  }

  /**
   * 顧客情報更新ユースケース
   * @param dto 更新情報
   * @returns Result<void, AppError>
   */
  async updateCustomer(
    dto: UpdateCustomerDto,
  ): Promise<Result<void, AppError>> {
    // 顧客IDの検証
    const customerIdResult = validateCustomerId(dto.customerId);
    if (customerIdResult.isErr()) {
      return err(customerIdResult.error);
    }

    // 顧客の取得
    const customerResult = await this.customerRepository.findById(
      customerIdResult.value,
    );
    if (customerResult.isErr()) {
      return err(customerResult.error);
    }

    const customer = customerResult.value;
    if (!customer) {
      return err(new NotFoundError("顧客", dto.customerId));
    }

    // 更新処理
    let updatedCustomer: Customer = customer;

    // 名前の更新
    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      const nameResult = changeCustomerName(
        updatedCustomer,
        dto.firstName ?? customer.firstName,
        dto.lastName ?? customer.lastName,
      );

      if (nameResult.isErr()) {
        return err(nameResult.error);
      }

      updatedCustomer = nameResult.value;
    }

    // メールアドレスの更新
    if (dto.email !== undefined) {
      // メールアドレスの重複チェック（自分以外）
      const emailResult = createEmail(dto.email);
      if (emailResult.isErr()) {
        return err(emailResult.error);
      }

      // 現在のメールアドレスと同じなら更新不要
      if (updatedCustomer.email !== emailResult.value) {
        const emailExistsResult = await this.customerRepository.existsByEmail(
          emailResult.value,
        );
        if (emailExistsResult.isErr()) {
          return err(emailExistsResult.error);
        }

        if (emailExistsResult.value) {
          return err(
            new ValidationError(
              `メールアドレス ${dto.email} は既に使用されています`,
            ),
          );
        }

        const emailUpdateResult = changeCustomerEmail(
          updatedCustomer,
          dto.email,
        );
        if (emailUpdateResult.isErr()) {
          return err(emailUpdateResult.error);
        }

        updatedCustomer = emailUpdateResult.value;
      }
    }

    // 顧客の保存
    const saveResult = await this.customerRepository.save(updatedCustomer);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(undefined);
  }

  /**
   * 顧客詳細取得ユースケース
   * @param customerId 顧客ID
   * @returns Result<Customer, AppError>
   */
  async getCustomerDetail(
    customerId: string,
  ): Promise<Result<Customer, AppError>> {
    // 顧客IDの検証
    const customerIdResult = validateCustomerId(customerId);
    if (customerIdResult.isErr()) {
      return err(customerIdResult.error);
    }

    // 顧客の取得
    const customerResult = await this.customerRepository.findById(
      customerIdResult.value,
    );
    if (customerResult.isErr()) {
      return err(customerResult.error);
    }

    const customer = customerResult.value;
    if (!customer) {
      return err(new NotFoundError("顧客", customerId));
    }

    return ok(customer);
  }

  /**
   * 顧客一覧取得ユースケース
   * @param activeOnly アクティブな顧客のみ取得する場合true
   * @returns Result<Customer[], AppError>
   */
  async listCustomers(
    activeOnly = false,
  ): Promise<Result<Customer[], AppError>> {
    if (activeOnly) {
      return await this.customerRepository.findAllActive();
    } else {
      return await this.customerRepository.findAll();
    }
  }

  /**
   * 顧客アクティブ化ユースケース
   * @param customerId 顧客ID
   * @returns Result<void, AppError>
   */
  async activateCustomer(customerId: string): Promise<Result<void, AppError>> {
    // 顧客IDの検証
    const customerIdResult = validateCustomerId(customerId);
    if (customerIdResult.isErr()) {
      return err(customerIdResult.error);
    }

    // 顧客の取得
    const customerResult = await this.customerRepository.findById(
      customerIdResult.value,
    );
    if (customerResult.isErr()) {
      return err(customerResult.error);
    }

    const customer = customerResult.value;
    if (!customer) {
      return err(new NotFoundError("顧客", customerId));
    }

    // すでにアクティブなら何もしない
    if (customer.isActive) {
      return ok(undefined);
    }

    // 顧客のアクティブ化
    const activatedCustomer = activateCustomer(customer);

    // 顧客の保存
    const saveResult = await this.customerRepository.save(activatedCustomer);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(undefined);
  }

  /**
   * 顧客非アクティブ化ユースケース
   * @param customerId 顧客ID
   * @returns Result<void, AppError>
   */
  async deactivateCustomer(
    customerId: string,
  ): Promise<Result<void, AppError>> {
    // 顧客IDの検証
    const customerIdResult = validateCustomerId(customerId);
    if (customerIdResult.isErr()) {
      return err(customerIdResult.error);
    }

    // 顧客の取得
    const customerResult = await this.customerRepository.findById(
      customerIdResult.value,
    );
    if (customerResult.isErr()) {
      return err(customerResult.error);
    }

    const customer = customerResult.value;
    if (!customer) {
      return err(new NotFoundError("顧客", customerId));
    }

    // すでに非アクティブなら何もしない
    if (!customer.isActive) {
      return ok(undefined);
    }

    // 顧客の非アクティブ化
    const deactivatedCustomer = deactivateCustomer(customer);

    // 顧客の保存
    const saveResult = await this.customerRepository.save(deactivatedCustomer);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(undefined);
  }

  /**
   * 顧客削除ユースケース
   * @param customerId 顧客ID
   * @returns Result<void, AppError>
   */
  async deleteCustomer(customerId: string): Promise<Result<void, AppError>> {
    // 顧客IDの検証
    const customerIdResult = validateCustomerId(customerId);
    if (customerIdResult.isErr()) {
      return err(customerIdResult.error);
    }

    // 顧客の削除
    return await this.customerRepository.delete(customerIdResult.value);
  }
}
