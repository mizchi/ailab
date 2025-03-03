````markdown
# zod

## Usage

Define and validate data schemas with static type inference.

```ts
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  age: z.number().int().positive(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;

const userData = { name: "Alice", age: 30, email: "alice@example.com" };

try {
  const parsedData = UserSchema.parse(userData);
  console.log("Validation successful:", parsedData);
} catch (error) {
  console.error("Validation error:", error);
}
```
````

## Types

- **`z.string()`**: Schema for string values. Supports validations like `min`,
  `max`, `email`, `url`, `uuid`, etc.
- **`z.number()`**: Schema for number values. Supports validations like `min`,
  `max`, `int`, `positive`, `negative`, `multipleOf`, etc.
- **`z.boolean()`**: Schema for boolean values.
- **`z.bigint()`**: Schema for bigint values. Supports similar validations as
  `z.number()`.
- **`z.date()`**: Schema for Date objects. Supports `min` and `max` date
  validations.
- **`z.symbol()`**: Schema for symbol values.
- **`z.null()`**: Schema for null values.
- **`z.undefined()`**: Schema for undefined values
