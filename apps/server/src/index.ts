import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@pocket-bxl/api/context";
import { createOpenApiDocument } from "@pocket-bxl/api/openapi";
import { appRouter } from "@pocket-bxl/api/routers/index";
import { Scalar } from "@scalar/hono-api-reference";
import { createOpenApiFetchHandler } from "trpc-to-openapi";
import { Hono } from "hono";

import { corsMiddleware } from "./middleware/cors";
import { loggerMiddleware } from "./middleware/logger";
import { authRouter } from "./routers/auth";

const app = new Hono();

function createOpenApiBaseUrl(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || url.host;
  const protocol = forwardedProto || url.protocol.replace(":", "");

  return `${protocol}://${host}/api`;
}

// Middlewares
app.use(loggerMiddleware);
app.use("/*", corsMiddleware);

// Healthcheck
app.get("/health", (c) => c.json({ status: "ok" }));

// Routers
app.route("/api/auth", authRouter);

app.get("/api/openapi.json", (c) => {
  return c.json(createOpenApiDocument(createOpenApiBaseUrl(c.req.raw)));
});

app.get("/api/docs", (c, next) => {
  return Scalar({
    url: `${createOpenApiBaseUrl(c.req.raw)}/openapi.json`,
    pageTitle: "pocket-bxl API",
    theme: "default",
  })(c, next);
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
