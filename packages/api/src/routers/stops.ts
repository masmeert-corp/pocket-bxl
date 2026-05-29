import { db } from "@pocket-bxl/db";
import { departures, stops } from "@pocket-bxl/db/schema";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

const nonEmptyString = z.string().min(1);
const isoDatetime = z.iso.datetime();

const serializeDeparture = (departure: typeof departures.$inferSelect) => ({
  ...departure,
  arrival_at: departure.arrival_at.toISOString(),
  departure_at: departure.departure_at.toISOString(),
});

export const stopsRouter = router({
  getNearby: publicProcedure
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
        radius: z.number().positive(),
      }),
    )
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

  getById: publicProcedure.input(z.object({ id: nonEmptyString })).query(async ({ input }) => {
    const stop = await db.query.stops.findFirst({
      where: eq(stops.stop_id, input.id),
    });

    if (!stop) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return stop;
  }),

  getDepartures: publicProcedure
    .input(
      z
        .object({
          id: nonEmptyString,
          from: isoDatetime.optional(),
          to: isoDatetime.optional(),
          limit: z.number().int().positive().optional(),
        })
        .refine((input) => input.to || input.limit, {
          message: "limit is required when to is omitted",
          path: ["limit"],
        }),
    )
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
