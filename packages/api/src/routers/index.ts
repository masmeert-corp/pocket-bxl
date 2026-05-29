import { router } from "../index";
import { healthRouter } from "./health";
import { patternsRouter } from "./patterns";
import { routesRouter } from "./routes";
import { stopsRouter } from "./stops";

export const appRouter = router({
  health: healthRouter,
  patterns: patternsRouter,
  routes: routesRouter,
  stops: stopsRouter,
});
export type AppRouter = typeof appRouter;
