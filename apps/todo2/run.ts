import { db } from "./db/client.ts";
import { users } from "./db/schema.ts";
const ret = await db.select().from(users);
console.log(ret);
