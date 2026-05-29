import { publicProcedure, router } from "../index";
import { healthCheckOutputSchema } from "../schemas/health";

export const healthRouter = router({
  check: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/health",
        operationId: "healthCheck",
        summary: "Check API health",
        protect: false,
        tags: ["Health"],
      },
    })
    .output(healthCheckOutputSchema)
    .query(() => ({
      status: "ok" as const,
      checkedAt: new Date().toISOString(),
    })),
});
