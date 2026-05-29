import { env } from "@pocket-bxl/env/worker";
import { Config, Redacted } from "effect";

export const DatabaseUrl = Config.succeed(Redacted.make(env.DATABASE_URL));

/** Days ahead of today to precompute departures for. */
export const DepartureWindowDays = Config.succeed(env.DEPARTURE_WINDOW_DAYS);

export const AppConfig = Config.succeed({
  bmcPrimaryKey: Redacted.make(env.BMC_PRIMARY_KEY),
  bmcBaseApiUrl: new URL(env.BMC_BASE_API_URL),
  databaseUrl: Redacted.make(env.DATABASE_URL),
});
