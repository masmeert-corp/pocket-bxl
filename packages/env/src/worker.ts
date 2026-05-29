import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BMC_BASE_API_URL: z.url(),
    BMC_PRIMARY_KEY: z.string().min(1),
    DEPARTURE_WINDOW_DAYS: z.coerce.number().int().positive().default(14),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
