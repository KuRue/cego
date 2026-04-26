import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

type SqlClient = ReturnType<typeof postgres>;
type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let sqlClient: SqlClient | null = null;
let dbClient: DbClient | null = null;

export function getDb(databaseUrl = process.env.DATABASE_URL): DbClient {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize the ARF database.");
  }

  if (!sqlClient || !dbClient) {
    sqlClient = postgres(databaseUrl);
    dbClient = drizzle(sqlClient, { schema });
  }

  return dbClient;
}

export async function closeDb() {
  if (sqlClient) {
    await sqlClient.end();
  }

  sqlClient = null;
  dbClient = null;
}

