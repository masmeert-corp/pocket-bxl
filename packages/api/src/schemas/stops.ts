import { departures, stops } from "@pocket-bxl/db/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

const dateTimeSchema = z.iso.datetime().meta({ pattern: undefined });

export const stopSchema = createSelectSchema(stops).omit({
  geom: true,
});

export const nearbyStopSchema = stopSchema.extend({
  distanceMeters: z.number(),
});

export const departureSchema = createSelectSchema(departures, {
  arrival_at: dateTimeSchema,
  departure_at: dateTimeSchema,
});

export const getNearbyStopsInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  radius: z.number().positive(),
});

export const getStopByIdInputSchema = z.object({
  id: z.string().min(1),
});

export const getStopDeparturesInputSchema = z
  .object({
    id: z.string().min(1),
    from: dateTimeSchema.optional(),
    to: dateTimeSchema.optional(),
    limit: z.number().int().positive().optional(),
  })
  .refine((input) => input.to || input.limit, {
    message: "limit is required when to is omitted",
    path: ["limit"],
  });
