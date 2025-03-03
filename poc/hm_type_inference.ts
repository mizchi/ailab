/* @script */
/**
 * Hindley-Milner 型推論の実装
 *
 * このモジュールは、基本的な HM 型推論システムを実装します。
 * - 型変数
 * - プリミティブ型
 * - 関数型
 * - 型代入
 * - 型環境
 * - 単一化
 */

// 型を表現する型定義
type TypeVar = {
  kind: "TypeVar";
  id: number;
};

type PrimitiveType = {
  kind: "PrimitiveType";
  name: "number" | "string" | "boolean";
};

type FunctionType = {
  kind: "FunctionType";
  paramType: Type;
  returnType: Type;
};

type Type = TypeVar | PrimitiveType | FunctionType;

// 型環境を表現するクラス
class TypeEnvironment {
  private nextTypeVarId = 0;
  private substitutions = new Map<number, Type>();

  // 新しい型変数を生成
  freshTypeVar(): TypeVar {
    return {
      kind: "TypeVar",
      id: this.nextTypeVarId++,
    };
  }

  // 型変数に対する代入を追加
  addSubstitution(typeVar: TypeVar, type: Type): void {
    this.substitutions.set(typeVar.id, type);
  }

  // 型に対して代入を適用
  applySubstitutions(type: Type): Type {
    switch (type.kind) {
      case "TypeVar": {
        const substituted = this.substitutions.get(type.id);
        if (substituted) {
          return this.applySubstitutions(substituted);
        }
        return type;
      }
      case "PrimitiveType":
        return type;
      case "FunctionType":
        return {
          kind: "FunctionType",
          paramType: this.applySubstitutions(type.paramType),
          returnType: this.applySubstitutions(type.returnType),
        };
    }
  }
}

// 型の単一化を行う関数
function unify(t1: Type, t2: Type, env: TypeEnvironment): void {
  t1 = env.applySubstitutions(t1);
  t2 = env.applySubstitutions(t2);

  if (t1.kind === "TypeVar" && t2.kind === "TypeVar" && t1.id === t2.id) {
    return;
  }

  if (t1.kind === "TypeVar") {
    env.addSubstitution(t1, t2);
    return;
  }

  if (t2.kind === "TypeVar") {
    env.addSubstitution(t2, t1);
    return;
  }

  if (t1.kind === "PrimitiveType" && t2.kind === "PrimitiveType") {
    if (t1.name !== t2.name) {
      throw new Error(`Type mismatch: ${t1.name} !== ${t2.name}`);
    }
    return;
  }

  if (t1.kind === "FunctionType" && t2.kind === "FunctionType") {
    unify(t1.paramType, t2.paramType, env);
    unify(t1.returnType, t2.returnType, env);
    return;
  }

  throw new Error(
    `Cannot unify types: ${JSON.stringify(t1)} and ${JSON.stringify(t2)}`,
  );
}

// テスト
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("型変数の生成", () => {
  const env = new TypeEnvironment();
  const tv1 = env.freshTypeVar();
  const tv2 = env.freshTypeVar();

  expect(tv1.kind).toBe("TypeVar");
  expect(tv2.kind).toBe("TypeVar");
  expect(tv1.id).not.toBe(tv2.id);
});

test("プリミティブ型の単一化", () => {
  const env = new TypeEnvironment();
  const numType: PrimitiveType = { kind: "PrimitiveType", name: "number" };
  const tv = env.freshTypeVar();

  unify(tv, numType, env);
  const result = env.applySubstitutions(tv);

  expect(result).toEqual(numType);
});

test("関数型の単一化", () => {
  const env = new TypeEnvironment();
  const tv1 = env.freshTypeVar();
  const tv2 = env.freshTypeVar();

  const funcType: FunctionType = {
    kind: "FunctionType",
    paramType: { kind: "PrimitiveType", name: "number" },
    returnType: { kind: "PrimitiveType", name: "string" },
  };

  unify(tv1, funcType, env);
  const result = env.applySubstitutions(tv1);

  expect(result).toEqual(funcType);
});

test("型の不一致エラー", () => {
  const env = new TypeEnvironment();
  const numType: PrimitiveType = { kind: "PrimitiveType", name: "number" };
  const strType: PrimitiveType = { kind: "PrimitiveType", name: "string" };

  expect(() => unify(numType, strType, env)).toThrow();
});

// メインの実行部分
if (import.meta.main) {
  const env = new TypeEnvironment();

  // number -> string の関数型を作成
  const funcType: FunctionType = {
    kind: "FunctionType",
    paramType: { kind: "PrimitiveType", name: "number" },
    returnType: { kind: "PrimitiveType", name: "string" },
  };

  // 型変数を作成して単一化
  const tv = env.freshTypeVar();
  unify(tv, funcType, env);

  // 結果を表示
  console.log(
    "Inferred type:",
    JSON.stringify(env.applySubstitutions(tv), null, 2),
  );
}
