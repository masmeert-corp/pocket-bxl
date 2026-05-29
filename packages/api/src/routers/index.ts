import { router } from "../index";
import { healthRouter } from "./health";
import { stopsRouter } from "./stops";

export const appRouter = router({
  health: healthRouter,
  stops: stopsRouter,
});
export type AppRouter = typeof appRouter;
