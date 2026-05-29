import { basename } from "node:path";

import { Chunk, Data, Effect, Stream } from "effect";
import unzipper from "unzipper";

import type { FeedStream } from "#/gtfs/download";

export class GtfsZipError extends Data.TaggedError("GtfsZipError")<{
  readonly cause: unknown;
}> {}

export type ZipAccessor = {
  /** Return the zip entry matching `name` by basename, or undefined. */
  entry: (name: string) => unzipper.File | undefined;
};

/**
 * Collect the compressed feed stream into a buffer, then open it for
 * random-access reads. Holding the compressed zip in RAM lets us pull entries
 * in dependency order rather than archive order; individual entries still
 * stream their decompressed bytes on demand.
 */
export const openFeedZip = Effect.fn("openFeedZip")(function* (source: FeedStream) {
  const chunks = yield* Stream.runCollect(source);
  const buf = Buffer.concat(Chunk.toArray(chunks).map((c) => Buffer.from(c)));
  const zip = yield* Effect.tryPromise({
    try: () => unzipper.Open.buffer(buf),
    catch: (cause) => new GtfsZipError({ cause }),
  });
  return {
    entry: (name: string) => zip.files.find((f) => basename(f.path) === name),
  } satisfies ZipAccessor;
});
