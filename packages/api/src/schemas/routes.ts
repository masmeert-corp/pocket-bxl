import { routeTypeValues, routes } from "@pocket-bxl/db/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const routeSchema = createSelectSchema(routes, {
  route_type: z.enum(routeTypeValues),
});

export const getRouteByIdInputSchema = z.object({
  routeId: z.string().min(1),
});
