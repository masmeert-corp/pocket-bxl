import { publicProcedure, router } from "../index";

export const healthRouter = router({
  check: publicProcedure.query(() => ({
    status: "ok",
    checkedAt: new Date().toISOString(),
  })),
});
