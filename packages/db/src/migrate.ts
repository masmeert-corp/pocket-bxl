import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export type MigrateDatabaseOptions = {
  databaseUrl: string;
  migrationsFolder?: string;
};

export const defaultMigrationsFolder = () =>
  resolve(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function migrateDatabase({
  databaseUrl,
  migrationsFolder = defaultMigrationsFolder(),
}: MigrateDatabaseOptions) {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}
