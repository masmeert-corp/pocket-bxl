import { Duration, Effect } from "effect";

import { fetchFeedStream } from "#/gtfs/download";
import { loadFeed } from "#/gtfs/load";

/**
 * Run one full sync: download the static feed, load it, and rebuild the
 * derived tables. The process is designed to run once and exit (non-zero on
 * failure via NodeRuntime.runMain), so scheduling is left to an external cron.
 */
export const syncGtfsFeed = Effect.fn("syncGtfsFeed")(function* () {
  const stream = yield* fetchFeedStream();
  const [elapsed] = yield* Effect.timed(loadFeed(stream));
  yield* Effect.log(`GTFS sync complete in ${Duration.format(elapsed)}`);
});
