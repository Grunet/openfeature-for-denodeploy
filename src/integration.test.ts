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

Deno.test("No configuration set in KV", async () => {
  const kv = await Deno.openKv(":memory:");

  try {
    // Arrange

    // Missing the steps to set config into KV

    const provider = createProvider(kv);

    await OpenFeature.setProviderAndWait(provider);

    const client = OpenFeature.getClient();

    // Act
    const flagEvaluation = await client.getBooleanValue("myBoolFlag", false);

    // Assert
    assertEquals(flagEvaluation, false); // Matching the default value from above
  } finally {
    kv.close();
  }
});

Deno.test("Unexpected data set into KV", async () => {
  const kv = await Deno.openKv(":memory:");

  try {
    // Arrange
    const kvClient = createKvClient(kv);
    // deno-lint-ignore no-explicit-any -- need to explictly set bad data
    await kvClient.updateFlagDefinitions(undefined as any);

    const provider = createProvider(kv);

    await OpenFeature.setProviderAndWait(provider);

    const client = OpenFeature.getClient();

    // Act
    const flagEvaluation = await client.getBooleanValue("myBoolFlag", false);

    // Assert
    assertEquals(flagEvaluation, false); // Matching the default value
  } finally {
    kv.close();
  }
});
