/* @script */
/**
 * オブジェクトから指定したパスの値を再帰的に取得する
 *
 * 使用例:
 * ```ts
 * const obj = { a: { b: 1 } };
 * dig(obj, "a.b") // => 1
 * dig(obj, ["a", "b"]) // => 1
 * dig(obj, "a.*") // => { b: 1 }
 * dig(obj, ["a", "*"]) // => { b: 1 }
 *
 * // 正規表現 (digUntyped のみ)
 * digUntyped(obj, ["a", /b|c/]) // => { b: 1, c: 2 }
 *
 * // オブジェクトクエリ (digUntyped のみ)
 * digUntyped(obj, ["users", { id: (v) => v.id }]) // => { user1: "id1", user2: "id2" }
 *
 * // 特殊クエリ
 * digUntyped(obj, ["a", "$keys"]) // => ["x", "y"]
 * digUntyped(obj, ["a", "$values"]) // => [1, 2]
 * digUntyped(obj, ["arr", "$flat"]) // => [1, 2, 3]
 * digUntyped(obj, ["a", "$pick{x,y}"]) // => { x: 1, y: 2 }
 * digUntyped(obj, ["a", "$exclude{x,y}"]) // => { z: 3 }
 * ```
 */

// 型定義
type Split<S extends string> = S extends `${infer T}.${infer U}`
  ? [T, ...Split<U>]
  : [S];

type DeepValue<T, P extends readonly string[]> = P extends [] ? T
  : P extends readonly [infer First, ...infer Rest]
    ? First extends "*"
      ? Rest extends readonly string[]
        ? { [K in keyof T]: DeepValue<T[K], Rest> }
      : never
    : First extends keyof T
      ? Rest extends readonly string[] ? DeepValue<T[First], Rest>
      : never
    : never
  : never;

// クエリ型の定義
export type StringQuery = string;
export type ArrayQuery = readonly string[];
export type Query = StringQuery | ArrayQuery;

type QueryToArray<Q> = Q extends StringQuery ? Split<Q>
  : Q extends ArrayQuery ? Q
  : never;

/**
 * 型推論付きのdeep picker
 */
export function dig<T, Q extends Query>(
  obj: T,
  query: Q,
): DeepValue<T, QueryToArray<Q>> {
  return digUntyped(obj, query) as DeepValue<T, QueryToArray<Q>>;
}

type MapFunction = (value: unknown) => unknown;
type ObjectQuery = {
  [key: string]: MapFunction | { [key: string]: MapFunction | ObjectQuery };
};
type UntypedArrayQuery = ReadonlyArray<string | RegExp | ObjectQuery>;
type UntypedQuery = StringQuery | UntypedArrayQuery;

/**
 * 特殊クエリのパース
 */
function parseSpecialQuery(
  query: string,
): { type: string; args: string[] } | null {
  const match = query.match(/^\$(\w+)\{([^}]*)\}$/);
  if (!match) return null;
  const [, type, argsStr] = match;
  const args = argsStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { type, args };
}

/**
 * オブジェクトの値を再帰的に変換する
 */
