import { createProvider } from "jsr:@grunet/openfeature-for-denodeploy";
import { OpenFeature } from "npm:@openfeature/server-sdk@1.14.0";

const kv = await Deno.openKv();
const provider = createProvider(kv);

await OpenFeature.setProviderAndWait(provider);

const client = OpenFeature.getClient();

Deno.serve(async (_req: Request) => {
  const boolEval = await client.getBooleanValue("new-welcome-banner", false, {
    email: "test@example.com",
  });

  return new Response(`Flag evaluationi ${boolEval}`);
});
