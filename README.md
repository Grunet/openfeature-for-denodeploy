# OpenFeature for Deno Deploy

## What is It?

A feature flagging library for use on Deno Deploy, built on top of
[OpenFeature](https://openfeature.dev/).

A feature flag is a context-aware configuration point, often used for decoupling
application releases from deploys, experimentation, and safely rolling out code
changes.

## How Does It Work?

There are 4 steps to start using feature flags with this library:

1. Declare feature flag definitions in a JSON file
2. Upload that JSON file to KV
3. Have the feature flagging library reference that JSON
4. Start evaluating feature flags in application code

### Declaring Feature Flag Definitions in a JSON File

Create a JSON file called `flags.json` following the rules at
https://flagd.dev/reference/flag-definitions/ (you can start with an empty
object `{}` if you don't have any flags to define just yet). You can also find
other examples at
https://github.com/open-feature/flagd/tree/main/config/samples.

You should end up with something like this

```json
{
  "$schema": "https://flagd.dev/schema/v0/flags.json",

  "flags": {
    "new-welcome-banner": {
      "state": "ENABLED",

      "variants": {
        "on": true,

        "off": false
      },

      "defaultVariant": "off",

      "targeting": {
        "if": [
          { "ends_with": [{ "var": "email" }, "@example.com"] },

          "on",

          "off"
        ]
      }
    }
  }
}
```

### Upload the JSON File to KV

Create a script called `updateFlagDefinitionsInKv.ts` (for use with the Deno
CLI) as follows

```ts
import { createKvClient } from "jsr:@grunet/openfeature-for-denodeploy";

const urlToKv = Deno.env.get("URL_TO_KV");
const kv = await Deno.openKv(urlToKv);
const client = createKvClient(kv);

const json = await Deno.readTextFile("./flags.json");

await client.updateFlagDefinitions(json);

const flagDefinitions = await client.readFlagDefinitions();
console.log("New flag definitions:", flagDefinitions);
```

Before you can run it you'll need to get 2 things

1. The URL with which to connect to Deno Deploy's KV from the Deno CLI
2. A Deno Deploy access token

The former can be found at
`https://dash.deno.com/projects/<your project name>/kv`. It should look like
`"https://api.deno.com/databases/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/connect"`.

The latter can be created at https://dash.deno.com/account#access-tokens.

To run the script you'll want to run the following commands from the script's
working directory, substituting in the KV url and your access token for the
placeholders.

```bash
export URL_TO_KV=<replace with the url to KV>
export DENO_KV_ACCESS_TOKEN=<replace with your access token> 

deno run --unstable-kv --allow-read=flags.json --allow-env=URL_TO_KV,DENO_KV_ACCESS_TOKEN --allow-net updateFlagDefinitionsInKv.ts
```

This will store the flag definitions JSON into KV in Deno Deploy for your
project.

### Have the Feature Flagging Library Reference that JSON

If you're using a `deps.ts` file or similar to centralize your dependencies, you
can add a few lines to it to initialize the feature flagging library

```ts
import { createProvider } from "jsr:@grunet/openfeature-for-denodeploy";
import { OpenFeature } from "npm:@openfeature/server-sdk";

const kv = await Deno.openKv();
const provider = createProvider(kv);

await OpenFeature.setProviderAndWait(provider);

const client = OpenFeature.getClient();

export { client };
```

This will automatically read the flag definitions JSON from KV and initialize
the library with it. It will also setup a KV watcher so that if the flag
definitions JSON is updated later on, the library will update too.

### Start Evaluating Feature Flags in Application Code

This can be done in several ways depending on if the flag is a boolean flag, a
string flag, a number flag, or an object flag. But they all look similar to this
example

```js
const boolEval = await client.getBooleanValue("new-welcome-banner", false, {
  email: "test@example.com",
});
```

The 1st parameter in the function call is the name of the feature flag.

The 2nd parameter is the default value to return if something goes wrong with
the library's evaluation.

The 3rd parameter is a context object that will be evaluated against the flag
definitions' attribute targeting rules for matches.

## Other Recommendations

There are 2 other suggestions I'd recommend to complete the overall workflow

1. Version Control
2. Automation

Keeping the flag definitions in a version control system has all the usual
benefits of keeping things in version control.

And automating updates to the flag definitions (e.g. via Github Actions) also
brings the usual benefits. For example, this is what a Github Workflow could
look like for keeping flag definitions updated in KV

```yaml
name: Update Flag Definitions in KV

on:
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-24.04
    environment: flagDefinitions
    steps:
      - uses: actions/checkout@a5ac7e51b41094c92402da3b24376905380afc29 # v4.1.6

      - uses: denoland/setup-deno@041b854f97b325bd60e53e9dc2de9cb9f9ac0cba # v1.1.4
        with:
          deno-version: "1.43.5"

      - name: Update Flag Definitions
        env:
          URL_TO_KV: ${{ secrets.URL_TO_KV }}
          DENO_KV_ACCESS_TOKEN: ${{ secrets.DENO_KV_ACCESS_TOKEN }}
        run: |
          deno run --unstable-kv --allow-read=flags.json --allow-env=URL_TO_KV,DENO_KV_ACCESS_TOKEN --allow-net updateFlagDefinitionsInKv.ts
```

All that's needed is to set `URL_TO_KV` and `DENO_KV_ACCESS_TOKEN` (see above
for their definitions) as environment secrets in the `flagDefinitions`
environment (which can be created in Github at Settings > Environments). Then
manually running the workflow will update the flag definitions in KV.

## Cost Analysis

A flag definitions file will be on the order of 1-10 kb in size. Let's take 10
kb as the worse scenario. This is small compared to the
[Deno Deploy free tier limit](https://deno.com/deploy/pricing) of 1 GB for KV
storage.

Imagine a scenario where a project autoscales from 0 isolates at night to a
steady 10 isolates during the day, and a feature flag update is made once per
day.

This will result in 30 writes to KV per month, for a total of 300 kb. 1 KV write
unit is 1 kb, so this would total 300 write units per month. This is small
compared to the Deno Deploy free tier limit of 300,000 KV write units per month.

Every isolate spin up will read the 10kb flag definitions from KV, and then a
feature flag update will cause another read from the KV watcher, for a total of
20 kb per isolate per day, and so 6,000 kb per month. The feature flag update
also reads the 10 kb flag definitions from KV, adding 300 kb per month for a
total of 6,300 kb per month. 1 KV read unit is 4 kb, so this would total 1,575
read units per month. This is small compared to the Deno Deploy free tier limit
of 450,000 KV read units per month.

If instead 100 isolates are spun up per day (e.g. from autoscaling back down,
then up, then down, etc...), the read units used should still be small compared
to the free tier limits. If instead 1,000 isolates or more are spun up per day,
the read units used will become a significant fraction of the free tier limits.
