import { z } from "zod";

export const healthCheckOutputSchema = z.object({
  status: z.literal("ok"),
  checkedAt: z.iso.datetime(),
});
