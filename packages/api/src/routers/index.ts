import { protectedProcedure, router } from "../index";
import { healthRouter } from "./health";
import { stopsRouter } from "./stops";

export const appRouter = router({
  health: healthRouter,
  stops: stopsRouter,
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
});
export type AppRouter = typeof appRouter;
