import { stopPatterns } from "@pocket-bxl/db/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { stopSchema } from "./stops";

export const patternSchema = createSelectSchema(stopPatterns);

export const patternStopSchema = stopSchema.extend({
  stop_sequence: z.number().int().nonnegative(),
});

export const patternWithStopsSchema = patternSchema.extend({
  stops: z.array(patternStopSchema),
});

export const shapePointSchema = z.object({
  shape_pt_sequence: z.number().int().nonnegative(),
  shape_pt_lat: z.number().min(-90).max(90),
  shape_pt_lon: z.number().min(-180).max(180),
  shape_dist_traveled: z.number().nullable(),
});

export const patternShapeSchema = z.object({
  pattern_id: z.string().min(1),
  shape_id: z.string().min(1),
  points: z.array(shapePointSchema),
});

export const getPatternByIdInputSchema = z.object({
  patternId: z.string().min(1),
});
