import { FEATURE_FLAGS_KEY } from "./constants.ts";

/**
 * An interface that the client for interacting with feature flag definitions in KV follows.
 * Here mostly to avoid leaking implementation details
 */
interface IKvClient {
  /**
   * Updates KV with the JSON from a feature flag definition file (see https://flagd.dev/reference/flag-definitions/ for how these files are defined)
   * @param configAsString The JSON stored in a feature flag definition file (use Deno.readTextFile to extract the JSON to pass in here)
   */
  updateFlagDefinitions(configAsString: string): Promise<void>;
  /**
   * Deletes the feature flag defintions stored in KV
   */
  deleteFlagDefinitions(): Promise<void>;
  /**
   * Reads the feature flag definitions stored in KV
   */
  readFlagDefinitions(): Promise<unknown>;
}

class KvClient implements IKvClient {
  #kv: Deno.Kv;

  constructor(kv: Deno.Kv) {
    this.#kv = kv;
  }

  async updateFlagDefinitions(configAsString: string): Promise<void> {
    await this.#kv.set([FEATURE_FLAGS_KEY], configAsString);
  }

  async deleteFlagDefinitions(): Promise<void> {
    await this.#kv.delete([FEATURE_FLAGS_KEY]);
  }

  async readFlagDefinitions(): Promise<unknown> {
    const kvJson = await this.#kv.get([FEATURE_FLAGS_KEY]);

    return kvJson.value;
  }
}

/**
 * Creates a client for interacting with feature flag definitions in KV
 * @param kv A Deno.kv connection (e.g. obtained from Deno.openKv per https://deno.land/api@v1.43.6?s=Deno.openKv&unstable=)
 * @returns an instance of the client
 */
function createKvClient(kv: Deno.Kv): IKvClient {
  return new KvClient(kv);
}

export { createKvClient };
export type { IKvClient };
