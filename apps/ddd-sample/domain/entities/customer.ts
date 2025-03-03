/**
 * Customer（顧客）エンティティの実装
 * 関数型アプローチによる不変エンティティ
 */
import type { CustomerId, Email, Entity } from "../types.ts";
import { err, ok, type Result, ValidationError } from "../../core/result.ts";
import { createEmail } from "../valueObjects/email.ts";
import { generateCustomerId, validateCustomerId } from "../valueObjects/ids.ts";

/**
 * 顧客エンティティの構造
 */
export interface Customer extends Entity<CustomerId> {
  readonly id: CustomerId;
  readonly email: Email;
  readonly firstName: string;
  readonly lastName: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * 顧客作成時のパラメータ
 */
export interface CreateCustomerParams {
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * 新規顧客エンティティを作成する
 * @param params 作成パラメータ
 * @returns Result<Customer, ValidationError>
 */
export function createCustomer(
  params: CreateCustomerParams,
): Result<Customer, ValidationError> {
  // メールアドレスのバリデーション
  const emailResult = createEmail(params.email);
  if (emailResult.isErr()) {
    return err(emailResult.error);
  }

  // 名前のバリデーション
  if (!params.firstName.trim()) {
    return err(new ValidationError("名前（名）は必須です"));
  }

  if (!params.lastName.trim()) {
    return err(new ValidationError("名前（姓）は必須です"));
  }

  // 新しい顧客IDを生成
  const id = generateCustomerId();
  const now = new Date();

  // 顧客エンティティの生成
  return ok({
    id,
    email: emailResult.value,
    firstName: params.firstName.trim(),
    lastName: params.lastName.trim(),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * 既存の顧客エンティティを再構築する（リポジトリからの復元など）
 * @param data 顧客データ
 * @returns Result<Customer, ValidationError>
 */
export function reconstructCustomer(data: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}): Result<Customer, ValidationError> {
  // IDのバリデーション
  const idResult = validateCustomerId(data.id);
  if (idResult.isErr()) {
    return err(idResult.error);
  }

  // メールアドレスのバリデーション
  const emailResult = createEmail(data.email);
  if (emailResult.isErr()) {
    return err(emailResult.error);
  }

  // 顧客エンティティの再構築
  return ok({
    id: idResult.value,
    email: emailResult.value,
    firstName: data.firstName,
    lastName: data.lastName,
    isActive: data.isActive,
    createdAt: data.createdAt instanceof Date
      ? data.createdAt
      : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Date
      ? data.updatedAt
      : new Date(data.updatedAt),
  });
}

/**
 * 顧客の氏名を変更する
 * @param customer 対象顧客
 * @param firstName 新しい名
 * @param lastName 新しい姓
 * @returns Result<Customer, ValidationError>
 */
export function changeCustomerName(
  customer: Customer,
  firstName: string,
  lastName: string,
): Result<Customer, ValidationError> {
  if (!firstName.trim()) {
    return err(new ValidationError("名前（名）は必須です"));
  }

  if (!lastName.trim()) {
    return err(new ValidationError("名前（姓）は必須です"));
  }

  // 不変性を保つため、新しいオブジェクトを返す
  return ok({
    ...customer,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    updatedAt: new Date(),
  });
}

/**
 * 顧客のメールアドレスを変更する
 * @param customer 対象顧客
 * @param newEmail 新しいメールアドレス
 * @returns Result<Customer, ValidationError>
 */
export function changeCustomerEmail(
  customer: Customer,
  newEmail: string,
): Result<Customer, ValidationError> {
  const emailResult = createEmail(newEmail);
  if (emailResult.isErr()) {
    return err(emailResult.error);
  }

  // 不変性を保つため、新しいオブジェクトを返す
  return ok({
    ...customer,
    email: emailResult.value,
    updatedAt: new Date(),
  });
}

/**
 * 顧客を非アクティブ化する
 * @param customer 対象顧客
 * @returns Customer
 */
export function deactivateCustomer(customer: Customer): Customer {
  // すでに非アクティブなら同じオブジェクトを返す
  if (!customer.isActive) {
    return customer;
  }

  // 不変性を保つため、新しいオブジェクトを返す
  return {
    ...customer,
    isActive: false,
    updatedAt: new Date(),
  };
}

/**
 * 顧客をアクティブ化する
 * @param customer 対象顧客
 * @returns Customer
 */
export function activateCustomer(customer: Customer): Customer {
  // すでにアクティブなら同じオブジェクトを返す
  if (customer.isActive) {
    return customer;
  }

  // 不変性を保つため、新しいオブジェクトを返す
  return {
    ...customer,
    isActive: true,
    updatedAt: new Date(),
  };
}

/**
 * 顧客のフルネームを取得する
 * @param customer 顧客
 * @returns フルネーム
 */
export function getFullName(customer: Customer): string {
  return `${customer.lastName} ${customer.firstName}`;
}
