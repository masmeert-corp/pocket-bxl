import * as schema from "@pocket-bxl/db/schema/gtfs";
import * as DrizzlePg from "@effect/sql-drizzle/Pg";
import { getTableName } from "drizzle-orm";
import type { PgTable, TableConfig } from "drizzle-orm/pg-core";
import { Array as A, Effect } from "effect";
import { PostgresLive } from "./db";

const BATCH_SIZE = 1000;

export class DrizzleService extends Effect.Service<DrizzleService>()("DrizzleService", {
  dependencies: [PostgresLive],
  effect: DrizzlePg.make<typeof schema>({ schema }),
}) {
  static insertBatched<T extends TableConfig>(
    table: PgTable<T>,
    data: PgTable<T>["$inferInsert"][],
  ) {
    return Effect.gen(function* () {
      const db = yield* DrizzleService;
      const batches = A.chunksOf(data, BATCH_SIZE);
      yield* Effect.forEach(batches, (batch) =>
        Effect.promise(() => db.insert(table).values(batch)),
      );
      yield* Effect.log(`Inserted ${data.length} rows into ${getTableName(table)}`);
    });
  }
}
