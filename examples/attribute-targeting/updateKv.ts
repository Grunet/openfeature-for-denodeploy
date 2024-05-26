// Run from this as the working directory with the following

// export URL_TO_KV=<Gotten from https://dash.deno.com/projects/<your project name>/kv>
// export DENO_KV_ACCESS_TOKEN=<Gotten from https://dash.deno.com/account#access-tokens>
// deno run --unstable-kv --allow-read=flags.json --allow-env=URL_TO_KV,DENO_KV_ACCESS_TOKEN --allow-net updateKv.ts

// Had to use --allow-net because wildcards aren't allowed and the CLI is reaching out to a URL like "us-east4.txnproxy.deno-gcp.net" (see https://github.com/denoland/deno/issues/6532)

import { createKvClient } from "jsr:@grunet/openfeature-for-denodeploy";

const urlToKv = Deno.env.get("URL_TO_KV");
const kv = await Deno.openKv(urlToKv);
const client = createKvClient(kv);

const json = await Deno.readTextFile("./flags.json");

await client.updateFlagDefinitions(json);

const flagDefinitions = await client.readFlagDefinitions();
console.log("New flag definitions:", flagDefinitions);
