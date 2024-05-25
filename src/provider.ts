import type {
  AnyProviderEvent,
  EvaluationContext,
  Hook,
  JsonValue,
  Logger,
  Provider,
  ProviderEventEmitter,
  ResolutionDetails,
} from "./deps.ts";

import { FlagdCore } from "./deps.ts";

import { FEATURE_FLAGS_KEY } from "./constants.ts";

//Copied and adjusted from https://github.com/open-feature/js-sdk/blob/main/packages/server/README.md#develop-a-provider.

class DenoProvider implements Provider {
  // Adds runtime validation that the provider is used with the expected SDK
  public readonly runsOn = "server";
  readonly metadata = {
    name: "DenoProvider",
  } as const;

  // Optional provider managed hooks
  hooks?: Hook[];

  #kv: Deno.Kv;
  #flagdCoreInstance: FlagdCore;

  constructor(kv: Deno.Kv) {
    this.#kv = kv;
    this.#flagdCoreInstance = new FlagdCore(); // FYI this can take parameters - https://github.com/open-feature/js-sdk-contrib/blob/a389d4f858e3bf72addd92755755a55d6d470d2b/libs/providers/flagd/src/lib/service/in-process/in-process-service.ts#L18
  }

  #flagDefinitions: string | null = null;
  #flagDefinitionsWatchStream:
    | ReadableStream<[Deno.KvEntryMaybe<unknown>]>
    | undefined;

  async initialize?(_context?: EvaluationContext | undefined): Promise<void> {
    const kvJson = await this.#kv.get([FEATURE_FLAGS_KEY]);

    this.#saveFlagDefinitionsWithErrorHandling(kvJson.value);

    this.#watchFlagDefinitions();
  }

  #saveFlagDefinitionsWithErrorHandling(flagDefinitions: unknown) {
    try {
      this.#saveFlagDefinitions(flagDefinitions);
    } catch (error) {
      // No-op in case something went wrong (e.g. the flags definition file not being parseable)
      // FlagdCore should default to returning default values if this happens
      console.error(error);
      console.log("Old flag definitions:", this.#flagDefinitions);
      console.log("New flag definitions:", flagDefinitions);
    }
  }

  #saveFlagDefinitions(flagDefinitions: unknown) {
    if (
      typeof flagDefinitions !== "string" && flagDefinitions !== null
    ) {
      throw new Error(
        `Flag definitions stored in KV at key [${FEATURE_FLAGS_KEY}] was unexpectedly neither a string nor null`,
      );
    }

    this.#flagdCoreInstance.setConfigurations(flagDefinitions ?? "{}");
    this.#flagDefinitions = flagDefinitions;
  }

  async #watchFlagDefinitions() {
    this.#flagDefinitionsWatchStream = this.#kv.watch([[FEATURE_FLAGS_KEY]]);
    for await (const entries of this.#flagDefinitionsWatchStream) {
      const flagDefinitions = entries[0].value;

      // The watch can send the same update repeatedly, so shorting it here
      if (this.#flagDefinitions === flagDefinitions) {
        continue;
      }

      this.#saveFlagDefinitionsWithErrorHandling(flagDefinitions);
    }
  }

  onClose?(): Promise<void> {
    this.#flagDefinitionsWatchStream?.cancel();

    return Promise.resolve();
  }

  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<boolean>> {
    const resolutionDetails = this.#flagdCoreInstance.resolveBooleanEvaluation(
      flagKey,
      defaultValue,
      context,
      logger,
    );

    return Promise.resolve(resolutionDetails);
  }
  resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<string>> {
    const resolutionDetails = this.#flagdCoreInstance.resolveStringEvaluation(
      flagKey,
      defaultValue,
      context,
      logger,
    );

    return Promise.resolve(resolutionDetails);
  }
  resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<number>> {
    const resolutionDetails = this.#flagdCoreInstance.resolveNumberEvaluation(
      flagKey,
      defaultValue,
      context,
      logger,
    );

    return Promise.resolve(resolutionDetails);
  }
  resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<T>> {
    const resolutionDetails = this.#flagdCoreInstance.resolveObjectEvaluation(
      flagKey,
      defaultValue,
      context,
      logger,
    );

    return Promise.resolve(resolutionDetails);
  }

  // implement with "new OpenFeatureEventEmitter()", and use "emit()" to emit events
  events?: ProviderEventEmitter<AnyProviderEvent> | undefined;
}

/**
 * Create an OpenFeature provider intended for usage on Deno Deploy
 * It will pull feature flag state from KV when evaluating feature flags
 * @param kv A Deno.kv connection (e.g. obtained from Deno.openKv per https://deno.land/api@v1.43.6?s=Deno.openKv&unstable=)
 * @returns an instance of the provider
 */
function createProvider(kv: Deno.Kv): Provider {
  return new DenoProvider(kv);
}

export { createProvider };
