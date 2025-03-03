import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";
import {
  createEmail,
  emailEquals,
  getDomain,
  getLocalPart,
  maskEmail,
} from "../../../domain/valueObjects/email.ts";
import { ValidationError } from "../../../core/result.ts";

test("createEmail - 有効なメールアドレスでEmail値オブジェクトを作成できる", () => {
  const emailResult = createEmail("test@example.com");

  expect(emailResult.isOk()).toBe(true);
  if (emailResult.isOk()) {
    expect(String(emailResult.value)).toBe("test@example.com");
  }
});

test("createEmail - 無効なメールアドレスでエラーを返す", () => {
  const invalidEmails = [
    "", // 空文字
    "invalid", // @がない
    "test@", // ドメインがない
    "@example.com", // ローカルパートがない
    "test@example", // TLDがない
    "a".repeat(257), // 長すぎる
  ];

  for (const invalidEmail of invalidEmails) {
    const emailResult = createEmail(invalidEmail);

    expect(emailResult.isErr()).toBe(true);
    if (emailResult.isErr()) {
      expect(emailResult.error).toBeInstanceOf(ValidationError);
    }
  }
});

test("emailEquals - 同じメールアドレスの等価性を判定できる", () => {
  const email1Result = createEmail("test@example.com");
  const email2Result = createEmail("test@example.com");
  const email3Result = createEmail("different@example.com");

  expect(email1Result.isOk() && email2Result.isOk() && email3Result.isOk())
    .toBe(true);

  if (email1Result.isOk() && email2Result.isOk() && email3Result.isOk()) {
    expect(emailEquals(email1Result.value, email2Result.value)).toBe(true);
    expect(emailEquals(email1Result.value, email3Result.value)).toBe(false);
  }
});

test("emailEquals - 大文字小文字を区別せずに等価性を判定できる", () => {
  const email1Result = createEmail("Test@Example.com");
  const email2Result = createEmail("test@example.com");

  expect(email1Result.isOk() && email2Result.isOk()).toBe(true);

  if (email1Result.isOk() && email2Result.isOk()) {
    expect(emailEquals(email1Result.value, email2Result.value)).toBe(true);
  }
});

test("getDomain - メールアドレスのドメイン部分を取得できる", () => {
  const emailResult = createEmail("user@example.com");

  expect(emailResult.isOk()).toBe(true);
  if (emailResult.isOk()) {
    expect(getDomain(emailResult.value)).toBe("example.com");
  }
});

test("getLocalPart - メールアドレスのローカル部分を取得できる", () => {
  const emailResult = createEmail("user@example.com");

  expect(emailResult.isOk()).toBe(true);
  if (emailResult.isOk()) {
    expect(getLocalPart(emailResult.value)).toBe("user");
  }
});

test("maskEmail - メールアドレスをマスクできる", () => {
  const emailResult = createEmail("user@example.com");

  expect(emailResult.isOk()).toBe(true);
  if (emailResult.isOk()) {
    expect(maskEmail(emailResult.value)).toBe("u***@example.com");
  }
});

test("maskEmail - 短いローカル部分を持つメールアドレスを適切にマスクできる", () => {
  const emailResult = createEmail("a@example.com");

  expect(emailResult.isOk()).toBe(true);
  if (emailResult.isOk()) {
    expect(maskEmail(emailResult.value)).toBe("a***@example.com");
  }
});
