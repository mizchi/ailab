/* @script */
/**
 * JSONログからスキーマを推論する実装
 *
 * このモジュールは、複数のJSONログから共通のスキーマを推論します。
 * - JSON値から型を推論
 * - オブジェクト型とリスト型のサポート
 * - 複数のログからの共通型の推論
 * - Union型のサポート
 */

// 型システムの拡張
type ObjectType = {
  kind: "ObjectType";
  fields: Map<string, Type>;
};

type ArrayType = {
  kind: "ArrayType";
  elementType: Type;
};

type NullType = {
  kind: "NullType";
};

type UnionType = {
  kind: "UnionType";
  types: Set<Type>;
};

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

// 型定義
type Type =
  | TypeVar
  | PrimitiveType
  | FunctionType
  | ObjectType
  | ArrayType
  | NullType
  | UnionType;

// 型ガード関数
function isTypeVar(type: Type): type is TypeVar {
  return type.kind === "TypeVar";
}

function isUnionType(type: Type): type is UnionType {
  return type.kind === "UnionType";
}

function isArrayType(type: Type): type is ArrayType {
  return type.kind === "ArrayType";
}

function isObjectType(type: Type): type is ObjectType {
  return type.kind === "ObjectType";
}

function isPrimitiveType(type: Type): type is PrimitiveType {
  return type.kind === "PrimitiveType";
}

function isNullType(type: Type): type is NullType {
  return type.kind === "NullType";
}

class TypeEnvironment {
  private nextTypeVarId = 0;
  private substitutions = new Map<number, Type>();

  freshTypeVar(): TypeVar {
    return {
      kind: "TypeVar",
      id: this.nextTypeVarId++,
    };
  }

  addSubstitution(typeVar: TypeVar, type: Type): void {
    this.substitutions.set(typeVar.id, type);
  }

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
      case "NullType":
        return type;
      case "FunctionType":
        return {
          kind: "FunctionType",
          paramType: this.applySubstitutions(type.paramType),
          returnType: this.applySubstitutions(type.returnType),
        };
      case "ObjectType": {
        const newFields = new Map<string, Type>();
        for (const [key, fieldType] of type.fields) {
          newFields.set(key, this.applySubstitutions(fieldType));
        }
        return { kind: "ObjectType", fields: newFields };
      }
      case "ArrayType":
        return {
          kind: "ArrayType",
          elementType: this.applySubstitutions(type.elementType),
        };
      case "UnionType": {
        const newTypes = new Set<Type>();
        for (const t of type.types) {
          newTypes.add(this.applySubstitutions(t));
        }
        return { kind: "UnionType", types: newTypes };
      }
    }
  }
}

// 型の等価性チェック
function isTypeEqual(t1: Type, t2: Type): boolean {
  if (t1.kind !== t2.kind) return false;

  switch (t1.kind) {
    case "TypeVar":
      return t1.id === (t2 as TypeVar).id;
    case "PrimitiveType":
      return t1.name === (t2 as PrimitiveType).name;
    case "NullType":
      return true;
    case "UnionType": {
      const types1 = Array.from(t1.types);
      const types2 = Array.from((t2 as UnionType).types);
      if (types1.length !== types2.length) return false;
      return types1.every((t1) => types2.some((t2) => isTypeEqual(t1, t2)));
    }
    case "ArrayType":
      return isTypeEqual(t1.elementType, (t2 as ArrayType).elementType);
    case "ObjectType": {
      const fields1 = Array.from(t1.fields.entries());
      const fields2 = Array.from((t2 as ObjectType).fields.entries());
      if (fields1.length !== fields2.length) return false;
      return fields1.every(([key, type1]) => {
        const type2 = (t2 as ObjectType).fields.get(key);
        return type2 !== undefined && isTypeEqual(type1, type2);
      });
    }
    case "FunctionType":
      return (
        isTypeEqual(t1.paramType, (t2 as FunctionType).paramType) &&
        isTypeEqual(t1.returnType, (t2 as FunctionType).returnType)
      );
  }
}

// 型のハッシュ値を計算する関数
function typeHash(type: Type): string {
  switch (type.kind) {
    case "TypeVar":
      return `TypeVar(${type.id})`;
    case "PrimitiveType":
      return `PrimitiveType(${type.name})`;
    case "NullType":
      return "NullType";
    case "UnionType": {
      const types = Array.from(type.types).map(typeHash).sort();
      return `Union(${types.join("|")})`;
    }
    case "ArrayType":
      return `Array(${typeHash(type.elementType)})`;
    case "ObjectType": {
      const fields = Array.from(type.fields.entries())
        .map(([key, type]) => `${key}:${typeHash(type)}`)
        .sort()
        .join(",");
      return `Object(${fields})`;
    }
    case "FunctionType":
      return `Function(${typeHash(type.paramType)}->${
        typeHash(
          type.returnType,
        )
      })`;
  }
}

