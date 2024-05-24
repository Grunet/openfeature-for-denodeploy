// Run from this as the working directory with the following
// DENO_KV_ACCESS_TOKEN=<Gotten from https://dash.deno.com/account#access-tokens> deno run --unstable-kv --allow-read=flags.json --allow-env=DENO_KV_ACCESS_TOKEN --allow-net updateKv.ts
// Have to use --allow-net because wildcards aren't allowed (see https://github.com/denoland/deno/issues/6532)

import { createKvClient } from "jsr:@grunet/openfeature-for-denodeploy";

// TODO - replace this with your project's URL (found at https://dash.deno.com/projects/<your project name>/kv)
const urlToKv =
  "https://api.deno.com/databases/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/connect";

const kv = await Deno.openKv(urlToKv);
const client = createKvClient(kv);

const json = await Deno.readTextFile("./flags.json");

await client.updateFlagDefinitions(json);
