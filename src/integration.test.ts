import { createKvClient, createProvider } from "./index.ts";

import { assertEquals } from "jsr:@std/assert@0.225.3";
import { OpenFeature } from "npm:@openfeature/server-sdk@1.14.0";

Deno.test("happy path", async () => {
  const kv = await Deno.openKv(":memory:");

  try {
    // Arrange
    const kvClient = createKvClient(kv);
    await kvClient.updateFlagDefinitions(`{
      "$schema": "https://flagd.dev/schema/v0/flags.json",
      "flags": {
        "myBoolFlag": {
          "state": "ENABLED",
          "variants": {
            "on": true,
            "off": false
          },
          "defaultVariant": "on"
        }
    }
  }`);

    const provider = createProvider(kv);

    await OpenFeature.setProviderAndWait(provider);

    const client = OpenFeature.getClient();

    // Act
    const flagEvaluation = await client.getBooleanValue("myBoolFlag", false); // Setting the default value to something different than the expected value

    // Assert
    assertEquals(flagEvaluation, true);
  } finally {
    kv.close();
  }
});
