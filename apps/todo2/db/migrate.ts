import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "./client.ts";
const folderPath = new URL("./migrations", import.meta.url).pathname;
await migrate(db, {
  migrationsFolder: folderPath,
});

console.log("Migration complete");