function mapObject(obj: unknown, query: ObjectQuery): unknown {
  if (typeof obj !== "object" || obj === null) return undefined;

  const result: Record<string, unknown> = {};

  // オブジェクトの各キーに対して処理
  for (const [key, value] of Object.entries(obj)) {
    // クエリにキーが存在する場合のみ処理
    if (key in query) {
      const transform = query[key];
      if (typeof transform === "function") {
        // 関数の場合、変換を適用
        result[key] = transform(value);
      } else if (typeof transform === "object" && transform !== null) {
        // オブジェクトの場合、再帰的に処理
        const transformed = mapObject(value, transform);
        if (transformed !== undefined) {
          result[key] = transformed;
        }
      }
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * 型推論なしの汎用deep picker
 * 配列クエリの場合、正規表現によるマッチングをサポート
 */
export function digUntyped(obj: unknown, query: UntypedQuery): unknown {
  const parts = typeof query === "string" ? query.split(".") : query;
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null) return undefined;

    if (part === "*") {
      if (typeof current !== "object") return undefined;

      const result: Record<string, unknown> = {};
      for (const key in current as object) {
        result[key] = (current as Record<string, unknown>)[key];
      }
      current = result;
      continue;
    }

    if (part === "$keys") {
      if (typeof current !== "object") return undefined;
      current = Object.keys(current as object);
      continue;
    }

    if (part === "$values") {
      if (typeof current !== "object") return undefined;
      current = Object.values(current as object);
      continue;
    }

    if (part === "$flat") {
      if (!Array.isArray(current)) return undefined;
      current = current.flat();
      continue;
    }

    if (typeof part === "string") {
      const specialQuery = parseSpecialQuery(part);
      if (specialQuery) {
        if (typeof current !== "object" || current === null) return undefined;

        const result: Record<string, unknown> = {};
        const currentObj = current as Record<string, unknown>;

        if (specialQuery.type === "pick") {
          for (const key of specialQuery.args) {
            if (key in currentObj) {
              result[key] = currentObj[key];
            }
          }
          current = result;
          continue;
        }

        if (specialQuery.type === "exclude") {
          for (const key in currentObj) {
            if (!specialQuery.args.includes(key)) {
              result[key] = currentObj[key];
            }
          }
          current = result;
          continue;
        }
      }
    }

    if (part instanceof RegExp) {
      if (typeof current !== "object") return undefined;

      const result: Record<string, unknown> = {};
      for (const key in current as object) {
        if (part.test(key)) {
          result[key] = (current as Record<string, unknown>)[key];
        }
      }
      current = result;
      continue;
    }

    if (typeof part === "object" && part !== null) {
      if (typeof current !== "object") return undefined;
      current = mapObject(current, part);
      continue;
    }

    if (Array.isArray(current)) {
      if (!/^\d+$/.test(part)) return undefined;
      current = current[Number(part)];
      continue;
    }

    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

// テストケース
if (import.meta.main) {
  console.log("Running manual tests...");
  const testObj = {
    a: {
      b: 1,
      c: "hello",
      d: true,
    },
    arr: [1, 2, [3, 4], [5, [6]]],
    items: {
      item1: { value: 1 },
      item2: { value: 2 },
    },
    users: {
      user1: { id: "id1", name: "Alice", age: 20 },
      user2: { id: "id2", name: "Bob", age: 25 },
    },
  };

  console.log(dig(testObj, "a")); // { b: 1, c: "hello", d: true }
  console.log(dig(testObj, ["a"] as const)); // { b: 1, c: "hello", d: true }
  console.log(dig(testObj, "a.b")); // 1
  console.log(dig(testObj, ["a", "b"] as const)); // 1
  console.log(digUntyped(testObj, ["a", /b|c/])); // { b: 1, c: "hello" }
  console.log(digUntyped(testObj, ["users", { user1: (v: any) => v.id }])); // { user1: "id1" }
  console.log(digUntyped(testObj, ["a", "$keys"])); // ["b", "c", "d"]
  console.log(digUntyped(testObj, ["a", "$values"])); // [1, "hello", true]
  console.log(digUntyped(testObj, ["arr", "$flat"])); // [1, 2, 3, 4, 5, [6]]
  console.log(digUntyped(testObj, ["a", "$pick{b,c}"])); // { b: 1, c: "hello" }
  console.log(digUntyped(testObj, ["a", "$exclude{b}"])); // { c: "hello", d: true }
}

// Unit Tests
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("dig - string query basic object access", () => {
  const obj = { a: { b: 1 } };
  expect(dig(obj, "a")).toEqual({ b: 1 });
  expect(dig(obj, "a.b")).toBe(1);
});

test("dig - array query basic object access", () => {
  const obj = { a: { b: 1 } };
  expect(dig(obj, ["a"] as const)).toEqual({ b: 1 });
  expect(dig(obj, ["a", "b"] as const)).toBe(1);
});

test("dig - string query array access", () => {
  const obj = { arr: [1, 2, { x: "y" }] };
  expect(dig(obj, "arr")).toEqual([1, 2, { x: "y" }]);
  expect(dig(obj, "arr.0")).toBe(1);
  expect(dig(obj, "arr.2.x")).toBe("y");
});

test("dig - array query array access", () => {
  const obj = { arr: [1, 2, { x: "y" }] };
  expect(dig(obj, ["arr"] as const)).toEqual([1, 2, { x: "y" }]);
  expect(dig(obj, ["arr", "0"] as const)).toBe(1);
  expect(dig(obj, ["arr", "2", "x"] as const)).toBe("y");
});

test("dig - string query wildcard", () => {
  const obj = {
    items: {
      item1: { value: 1 },
      item2: { value: 2 },
    },
  };
  expect(dig(obj, "items.*")).toEqual({
    item1: { value: 1 },
    item2: { value: 2 },
  });
});

test("dig - array query wildcard", () => {
  const obj = {
    items: {
      item1: { value: 1 },
      item2: { value: 2 },
    },
  };
  expect(dig(obj, ["items", "*"] as const)).toEqual({
    item1: { value: 1 },
    item2: { value: 2 },
  });
});

test("digUntyped - regex query", () => {
  const obj = {
    items: {
      item1: { value: 1 },
      item2: { value: 2 },
      other: { value: 3 },
    },
  };

  // 単純な正規表現マッチ
  expect(digUntyped(obj, ["items", /^item/])).toEqual({
    item1: { value: 1 },
    item2: { value: 2 },
  });

  // 複数のプロパティにマッチ
  const complexObj = {
    data: {
      user1_name: "Alice",
      user1_age: 20,
      user2_name: "Bob",
      user2_age: 25,
      other_info: "test",
    },
  };

  expect(digUntyped(complexObj, ["data", /user\d+_name/])).toEqual({
    user1_name: "Alice",
    user2_name: "Bob",
  });

  // 正規表現と文字列の組み合わせ
  const result = digUntyped(complexObj, ["data", /user1_/]);
  expect(result).toEqual({
    user1_name: "Alice",
    user1_age: 20,
  });
});

test("digUntyped - object query", () => {
  const obj = {
    users: {
      user1: { id: "id1", name: "Alice", age: 20 },
      user2: { id: "id2", name: "Bob", age: 25 },
    },
    items: {
      item1: { id: 1, value: 100 },
      item2: { id: 2, value: 200 },
    },
  };

  // 単純な値の変換
  expect(
    digUntyped(obj, [
      "users",
      {
        user1: (v: any) => v.id,
      },
    ]),
  ).toEqual({
    user1: "id1",
  });

  // 複数のキーと変換
  expect(
    digUntyped(obj, [
      "users",
      {
        user1: (v: any) => ({ id: v.id, name: v.name }),
        user2: (v: any) => v.id,
      },
    ]),
  ).toEqual({
    user1: { id: "id1", name: "Alice" },
    user2: "id2",
  });

  // ネストされた変換
  const nested = {
    data: {
      users: {
        user1: { profile: { id: "id1", name: "Alice" } },
        user2: { profile: { id: "id2", name: "Bob" } },
      },
    },
  };

  expect(
    digUntyped(nested, [
      "data",
      "users",
      {
        user1: { profile: (v: any) => v.id },
        user2: { profile: (v: any) => v.name },
      },
    ]),
  ).toEqual({
    user1: { profile: "id1" },
    user2: { profile: "Bob" },
  });
});

test("digUntyped - $keys query", () => {
  const obj = {
    users: {
      user1: { id: "id1", name: "Alice" },
      user2: { id: "id2", name: "Bob" },
    },
    items: {
      item1: { value: 1 },
      item2: { value: 2 },
    },
  };

  // トップレベルのキー
  expect(digUntyped(obj, ["$keys"])).toEqual(["users", "items"]);

  // ネストされたオブジェクトのキー
  expect(digUntyped(obj, ["users", "$keys"])).toEqual(["user1", "user2"]);

  // オブジェクトの値のキー
  expect(digUntyped(obj, ["users", "user1", "$keys"])).toEqual(["id", "name"]);

  // 存在しないパスの場合
  expect(digUntyped(obj, ["nonexistent", "$keys"])).toBe(undefined);

  // プリミティブ値の場合
  expect(digUntyped(obj, ["users", "user1", "id", "$keys"])).toBe(undefined);
});

test("digUntyped - $values query", () => {
  const obj = {
    users: {
      user1: { id: "id1", name: "Alice" },
      user2: { id: "id2", name: "Bob" },
    },
    items: {
      item1: 1,
      item2: 2,
    },
    primitives: {
      a: 1,
      b: "hello",
      c: true,
    },
  };

  // 単純な値の取得
  expect(digUntyped(obj, ["items", "$values"])).toEqual([1, 2]);

  // オブジェクトの値の取得
  expect(digUntyped(obj, ["users", "$values"])).toEqual([
    { id: "id1", name: "Alice" },
    { id: "id2", name: "Bob" },
  ]);

  // 混合型の値の取得
  expect(digUntyped(obj, ["primitives", "$values"])).toEqual([
    1,
    "hello",
    true,
  ]);

  // 存在しないパスの場合
  expect(digUntyped(obj, ["nonexistent", "$values"])).toBe(undefined);

  // プリミティブ値の場合
  expect(digUntyped(obj, ["items", "item1", "$values"])).toBe(undefined);
});

test("digUntyped - $flat query", () => {
  const obj = {
    simple: [1, 2, [3, 4], 5],
    nested: [1, [2, [3, 4]], [5, 6]],
    mixed: [1, { a: 2 }, [3, 4]],
    notArray: { a: 1, b: 2 },
  };

  // 単純な配列の展開
  expect(digUntyped(obj, ["simple", "$flat"])).toEqual([1, 2, 3, 4, 5]);

  // ネストされた配列の展開（1レベル）
  expect(digUntyped(obj, ["nested", "$flat"])).toEqual([1, 2, [3, 4], 5, 6]);

  // オブジェクトを含む配列の展開
  expect(digUntyped(obj, ["mixed", "$flat"])).toEqual([1, { a: 2 }, 3, 4]);

  // 配列でない場合
  expect(digUntyped(obj, ["notArray", "$flat"])).toBe(undefined);

  // 存在しないパスの場合
  expect(digUntyped(obj, ["nonexistent", "$flat"])).toBe(undefined);
});

test("digUntyped - $pick query", () => {
  const obj = {
    user: {
      id: "user1",
      name: "Alice",
      age: 20,
      email: "alice@example.com",
    },
    settings: {
      theme: "dark",
      notifications: true,
      language: "ja",
    },
  };

  // 単純なピック
  expect(digUntyped(obj, ["user", "$pick{id,name}"])).toEqual({
    id: "user1",
    name: "Alice",
  });

  // 存在しないキーを含むピック
  expect(digUntyped(obj, ["user", "$pick{id,nonexistent}"])).toEqual({
    id: "user1",
  });

  // 空のピック
  expect(digUntyped(obj, ["user", "$pick{}"])).toEqual({});

  // プリミティブ値に対するピック
  expect(digUntyped(obj, ["user", "id", "$pick{a,b}"])).toBe(undefined);
});

test("digUntyped - $exclude query", () => {
  const obj = {
    user: {
      id: "user1",
      name: "Alice",
      age: 20,
      email: "alice@example.com",
    },
    settings: {
      theme: "dark",
      notifications: true,
      language: "ja",
    },
  };

  // 単純な除外
  expect(digUntyped(obj, ["user", "$exclude{age,email}"])).toEqual({
    id: "user1",
    name: "Alice",
  });

  // 存在しないキーを含む除外
  expect(digUntyped(obj, ["user", "$exclude{nonexistent}"])).toEqual({
    id: "user1",
    name: "Alice",
    age: 20,
    email: "alice@example.com",
  });

  // 空の除外
  expect(digUntyped(obj, ["user", "$exclude{}"])).toEqual({
    id: "user1",
    name: "Alice",
    age: 20,
    email: "alice@example.com",
  });

  // プリミティブ値に対する除外
  expect(digUntyped(obj, ["user", "id", "$exclude{a,b}"])).toBe(undefined);
});

test("digUntyped - combined special queries", () => {
  const obj = {
    users: {
      user1: { roles: ["admin", "user"] },
      user2: { roles: ["user"] },
    },
    items: {
      group1: [
        [1, 2],
        [3, 4],
      ],
      group2: [
        [5, 6],
        [7, 8],
      ],
    },
  };

  // $values と $flat の組み合わせ
  expect(digUntyped(obj, ["items", "$values", "$flat"])).toEqual([
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
  ]);

  // $keys の使用
  expect(digUntyped(obj, ["users", "$keys"])).toEqual(["user1", "user2"]);

  // $values と $flat の組み合わせ
  const roles = digUntyped(obj, ["users", "$values"]);
  expect(roles).toEqual([{ roles: ["admin", "user"] }, { roles: ["user"] }]);
});

test("dig - edge cases", () => {
  const obj = { a: null, b: undefined, c: 0 };
  expect(dig(obj, "a")).toBe(null);
  expect(dig(obj, ["a"] as const)).toBe(null);
  expect(dig(obj, "b")).toBe(undefined);
  expect(dig(obj, ["b"] as const)).toBe(undefined);
  expect(dig(obj, "c")).toBe(0);
  expect(dig(obj, ["c"] as const)).toBe(0);
  expect(dig(obj, "nonexistent")).toBe(undefined);
  expect(dig(obj, ["nonexistent"] as const)).toBe(undefined);
  expect(dig(obj, "a.b")).toBe(undefined);
  expect(dig(obj, ["a", "b"] as const)).toBe(undefined);
});

test("digUntyped - basic functionality", () => {
  const obj = { a: { b: 1, c: 2 } };
  expect(digUntyped(obj, "a.*")).toEqual({ b: 1, c: 2 });
  expect(digUntyped(obj, ["a", "*"])).toEqual({ b: 1, c: 2 });
  expect(digUntyped(obj, "*.*")).toEqual({ a: { b: 1, c: 2 } });
  expect(digUntyped(obj, ["*", "*"])).toEqual({ a: { b: 1, c: 2 } });
});

// 型テスト
test("dig - type inference", () => {
  const obj = {
    str: "hello",
    num: 42,
    arr: [1, 2, "three"],
    nested: {
      value: true,
    },
  };

  // 文字列クエリでの型推論
  const str1: string = dig(obj, "str");
  expect(str1).toBe("hello");

  // 配列クエリでの型推論
  const str2: string = dig(obj, ["str"] as const);
  expect(str2).toBe("hello");

  // 文字列クエリでの数値の型推論
  const num1: number = dig(obj, "num");
  expect(num1).toBe(42);

  // 配列クエリでの数値の型推論
  const num2: number = dig(obj, ["num"] as const);
  expect(num2).toBe(42);

  // 文字列クエリでの配列要素の型推論
  const arrItem1: string = dig(obj, "arr.2");
  expect(arrItem1).toBe("three");

  // 配列クエリでの配列要素の型推論
  const arrItem2: string = dig(obj, ["arr", "2"] as const);
  expect(arrItem2).toBe("three");

  // 文字列クエリでのネストされたオブジェクトの型推論
  const nested1: { value: boolean } = dig(obj, "nested");
  expect(nested1.value).toBe(true);

  // 配列クエリでのネストされたオブジェクトの型推論
  const nested2: { value: boolean } = dig(obj, ["nested"] as const);
  expect(nested2.value).toBe(true);

  // 文字列クエリでのワイルドカードでの型推論
  const wild1: { value: boolean } = dig(obj, "nested.*");
  expect(wild1).toEqual({ value: true });

  // 配列クエリでのワイルドカードでの型推論
  const wild2: { value: boolean } = dig(obj, ["nested", "*"] as const);
  expect(wild2).toEqual({ value: true });
});
