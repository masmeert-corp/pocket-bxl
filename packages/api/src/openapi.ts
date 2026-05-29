import { generateOpenApiDocument } from "trpc-to-openapi";

import { appRouter } from "./routers/index";

export function createOpenApiDocument(baseUrl: string) {
  return generateOpenApiDocument(appRouter, {
    title: "pocket-bxl API",
    version: "0.1.0",
    baseUrl,
    tags: ["Health", "Routes", "Stops"],
  });
}
