import { db } from "@pocket-bxl/db";
import { departures, stops } from "@pocket-bxl/db/schema";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import {
  departureSchema,
  getNearbyStopsInputSchema,
  getStopByIdInputSchema,
  getStopDeparturesInputSchema,
  nearbyStopSchema,
  stopSchema,
} from "../schemas/stops";

const serializeDeparture = (departure: typeof departures.$inferSelect) => ({
  ...departure,
  arrival_at: departure.arrival_at.toISOString(),
  departure_at: departure.departure_at.toISOString(),
});

export const stopsRouter = router({
  getNearby: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/stops/nearby",
        operationId: "getNearbyStops",
        summary: "Find nearby stops",
        tags: ["Stops"],
      },
    })
    .input(getNearbyStopsInputSchema)
    .output(z.array(nearbyStopSchema))
    .query(async ({ input }) => {
      const point = sql`ST_SetSRID(ST_MakePoint(${input.lon}, ${input.lat}), 4326)`;
      const distanceMeters = sql<number>`ST_Distance(${stops.geom}::geography, ${point}::geography)`;

      return db
        .select({
          stop_id: stops.stop_id,
          stop_name: stops.stop_name,
          stop_lat: stops.stop_lat,
          stop_lon: stops.stop_lon,
          stop_code: stops.stop_code,
          stop_desc: stops.stop_desc,
          zone_id: stops.zone_id,
          stop_url: stops.stop_url,
          location_type: stops.location_type,
          parent_station: stops.parent_station,
          distanceMeters,
        })
        .from(stops)
        .where(sql`ST_DWithin(${stops.geom}::geography, ${point}::geography, ${input.radius})`)
        .orderBy(distanceMeters);
    }),

  getById: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/stops/{id}",
        operationId: "getStopById",
        summary: "Get a stop by id",
        tags: ["Stops"],
        errorResponses: {
          404: "Stop not found",
        },
      },
    })
    .input(getStopByIdInputSchema)
    .output(stopSchema.passthrough())
    .query(async ({ input }) => {
      const stop = await db.query.stops.findFirst({
        where: eq(stops.stop_id, input.id),
      });

      if (!stop) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return stop;
    }),

  getDepartures: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/stops/{id}/departures",
        operationId: "getStopDepartures",
        summary: "Get departures for a stop",
        tags: ["Stops"],
      },
    })
    .input(getStopDeparturesInputSchema)
    .output(z.array(departureSchema))
    .query(async ({ input }) => {
      const from = input.from ? new Date(input.from) : new Date();
      const filters = [eq(departures.stop_id, input.id), gte(departures.departure_at, from)];

      if (input.to) {
        filters.push(lte(departures.departure_at, new Date(input.to)));
      }

      const query = db
        .select()
        .from(departures)
        .where(and(...filters))
        .orderBy(asc(departures.departure_at));

      const rows = input.limit ? await query.limit(input.limit) : await query;

      return rows.map(serializeDeparture);
    }),
});
