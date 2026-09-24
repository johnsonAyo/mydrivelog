import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let singleton:
  | {
      readonly client: ReturnType<typeof postgres>;
      readonly db: ReturnType<typeof drizzle<typeof schema>>;
    }
  | undefined;

export function getDatabase() {
  if (singleton) {
    return singleton;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const client = postgres(databaseUrl, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  singleton = { client, db: drizzle(client, { schema }) };
  return singleton;
}
