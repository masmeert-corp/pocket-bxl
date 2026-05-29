import { db } from "@pocket-bxl/db";
import { routes } from "@pocket-bxl/db/schema";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import { getRouteByIdInputSchema, routeSchema } from "../schemas/routes";

export const routesRouter = router({
  list: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/routes",
        operationId: "getRoutes",
        summary: "List routes",
        protect: false,
        tags: ["Routes"],
      },
    })
    .output(z.array(routeSchema))
    .query(() => {
      return db
        .select()
        .from(routes)
        .orderBy(asc(routes.route_short_name), asc(routes.route_long_name));
    }),

  getById: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/routes/{routeId}",
        operationId: "getRouteById",
        summary: "Get a route by id",
        protect: false,
        tags: ["Routes"],
        errorResponses: {
          404: "Route not found",
        },
      },
    })
    .input(getRouteByIdInputSchema)
    .output(routeSchema)
    .query(async ({ input }) => {
      const route = await db.query.routes.findFirst({
        where: eq(routes.route_id, input.routeId),
      });

      if (!route) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return route;
    }),
});
