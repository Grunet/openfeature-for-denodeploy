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

  #flagDefinitions: string | undefined = undefined;

  async initialize?(_context?: EvaluationContext | undefined): Promise<void> {
    try {
      const kvJson = await this.#kv.get([FEATURE_FLAGS_KEY]);
      if (
        typeof kvJson.value !== "string" && typeof kvJson.value !== "undefined"
      ) {
        throw new Error(
          `Flag state stored in KV at key [${FEATURE_FLAGS_KEY}] was unexpectedly neither a string nor undefined`,
        );
      }
      this.#flagDefinitions = kvJson.value;

      this.#flagdCoreInstance.setConfigurations(this.#flagDefinitions ?? "");
    } catch (error) {
      // No-op in case something went wrong (e.g. the flags defintion file not being parseable)
      console.error(error);
    }
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

  onClose?(): Promise<void> {
    // code to shut down your provider
    return Promise.resolve();
  }
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
