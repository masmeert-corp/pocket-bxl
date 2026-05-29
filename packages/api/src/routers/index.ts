import { router } from "../index";
import { healthRouter } from "./health";
import { routesRouter } from "./routes";
import { stopsRouter } from "./stops";

export const appRouter = router({
  health: healthRouter,
  routes: routesRouter,
  stops: stopsRouter,
});
export type AppRouter = typeof appRouter;
