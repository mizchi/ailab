import { migrate } from "drizzle-orm/pglite/migrator";
import { PGlite } from "npm:@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, test } from "jsr:@std/testing/bdd";
import { configureGlobalSanitizers } from "jsr:@std/testing/unstable-bdd";
import { expect } from "jsr:@std/expect";
import { users } from "./db/schema.ts";
import { eq } from "drizzle-orm";

// NOTE: drizzle leaks the global sanitizers, so we need to disable them
configureGlobalSanitizers({
  sanitizeOps: false,
});
const client = new PGlite();
const db = drizzle(client);

beforeAll(async () => {
  await migrate(db, {
    migrationsFolder: new URL("./db/migrations", import.meta.url).pathname,
  });
});
afterAll(async () => {
  await client.close();
});

test("CRUD", async () => {
  // Create
  await db.insert(users).values({
    name: "John",
    age: 30,
  });
  const ret = await db.select().from(users);

  // Read
  expect(ret).toEqual([{ name: "John", age: 30, id: 1 }]);
  await db.update(users).set({ age: 31 }).where(eq(users.id, 1));

  // Update
  const ret2 = await db.select().from(users);
  expect(ret2).toEqual([{ name: "John", age: 31, id: 1 }]);

  // Delete
  await db.delete(users).where(eq(users.id, 1));
  const ret3 = await db.select().from(users);
  expect(ret3).toEqual([]);
});
