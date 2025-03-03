/**
 * パス解析モジュールのテスト
 */

import { expect, test } from "./deps.ts";
import { analyzePath } from "./path-analyzer.ts";
import type { PathInfo } from "./types.ts";

test("analyzePath - primitive values", () => {
  const input: PathInfo[] = [
    {
      segments: [{ type: "key", value: "name", arrayAccess: false }],
      value: "John",
      type: "string",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
    {
      segments: [{ type: "key", value: "age", arrayAccess: false }],
      value: 30,
      type: "number",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
  ];

  const result = analyzePath(input);
  expect(result.type).toBe("object");
  expect(result.children?.get("name")?.type).toBe("primitive");
  expect(result.children?.get("name")?.valueType).toBe("string");
  expect(result.children?.get("age")?.type).toBe("primitive");
  expect(result.children?.get("age")?.valueType).toBe("number");
});

test("analyzePath - arrays", () => {
  const input: PathInfo[] = [
    {
      segments: [{ type: "key", value: "scores", arrayAccess: false }],
      value: [85, 92, 78],
      type: "array",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
    {
      segments: [
        { type: "key", value: "scores", arrayAccess: false },
        { type: "index", value: "0", arrayAccess: true },
      ],
      value: 85,
      type: "number",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
    {
      segments: [
        { type: "key", value: "scores", arrayAccess: false },
        { type: "index", value: "1", arrayAccess: true },
      ],
      value: 92,
      type: "number",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
  ];

  const result = analyzePath(input);
  expect(result.type).toBe("object");
  const scores = result.children?.get("scores");
  expect(scores?.type).toBe("array");
  expect(scores?.children?.get("$")?.type).toBe("primitive");
  expect(scores?.children?.get("$")?.valueType).toBe("number");
});

test("analyzePath - record pattern", () => {
  const input: PathInfo[] = [
    {
      segments: [{ type: "key", value: "preferences", arrayAccess: false }],
      value: {
        theme_dark: true,
        theme_light: false,
      },
      type: "object",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
    {
      segments: [
        { type: "key", value: "preferences", arrayAccess: false },
        { type: "key", value: "theme_dark", arrayAccess: false },
      ],
      value: true,
      type: "boolean",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
    {
      segments: [
        { type: "key", value: "preferences", arrayAccess: false },
        { type: "key", value: "theme_light", arrayAccess: false },
      ],
      value: false,
      type: "boolean",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
  ];

  const result = analyzePath(input);
  const preferences = result.children?.get("preferences");
  expect(preferences?.type).toBe("record");
  expect(preferences?.keyPattern).toBe("snake_case");
  expect(preferences?.valueType).toBe("boolean");
});

test("analyzePath - nested objects", () => {
  const input: PathInfo[] = [
    {
      segments: [
        { type: "key", value: "user", arrayAccess: false },
        { type: "key", value: "name", arrayAccess: false },
      ],
      value: "John",
      type: "string",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
    {
      segments: [
        { type: "key", value: "user", arrayAccess: false },
        { type: "key", value: "age", arrayAccess: false },
      ],
      value: 30,
      type: "number",
      isNullable: false,
      metadata: { occurrences: 1 },
    },
  ];

  const result = analyzePath(input);
  expect(result.type).toBe("object");
  const user = result.children?.get("user");
  expect(user?.type).toBe("object");
  expect(user?.children?.get("name")?.type).toBe("primitive");
  expect(user?.children?.get("name")?.valueType).toBe("string");
  expect(user?.children?.get("age")?.type).toBe("primitive");
  expect(user?.children?.get("age")?.valueType).toBe("number");
});
