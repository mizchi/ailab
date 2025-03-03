# drizzle-orm

## Usage

```ts
import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
});

const client = new Client({ connectionString: "..." });
await client.connect();
const db = drizzle(client, { schema: { users } });

const result = await db.select().from(users).execute();
```

## Types

- **`PgTable`**: Represents a PostgreSQL table. Used to define the schema.
- **`MySqlTable`**: Represents a MySQL table. Used to define the schema.
- **`SQLiteTable`**: Represents a SQLite table. Used to define the schema.
- **`PgColumn`**: Represents a PostgreSQL column.
- **`MySqlColumn`**: Represents a MySQL column.
- **`SQLiteColumn`**: Represents a SQLite column.
- **`SQL`**: Represents a raw SQL expression.
- **`Query`**: Represents a compiled SQL query with parameters.
- **`DrizzleConfig`**: Configuration for the Drizzle ORM, including the schema
  and logger.
- **`PgSession`**: Session for PostgreSQL database operations.
- **`MySqlSession`**: Session for MySQL database operations.
- **`SQLiteSession`**: Session for SQLite database operations.
- **`PgTransaction`**: Represents a PostgreSQL transaction.
- **`MySqlTransaction`**: Represents a MySQL transaction.
- **`SQLiteTransaction`**: Represents a SQLite transaction.
- **`PgQueryResultHKT`**: Represents the result type for PostgreSQL queries.
- **`MySqlQueryResultHKT`**: Represents the result type for MySQL queries.
- **`SQLiteQueryResultHKT`**: Represents the result type for SQLite queries.
- **`SelectResult`**: Represents the result of a `select` query.
- **`InferModel`**: Infers the TypeScript model from a table schema.
- **`AnyColumn`**: Represents any column type.
- **`JoinType`**: Type for join types (`inner`, `left`, `right`, `full`).
- **`LockStrength`**: Type for lock strengths (`update`, `no key update`,
  `share`, `key share`).

## API

```ts
// Import core modules
import { drizzle } from "drizzle-orm/node-postgres"; // or drizzle-orm/mysql2, drizzle-orm/better-sqlite3, etc.
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"; // or drizzle-orm/mysql-core, drizzle-orm/sqlite-core, etc.
import { and, eq, sql } from "drizzle-orm";
import { Client } from "pg";

// Define a table schema
const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Create a database instance
const client = new Client({ connectionString: "..." });
await client.connect();
const db = drizzle(client, { schema: { users } });

// Insert data
const insertResult = await db.insert(users).values({ name: "John Doe" })
  .execute();

// Select data
const selectResult = await db.select().from(users).where(
  eq(users.name, "John Doe"),
).execute();

// Update data
const updateResult = await db.update(users).set({ name: "Jane Doe" }).where(
  eq(users.id, 1),
).execute();

// Delete data
const deleteResult = await db.delete(users).where(eq(users.id, 1)).execute();

// Raw SQL
const rawResult = await db.execute(
  sql`SELECT * FROM users WHERE name = ${"John Doe"}`,
);

// Transactions
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: "Alice" });
  await tx.insert(users).values({ name: "Bob" });
});
```

Key API methods and their usage:

- **`drizzle(client, config)`**: Creates a database instance. The `client` is a
  database client (e.g., `pg.Client`, `mysql2.Pool`, `better-sqlite3.Database`).
  The `config` object allows you to specify the schema and other options.
- **`pgTable(tableName, columns)`**: Defines a PostgreSQL table schema.
  `tableName` is the table name, and `columns` is an object where keys are
  column names and values are column definitions (e.g.,
  `serial('id').primaryKey()`, `text('name')`).
- **`mysqlTable(tableName, columns)`**: Defines a MySQL table schema.
- **`sqliteTable(tableName, columns)`**: Defines a SQLite table schema.
- **`serial(columnName)`**: Defines a serial (auto-incrementing) column.
- **`text(columnName)`**: Defines a text column.
- **`timestamp(columnName)`**: Defines a timestamp column.
- **`eq(column, value)`**: Creates an equality condition for a `where` clause.
- **`and(...conditions)`**: Combines multiple conditions with an `AND` operator.
- **`or(...conditions)`**: Combines multiple conditions with an `OR` operator.
- **`not(condition)`**: Negates a condition.
- **`gt(column, value)`**: Creates a "greater than" condition.
- **`gte(column, value)`**: Creates a "greater than or equal to" condition.
- **`lt(column, value)`**: Creates a "less than" condition.
- **`lte(column, value)`**: Creates a "less than or equal to" condition.
- **`inArray(column, values)`**: Creates an "in" condition.
- **`isNull(column)`**: Creates an "is null" condition.
- **`isNotNull(column)`**: Creates an "is not null" condition.
- **`exists(subquery)`**: Creates an "exists" condition.
- **`notExists(subquery)`**: Creates a "not exists" condition.
- **`between(column, min, max)`**: Creates a "between" condition.
- **`notBetween(column, min, max)`**: Creates a "not between" condition.
- **`like(column, pattern)`**: Creates a "like" condition.
- **`ilike(column, pattern)`**: Creates a case-insensitive "like" condition.
- **`notLike(column, pattern)`**: Creates a "not like" condition.
- **`notIlike(column, pattern)`**: Creates a case-insensitive "not like"
  condition.
- **`count(expression)`**: Creates a `count` aggregate function.
- **`avg(expression)`**: Creates an `avg` aggregate function.
- **`sum(expression)`**: Creates a `sum` aggregate function.
- **`max(expression)`**: Creates a `max` aggregate function.
- **`min(expression)`**: Creates a `min` aggregate function.
- **`sql`**: Creates a raw SQL expression. Use this for complex queries or when
  you need to use database-specific features.
- **`db.insert(table).values(values).execute()`**: Inserts data into a table.
- **`db.select(fields).from(table).where(condition).execute()`**: Selects data
  from a table. `fields` is an object specifying the columns to select (or
  `undefined` for all columns).
- **`db.update(table).set(values).where(condition).execute()`**: Updates data in
  a table.
- **`db.delete(table).where(condition).execute()`**: Deletes data from a table.
- **`db.transaction(async (tx) => { ... })`**: Executes a database transaction.
  All operations within the transaction callback are executed atomically.
- **`.returning(fields)`**: Specifies which fields to return after an insert,
  update, or delete operation.
- **`.from(table)`**: Specifies the table to select from.
- **`.leftJoin(table, on)`**: Performs a left join.
- **`.rightJoin(table, on)`**: Performs a right join.
- **`.innerJoin(table, on)`**: Performs an inner join.
- **`.fullJoin(table, on)`**: Performs a full join.
- **`.orderBy(column)`**: Orders the results by the specified column.
- **`.limit(limit)`**: Limits the number of results.
- **`.offset(offset)`**: Sets the offset for the results.
- **`.where(condition)`**: Adds a `WHERE` clause to the query.
- **`.having(condition)`**: Adds a `HAVING` clause to the query.
- **`.groupBy(column)`**: Adds a `GROUP BY` clause to the query.
- **`.for(strength, config)`**: Adds a `FOR` clause to the query for locking.
- **`.onConflictDoNothing()`**: Adds an `ON CONFLICT DO NOTHING` clause to the
  insert query.
- **`.onConflictDoUpdate({ target, set })`**: Adds an `ON CONFLICT DO UPDATE`
  clause to the insert query.
- **`.$with(alias).as(query)`**: Defines a CTE (Common Table Expression).
- **`db.with(...queries).select().from(alias)`**: Uses a defined CTE in a query.
