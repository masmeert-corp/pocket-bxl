import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@pocket-bxl/api/context";
import { appRouter } from "@pocket-bxl/api/routers/index";
import { Hono } from "hono";

import { corsMiddleware } from "./middleware/cors";
import { loggerMiddleware } from "./middleware/logger";
import { authRouter } from "./routers/auth";

const app = new Hono();

// Middlewares
app.use(loggerMiddleware);
app.use("/*", corsMiddleware);

// Routers
app.route("/api/auth", authRouter);

// tRPC
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

// Main
serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3000),
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
