import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

function createDatabaseClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
  });

  return drizzle({ client, schema });
}

const globalForDatabase = globalThis as unknown as {
  database?: ReturnType<typeof createDatabaseClient>;
};

export function getDb() {
  const database = globalForDatabase.database ?? createDatabaseClient();

  if (process.env.NODE_ENV !== "production") {
    globalForDatabase.database = database;
  }

  return database;
}