// JSON値から型を推論する関数
function inferTypeFromJson(value: unknown, env: TypeEnvironment): Type {
  if (value === null) {
    return { kind: "NullType" };
  }

  if (typeof value === "number") {
    return { kind: "PrimitiveType", name: "number" };
  }

  if (typeof value === "string") {
    return { kind: "PrimitiveType", name: "string" };
  }

  if (typeof value === "boolean") {
    return { kind: "PrimitiveType", name: "boolean" };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { kind: "ArrayType", elementType: env.freshTypeVar() };
    }
    // 配列の要素から型を推論し、Union型として結合
    const elementTypes = value.map((elem) => inferTypeFromJson(elem, env));
    const elementType = unifyArrayElements(elementTypes, env);
    return { kind: "ArrayType", elementType };
  }

  if (typeof value === "object") {
    const fields = new Map<string, Type>();
    for (const [key, val] of Object.entries(value)) {
      fields.set(key, inferTypeFromJson(val, env));
    }
    return { kind: "ObjectType", fields };
  }

  throw new Error(`Unsupported JSON value: ${JSON.stringify(value)}`);
}

// 配列要素の型を単一化する関数
function unifyArrayElements(types: Type[], env: TypeEnvironment): Type {
  if (types.length === 0) {
    return env.freshTypeVar();
  }

  if (types.length === 1) {
    return types[0];
  }

  // すべての型が同じ場合は、その型を返す
  const firstType = types[0];
  if (types.every((t) => isTypeEqual(t, firstType))) {
    return firstType;
  }

  // 異なる型が存在する場合はUnion型を作成
  return createUnionType(types);
}

// Union型を作成する関数
function createUnionType(types: Type[]): Type {
  const uniqueTypes = new Map<string, Type>();

  for (const type of types) {
    if (isUnionType(type)) {
      for (const t of type.types) {
        uniqueTypes.set(typeHash(t), t);
      }
    } else {
      uniqueTypes.set(typeHash(type), type);
    }
  }

  if (uniqueTypes.size === 1) {
    return Array.from(uniqueTypes.values())[0];
  }

  return { kind: "UnionType", types: new Set(uniqueTypes.values()) };
}

// 複数の型を単一化する関数
function unifyAll(types: Type[], env: TypeEnvironment): Type {
  if (types.length === 0) {
    return env.freshTypeVar();
  }

  let result = types[0];
  for (let i = 1; i < types.length; i++) {
    unify(result, types[i], env);
    result = env.applySubstitutions(result);
  }
  return result;
}

// 型の単一化を行う関数
function unify(t1: Type, t2: Type, env: TypeEnvironment): void {
  t1 = env.applySubstitutions(t1);
  t2 = env.applySubstitutions(t2);

  if (isTypeEqual(t1, t2)) {
    return;
  }

  if (isTypeVar(t1)) {
    env.addSubstitution(t1, t2);
    return;
  }

  if (isTypeVar(t2)) {
    env.addSubstitution(t2, t1);
    return;
  }

  if (isUnionType(t1) || isUnionType(t2)) {
    const types = new Set<Type>([
      ...(isUnionType(t1) ? t1.types : [t1]),
      ...(isUnionType(t2) ? t2.types : [t2]),
    ]);
    const unionType = { kind: "UnionType" as const, types };
    if (isTypeVar(t1)) {
      env.addSubstitution(t1, unionType);
    } else if (isTypeVar(t2)) {
      env.addSubstitution(t2, unionType);
    }
    return;
  }

  if (isArrayType(t1) && isArrayType(t2)) {
    unify(t1.elementType, t2.elementType, env);
    return;
  }

  if (isObjectType(t1) && isObjectType(t2)) {
    const allKeys = new Set([...t1.fields.keys(), ...t2.fields.keys()]);
    for (const key of allKeys) {
      const field1 = t1.fields.get(key);
      const field2 = t2.fields.get(key);

      if (field1 === undefined && field2 === undefined) {
        continue;
      }

      const type1 = field1 ?? env.freshTypeVar();
      const type2 = field2 ?? env.freshTypeVar();
      unify(type1, type2, env);

      if (field1 === undefined) {
        t1.fields.set(key, type2);
      }
      if (field2 === undefined) {
        t2.fields.set(key, type1);
      }
    }
    return;
  }

  // 異なる型の場合はUnion型として扱う
  const unionType = createUnionType([t1, t2]);
  if (isTypeVar(t1)) {
    env.addSubstitution(t1, unionType);
  } else if (isTypeVar(t2)) {
    env.addSubstitution(t2, unionType);
  }
}

