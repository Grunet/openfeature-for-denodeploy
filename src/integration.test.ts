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

Deno.test("Configuration deleted from KV", async () => {
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
    await kvClient.deleteFlagDefinitions();

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

Deno.test("Invalid configuration set into KV", async () => {
  const kv = await Deno.openKv(":memory:");

  try {
    // Arrange
    const kvClient = createKvClient(kv);
    await kvClient.updateFlagDefinitions("");

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

Deno.test("Subsequent valid flag definition updates take hold", async () => {
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
    const boolEval1 = await client.getBooleanValue("myBoolFlag", false); // Setting the default value to something different than the expected value

    // Assert
    assertEquals(boolEval1, true);

    // Arrange
    await kvClient.updateFlagDefinitions(`{
      "$schema": "https://flagd.dev/schema/v0/flags.json",
      "flags": {
        "myBoolFlag": {
          "state": "ENABLED",
          "variants": {
            "on": true,
            "off": false
          },
          "defaultVariant": "off"
        }
      }
    }`);

    // Need to give it at least a tick for the watch to register the new value
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve("something");
      }, 0);
    });

    // Act
    const boolEval2 = await client.getBooleanValue("myBoolFlag", true); // Setting the default value to something different than the expected value

    // Assert
    assertEquals(boolEval2, false);
  } finally {
    kv.close();
  }
});

Deno.test("Subsequent invalid flag definition updates do not take hold", async () => {
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
    const boolEval1 = await client.getBooleanValue("myBoolFlag", false); // Setting the default value to something different than the expected value

    // Assert
    assertEquals(boolEval1, true);

    // Arrange
    await kvClient.updateFlagDefinitions(`invalid configuration`);

    // Need to give it at least a tick for the watch to register the new value
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve("something");
      }, 0);
    });

    // Act
    const boolEval2 = await client.getBooleanValue("myBoolFlag", false); // Setting the default value to something different than the expected value

    // Assert
    assertEquals(boolEval2, true);
  } finally {
    kv.close();
  }
});

Deno.test("Valid flag definition updates can be made after invalid ones did not take hold", async () => {
  const kv = await Deno.openKv(":memory:");

  try {
    // Arrange
    const kvClient = createKvClient(kv);
    await kvClient.updateFlagDefinitions("invalid configuration");

    const provider = createProvider(kv);

    await OpenFeature.setProviderAndWait(provider);

    const client = OpenFeature.getClient();

    // Act
    const boolEval2 = await client.getBooleanValue("myBoolFlag", false);

    // Assert
    assertEquals(boolEval2, false); // Matching the default value

    // Arrange
    await kvClient.updateFlagDefinitions(`{
      "$schema": "https://flagd.dev/schema/v0/flags.json",
      "flags": {
        "myBoolFlag": {
          "state": "ENABLED",
          "variants": {
            "on": true,
            "off": false
          },
          "defaultVariant": "off"
        }
      }
    }`);

    // Need to give it at least a tick for the watch to register the new value
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve("something");
      }, 100);
    });

    // Act
    const boolEval3 = await client.getBooleanValue("myBoolFlag", true); // Setting the default value to something different than the expected value

    // Assert
    assertEquals(boolEval3, false);
  } finally {
    kv.close();
  }
});
