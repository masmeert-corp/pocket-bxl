import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import { migrateDatabase } from "@pocket-bxl/db/migrate";
import { Effect, Layer, Redacted } from "effect";

import { syncGtfsFeed } from "#/gtfs/sync";
import { Bmc } from "#/services/bmc";
import { DatabaseUrl } from "#/services/env";
import { DrizzleService } from "#/services/drizzle";
import { PostgresLive } from "#/services/db";

const MainLayer = Layer.mergeAll(Bmc.Default, DrizzleService.Default, PostgresLive);

const program = Effect.gen(function* () {
  const databaseUrl = yield* DatabaseUrl;
  yield* Effect.promise(() => migrateDatabase({ databaseUrl: Redacted.value(databaseUrl) }));
  yield* Effect.log("Migrations applied");
  yield* syncGtfsFeed();
});

NodeRuntime.runMain(program.pipe(Effect.provide(MainLayer)));
