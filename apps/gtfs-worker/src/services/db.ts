import { PgClient } from "@effect/sql-pg";

import { DatabaseUrl } from "#/services/env";

export const PostgresLive = PgClient.layerConfig({
  url: DatabaseUrl,
});
