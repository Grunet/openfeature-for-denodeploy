// Run from this as the working directory with the following
// deno run --unstable-kv --allow-read=flags.json updateKv.ts

import { createKvClient } from "jsr:@grunet/openfeature-for-denodeploy";

const kv = await Deno.openKv();
const client = createKvClient(kv);

const json = await Deno.readTextFile("./flags.json");

await client.updateFlagDefinitions(json);
