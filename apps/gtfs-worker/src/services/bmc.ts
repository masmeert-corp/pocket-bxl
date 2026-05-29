import { HttpClient, HttpClientRequest } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Effect, Redacted } from "effect";

import { AppConfig } from "#/services/env";

export class Bmc extends Effect.Service<Bmc>()("Bmc", {
  effect: Effect.gen(function* () {
    const cfg = yield* AppConfig;
    const base = yield* HttpClient.HttpClient;

    const client = base.pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl(cfg.bmcBaseApiUrl.toString())),
      HttpClient.mapRequest(
        HttpClientRequest.setHeader("bmc-partner-key", Redacted.value(cfg.bmcPrimaryKey)),
      ),
    );

    return {
      get: (path: string) => client.get(path),
    };
  }),
  dependencies: [NodeHttpClient.layerUndici],
  accessors: true,
}) {}
