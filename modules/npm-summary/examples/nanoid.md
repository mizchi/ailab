# zod

## Usage

Define a schema and parse data against it.

```ts
import { z } from "zod";

const userSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
});

const userData = { name: "Alice", age: 30 };
const parsedData = userSchema.parse(userData); // Returns parsedData if valid, throws ZodError otherwise

console.log(parsedData.name); // Access validated data
```

## Types

- **`z.string()`, `z.number()`, `z.boolean()`, `z.date()`, etc.:** Primitive
  schema constructors for basic JavaScript types.
- **`z.object({})`:** Defines an object schema with specified properties and
  their respective schemas.
- **`z.array(schema)`:** Creates an array schema where each element conforms to
  the provided `schema`.
- **`z.enum([])`:** Creates an enum schema, allowing only a predefined set of
  string values.
- **`z.union([])`:** Creates a union schema, allowing values that conform to one
  of the provided schemas.
- **`z.optional(schema)`:** Makes a schema optional, accepting `undefined` as a
  valid value.
- **`z.nullable(schema)`:** Makes a schema nullable, accepting `null` as a valid
  value.
- **`z.infer<typeof schema>`:** A utility type to extract the TypeScript type
  inferred by a Zod schema.
- **`ZodError`:** Error class thrown by `z.parse()` when validation fails.
  Contains detailed `issues` array.
- **`z.ZodType`:** Base class for all Zod schema types.

## API

```ts
import { z } from "zod";
```

**Schema Creation (using `z` object):**

- **`z.string(params?: ZodStringDef)`:** Creates a string schema.
  ```ts
  const nameSchema = z.string().min(2).max(50);
  ```
- **`z.number(params?: ZodNumberDef)`:** Creates a number schema.
  ```ts
  const ageSchema = z.number().int().positive();
  ```
- **`z.boolean(params?: ZodBooleanDef)`:** Creates a boolean schema.
  ```ts
  const isActiveSchema = z.boolean();
  ```
- **`z.date(params?: ZodDateDef)`:** Creates a date schema (for `Date` objects).
  ```ts
  const dateSchema = z.date();
  ```
- **`z.object(shape: ZodRawShape)`:** Creates an object schema.
  ```ts
  const addressSchema = z.object({
    street: z.string(),
    city: z.string(),
  });
  ```
- **`z.array(schema: ZodTypeAny)`:** Creates an array schema.
  ```ts
  const tagsSchema = z.array(z.string());
  ```
- **`z.enum(values: [string, ...string[]])`:** Creates an enum schema.
  ```ts
  const statusEnum = z.enum(["pending", "processing", "completed"]);
  ```
- **`z.union(options: [ZodTypeAny, ...Z
