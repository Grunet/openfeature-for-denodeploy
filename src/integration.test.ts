import { createKvClient, createProvider } from "./index.ts";

import { assertEquals } from "jsr:@std/assert@0.225.3";
import { OpenFeature } from "npm:@openfeature/server-sdk@1.14.0";

Deno.test("Happy path", async () => {
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
          },
          "myStringFlag": {
            "state": "ENABLED",
            "variants": {
              "key1": "val1",
              "key2": "val2"
            },
            "defaultVariant": "key1"
          },
          "myNumberFlag": {
            "state": "ENABLED",
            "variants": {
              "one": 1,
              "two": 2
            },
            "defaultVariant": "one"
          },
          "myObjectFlag": {
            "state": "ENABLED",
            "variants": {
              "object1": {
                "key": "val"
              },
              "object2": {
                "key": true
              }
            },
            "defaultVariant": "object1"
          }
        }
      }`);

    const provider = createProvider(kv);

    await OpenFeature.setProviderAndWait(provider);

    const client = OpenFeature.getClient();

    // Act

    // Setting the default value to something different than the expected value each time

    const boolEval = await client.getBooleanValue("myBoolFlag", false);
    const stringEval = await client.getStringValue("myStringFlag", "val2");
    const numberEval = await client.getNumberValue("myNumberFlag", 2);
    const objectEval = await client.getObjectValue("myObjectFlag", {
      "key": true,
    });

    // Assert
    assertEquals(boolEval, true);
    assertEquals(stringEval, "val1");
    assertEquals(numberEval, 1);
    assertEquals(objectEval, { "key": "val" });
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
