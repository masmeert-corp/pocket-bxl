import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@pocket-bxl/api/context";
import { createOpenApiDocument } from "@pocket-bxl/api/openapi";
import { appRouter } from "@pocket-bxl/api/routers/index";
import { createOpenApiFetchHandler } from "trpc-to-openapi";
import { Hono } from "hono";

import { corsMiddleware } from "./middleware/cors";
import { loggerMiddleware } from "./middleware/logger";
import { authRouter } from "./routers/auth";

const app = new Hono();

// Middlewares
app.use(loggerMiddleware);
app.use("/*", corsMiddleware);

// Healthcheck
app.get("/health", (c) => c.json({ status: "ok" }));

// Routers
app.route("/api/auth", authRouter);

app.get("/api/openapi.json", (c) => {
  const url = new URL(c.req.url);
  return c.json(createOpenApiDocument(`${url.origin}/api`));
});

app.all("/api/*", (c) => {
  return createOpenApiFetchHandler({
    endpoint: "/api",
    router: appRouter,
    createContext: () => createContext({ context: c }),
    req: c.req.raw,
  });
});

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
