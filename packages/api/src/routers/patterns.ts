import { db } from "@pocket-bxl/db";
import { patternStops, shapes, stopPatterns, stops, trips } from "@pocket-bxl/db/schema";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";

import { publicProcedure, router } from "../index";
import {
  getPatternByIdInputSchema,
  patternShapeSchema,
  patternWithStopsSchema,
} from "../schemas/patterns";

const findPatternById = async (patternId: string) => {
  const [pattern] = await db
    .select()
    .from(stopPatterns)
    .where(eq(stopPatterns.pattern_id, patternId))
    .limit(1);

  if (!pattern) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Pattern not found",
    });
  }

  return pattern;
};

export const patternsRouter = router({
  getById: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/patterns/{patternId}",
        operationId: "getPatternById",
        summary: "Get a pattern's direction and stops",
        protect: false,
        tags: ["Patterns"],
        errorResponses: {
          404: "Pattern not found",
        },
      },
    })
    .input(getPatternByIdInputSchema)
    .output(patternWithStopsSchema)
    .query(async ({ input }) => {
      const pattern = await findPatternById(input.patternId);
      const patternStopRows = await db
        .select({
          stop_sequence: patternStops.stop_sequence,
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
        })
        .from(patternStops)
        .innerJoin(stops, eq(stops.stop_id, patternStops.stop_id))
        .where(eq(patternStops.pattern_id, input.patternId))
        .orderBy(asc(patternStops.stop_sequence));

      return {
        ...pattern,
        stops: patternStopRows,
      };
    }),

  getShape: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/patterns/{patternId}/shape",
        operationId: "getPatternShape",
        summary: "Get a pattern's line shape",
        protect: false,
        tags: ["Patterns"],
        errorResponses: {
          404: "Pattern shape not found",
        },
      },
    })
    .input(getPatternByIdInputSchema)
    .output(patternShapeSchema)
    .query(async ({ input }) => {
      await findPatternById(input.patternId);

      const [shapeRef] = await db
        .select({
          shape_id: trips.shape_id,
        })
        .from(trips)
        .where(and(eq(trips.pattern_id, input.patternId), isNotNull(trips.shape_id)))
        .groupBy(trips.shape_id)
        .orderBy(desc(sql`count(*)`), asc(trips.shape_id))
        .limit(1);

      if (!shapeRef?.shape_id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pattern shape not found",
        });
      }

      const points = await db
        .select({
          shape_pt_sequence: shapes.shape_pt_sequence,
          shape_pt_lat: shapes.shape_pt_lat,
          shape_pt_lon: shapes.shape_pt_lon,
          shape_dist_traveled: shapes.shape_dist_traveled,
        })
        .from(shapes)
        .where(eq(shapes.shape_id, shapeRef.shape_id))
        .orderBy(asc(shapes.shape_pt_sequence));

      if (points.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pattern shape not found",
        });
      }

      return {
        pattern_id: input.patternId,
        shape_id: shapeRef.shape_id,
        points,
      };
    }),
});
