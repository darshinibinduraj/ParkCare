import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import { INIT_SQL } from "@/lib/db/init-sql";
import { seedIfEmpty } from "@/lib/db/seed";

export type AppDatabase = PgliteDatabase<typeof schema> | PostgresJsDatabase<typeof schema>;

type DatabaseHandle = {
  db: AppDatabase;
  exec: (statement: string) => Promise<void>;
};

const globalForDb = globalThis as unknown as { parkcareDb?: Promise<DatabaseHandle> };

function statements(sqlText: string): string[] {
  return sqlText
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function initHandle(handle: DatabaseHandle): Promise<DatabaseHandle> {
  for (const statement of statements(INIT_SQL)) {
    try {
      const sqlText = statement.endsWith(";") ? statement : `${statement};`;
      await handle.exec(sqlText);
    } catch (error) {
      if (/gin/i.test(statement)) continue;
      throw error;
    }
  }
  await handle.exec("DELETE FROM sessions WHERE expires_at < now()");
  await seedIfEmpty(handle.db);
  return handle;
}

async function createHandle(): Promise<DatabaseHandle> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    const client = postgres(databaseUrl, { max: 1 });
    const db = drizzlePostgres(client, { schema });
    return initHandle({
      db,
      exec: async (statement) => {
        await client.unsafe(statement);
      },
    });
  }

  const dataDir = process.env.PARKCARE_DATA_DIR || join(process.cwd(), ".data", "pglite");
  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  return initHandle({
    db,
    exec: async (statement) => {
      await client.exec(statement);
    },
  });
}

export function getDb(): Promise<AppDatabase> {
  if (!globalForDb.parkcareDb) {
    globalForDb.parkcareDb = createHandle().catch((error) => {
      globalForDb.parkcareDb = undefined;
      throw error;
    });
  }
  return globalForDb.parkcareDb.then((handle) => handle.db);
}

export function resetDbForTests(): void {
  globalForDb.parkcareDb = undefined;
}
