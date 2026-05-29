import { HttpClientError } from "@effect/platform";
import { Data, Effect, type Stream } from "effect";

import { Bmc } from "#/services/bmc";

export const STATIC_FEED_URL = "gtfs/feed/stibmivb/static/";

export class GtfsFetchError extends Data.TaggedError("GtfsFetchError")<{
  readonly status: number;
}> {}

export type FeedStream = Stream.Stream<Uint8Array, HttpClientError.ResponseError>;

export const fetchFeedStream = Effect.fn("fetchFeedStream")(function* () {
  const res = yield* Bmc.get(STATIC_FEED_URL);
  if (res.status !== 200) {
    return yield* new GtfsFetchError({ status: res.status });
  }
  return res.stream;
});