// 型を文字列に変換する関数
function typeToString(type: Type): string {
  switch (type.kind) {
    case "TypeVar":
      return `T${type.id}`;
    case "PrimitiveType":
      return type.name;
    case "NullType":
      return "null";
    case "ArrayType":
      return `${typeToString(type.elementType)}[]`;
    case "ObjectType": {
      const fields = Array.from(type.fields.entries())
        .map(([key, fieldType]) => `${key}: ${typeToString(fieldType)}`)
        .join(", ");
      return `{ ${fields} }`;
    }
    case "FunctionType":
      return `(${typeToString(type.paramType)}) => ${
        typeToString(
          type.returnType,
        )
      }`;
    case "UnionType": {
      const types = Array.from(type.types).map(typeToString).sort(); // 一貫性のために型をソート
      return types.join(" | ");
    }
  }
}

// テスト
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("プリミティブ型の推論", () => {
  const env = new TypeEnvironment();
  const json = {
    num: 42,
    str: "hello",
    bool: true,
    null: null,
  };

  const type = inferTypeFromJson(json, env);
  expect(type.kind).toBe("ObjectType");
  if (isObjectType(type)) {
    const numType = type.fields.get("num");
    if (numType && isPrimitiveType(numType)) {
      expect(numType.name).toBe("number");
    } else {
      throw new Error("Expected number type");
    }

    const strType = type.fields.get("str");
    if (strType && isPrimitiveType(strType)) {
      expect(strType.name).toBe("string");
    } else {
      throw new Error("Expected string type");
    }

    const boolType = type.fields.get("bool");
    if (boolType && isPrimitiveType(boolType)) {
      expect(boolType.name).toBe("boolean");
    } else {
      throw new Error("Expected boolean type");
    }

    const nullType = type.fields.get("null");
    if (nullType && isNullType(nullType)) {
      expect(nullType.kind).toBe("NullType");
    } else {
      throw new Error("Expected null type");
    }
  }
});

test("配列型の推論", () => {
  const env = new TypeEnvironment();
  const json = {
    numbers: [1, 2, 3],
    mixed: [1, "two", 3],
  };

  const type = inferTypeFromJson(json, env);
  expect(type.kind).toBe("ObjectType");
  if (isObjectType(type)) {
    const numbersType = type.fields.get("numbers");
    if (numbersType && isArrayType(numbersType)) {
      const elementType = numbersType.elementType;
      if (isPrimitiveType(elementType)) {
        expect(elementType.name).toBe("number");
      } else {
        throw new Error("Expected number type for array elements");
      }
    } else {
      throw new Error("Expected array type for numbers");
    }

    const mixedType = type.fields.get("mixed");
    if (mixedType && isArrayType(mixedType)) {
      const elementType = mixedType.elementType;
      if (isUnionType(elementType)) {
        expect(elementType.types.size).toBe(2);
        const types = Array.from(elementType.types);
        const hasNumber = types.some(
          (t) => isPrimitiveType(t) && t.name === "number",
        );
        const hasString = types.some(
          (t) => isPrimitiveType(t) && t.name === "string",
        );
        expect(hasNumber).toBe(true);
        expect(hasString).toBe(true);
      } else {
        throw new Error("Expected union type for mixed array elements");
      }
    } else {
      throw new Error("Expected array type for mixed");
    }
  }
});

test("ネストされたオブジェクトの推論", () => {
  const env = new TypeEnvironment();
  const json = {
    user: {
      id: 1,
      name: "John",
      tags: ["admin", "user"],
    },
  };

  const type = inferTypeFromJson(json, env);
  const typeStr = typeToString(type);
  expect(typeStr).toBe(
    "{ user: { id: number, name: string, tags: string[] } }",
  );
});

// メインの実行部分
if (import.meta.main) {
  const env = new TypeEnvironment();

  // サンプルJSONログ
  const logs = [
    {
      id: 1,
      name: "John",
      tags: ["admin"],
      active: true,
      data: 42,
    },
    {
      id: 2,
      name: "Jane",
      tags: ["user", "moderator"],
      active: false,
      data: "some string",
    },
  ];

  // 各ログから型を推論して単一化
  const types = logs.map((log) => inferTypeFromJson(log, env));
  const commonType = unifyAll(types, env);

  // 結果を表示
  console.log("Inferred schema:", typeToString(commonType));
}
