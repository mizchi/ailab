/**
 * 複雑なデータ構造のテストケース
 */

import { expect, test } from "./deps.ts";
import { TypePredictor } from "./mod.ts";

test("complex - deeply nested objects", () => {
  const predictor = new TypePredictor();
  const input = {
    user: {
      profile: {
        name: {
          first: "John",
          last: "Doe",
          title: null,
        },
        address: {
          street: {
            number: 123,
            name: "Main St",
            apt: null,
          },
          city: "Boston",
          country: "USA",
        },
      },
      settings: {
        preferences: {
          theme_dark: true,
          theme_light: false,
          theme_custom: null,
        },
      },
    },
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);

  // 無効なデータの検証
  const invalidData = {
    user: {
      profile: {
        name: {
          first: 123, // should be string
          last: true, // should be string
        },
      },
    },
  };
  const invalidResult = schema.safeParse(invalidData);
  expect(invalidResult.success).toBe(false);
});

test("complex - multidimensional arrays", () => {
  const predictor = new TypePredictor();
  const input = {
    matrix: [
      [
        [1, 2],
        [3, 4],
      ],
      [
        [5, 6],
        [7, 8],
      ],
    ],
    mixed: [
      [1, "two", true],
      [null, 4, false],
    ],
    jagged: [[1, 2, 3], [4, 5], [6]],
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);

  // 無効なデータの検証
  const invalidData = {
    matrix: [
      [
        ["1", "2"],
        [3, 4],
      ], // 文字列は不可
    ],
  };
  const invalidResult = schema.safeParse(invalidData);
  expect(invalidResult.success).toBe(false);
});

test("complex - mixed type arrays", () => {
  const predictor = new TypePredictor();
  const input = {
    items: [
      { type: "text", value: "Hello" },
      { type: "number", value: 42 },
      { type: "boolean", value: true },
      { type: "null", value: null },
    ],
    tags: ["user", 123, true, null],
    nested: [{ data: [1, 2, 3] }, { data: ["a", "b", "c"] }],
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
});

test("complex - optional fields", () => {
  const predictor = new TypePredictor();
  const input = {
    users: [
      {
        id: 1,
        name: "John",
        email: "john@example.com",
        phone: null,
      },
      {
        id: 2,
        name: "Jane",
        email: null,
        address: {
          city: "Boston",
        },
      },
    ],
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);

  // 一部のフィールドが欠けているデータでも検証可能
  const partialData = {
    users: [
      {
        id: 3,
        name: "Bob",
      },
    ],
  };
  const partialResult = schema.safeParse(partialData);
  expect(partialResult.success).toBe(true);
});

test("complex - record patterns", () => {
  const predictor = new TypePredictor();
  const input = {
    theme: {
      color_primary: "#000000",
      color_secondary: "#ffffff",
      color_accent: null,
    },
    settings: {
      setting_dark_mode: true,
      setting_animations: false,
      setting_notifications: null,
    },
    data: {
      user_1: { name: "John" },
      user_2: { name: "Jane" },
      user_3: null,
    },
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);

  // 新しいキーを追加しても検証可能
  const extendedData = {
    ...input,
    theme: {
      ...input.theme,
      color_highlight: "#ff0000",
    },
  };
  const extendedResult = schema.safeParse(extendedData);
  expect(extendedResult.success).toBe(true);
});

test("complex - real world example - API response", () => {
  const predictor = new TypePredictor();
  const input = {
    status: "success",
    code: 200,
    data: {
      users: [
        {
          id: 1,
          username: "john_doe",
          email: "john@example.com",
          profile: {
            firstName: "John",
            lastName: "Doe",
            age: 30,
            address: {
              street: "123 Main St",
              city: "Boston",
              country: "USA",
            },
            preferences: {
              theme_dark: true,
              theme_compact: false,
              notifications_email: true,
              notifications_push: null,
            },
          },
          stats: {
            posts: 42,
            followers: 100,
            following: 50,
          },
          lastLogin: "2024-02-24T12:00:00Z",
          isActive: true,
          roles: ["user", "admin"],
          metadata: null,
        },
      ],
      pagination: {
        total: 100,
        page: 1,
        perPage: 10,
        hasMore: true,
      },
    },
    meta: {
      requestId: "abc-123",
      processingTime: 0.123,
    },
  };

  const schema = predictor.predict(input);
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);

  // 異なるユーザーデータでも検証可能
  const newUserData = {
    ...input,
    data: {
      users: [
        {
          id: 2,
          username: "jane_doe",
          email: "jane@example.com",
          profile: {
            firstName: "Jane",
            lastName: "Doe",
            age: 28,
            address: {
              street: "456 Oak St",
              city: "New York",
              country: "USA",
            },
            preferences: {
              theme_dark: false,
              theme_compact: true,
              notifications_email: false,
              notifications_push: true,
            },
          },
          stats: {
            posts: 23,
            followers: 150,
            following: 75,
          },
          lastLogin: "2024-02-23T15:30:00Z",
          isActive: true,
          roles: ["user"],
          metadata: {
            customField: "value",
          },
        },
      ],
      pagination: {
        total: 100,
        page: 2,
        perPage: 10,
        hasMore: true,
      },
    },
  };
  const newUserResult = schema.safeParse(newUserData);
  expect(newUserResult.success).toBe(true);
});
