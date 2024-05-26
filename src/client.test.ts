import { createKvClient } from "./client.ts";

import { assertEquals } from "jsr:@std/assert@0.225.3";

Deno.test("Read works after update", async () => {
  const kv = await Deno.openKv(":memory:");

  try {
    // Arrange
    const client = createKvClient(kv);

    await client.updateFlagDefinitions("test configuration");

    // Act
    const newFlagDefinitions = await client.readFlagDefinitions();

    // Assert
    assertEquals(newFlagDefinitions, "test configuration");
  } finally {
    kv.close();
  }
});
