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

Create a script called `updateKv.ts` as follows

```ts
import { createKvClient } from "jsr:@grunet/openfeature-for-denodeploy";

const urlToKv =
  "https://api.deno.com/databases/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/connect";

const kv = await Deno.openKv(urlToKv);
const client = createKvClient(kv);

const json = await Deno.readTextFile("./flags.json");

await client.updateFlagDefinitions(json);
```

Before you can run it you'll need to get 2 things

1. The URL to connect to KV with from the Deno CLI
2. A Deno Deploy access token

The former can be found at
`https://dash.deno.com/projects/<your project name>/kv`. Update the `urlToKv`
variable in the script with its value.

The latter can be created at https://dash.deno.com/account#access-tokens.

To run the script you'll want to run the following command from the script's
working directory, substituting in your access token for the placeholder.

```bash
DENO_KV_ACCESS_TOKEN=<replace with your access token> deno run --unstable-kv --allow-read=flags.json --allow-env=DENO_KV_ACCESS_TOKEN --allow-net updateKv.ts
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
definitions JSON is updated later, the library will update too.

### Start Evaluating Feature Flags in Application Code

This can be done in several ways depending on if the flag is a boolean flag, a
string flag, a number flag, or an object flag. But they all look the same like
in this example

```js
const boolEval = await client.getBooleanValue("flag-name", false, {
  email: "test@example.com",
});
```

The 2nd parameter in the function call is the default value to return if
something goes wrong with the library's evaluation. The 3rd parameter is a
context object that will be evaluated against the flag definitions' attribute
targeting rules for matches.
