import { FEATURE_FLAGS_KEY } from "./constants.ts";

/**
 * An interface that the client for interacting with feature flag state in KV follows.
 * Here mostly to avoid leaking implementation details
 */
interface IKvClient {
  /**
   * Updates KV with the JSON from a feature flag state file
   * @param json The JSON stored in a feature flag state file (use Deno.readTextFile to extract the JSON to pass in here)
   */
  updateFlagsFromJson(json: string): Promise<void>;
}

class KvClient implements IKvClient {
  #kv: Deno.Kv;

  constructor(kv: Deno.Kv) {
    this.#kv = kv;
  }

  async updateFlagsFromJson(json: string): Promise<void> {
    await this.#kv.set([FEATURE_FLAGS_KEY], json);
  }
}

/**
 * Creates a client for interacting with feature flag state in KV
 * @param kv A Deno.kv connection (e.g. obtained from Deno.openKv per https://deno.land/api@v1.43.6?s=Deno.openKv&unstable=)
 * @returns an instance of the client
 */
function createKvClient(kv: Deno.Kv): IKvClient {
  return new KvClient(kv);
}

export { createKvClient };
export type { IKvClient };
