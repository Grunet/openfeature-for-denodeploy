# Maintenance

This library isn't too large but there are still things to maintain, such as

1. Deno versions
   - In `.devcontainer/Dockerfile`
   - In `.github/workflows/ci.yaml`
   - In `.github/workflows/publish.yaml`
2. Github Actions runner version
   - In `.github/workflows/ci.yaml`
   - In `.github/workflows/publish.yaml`
3. 3rd Party Github Actions
   - In `.github/workflows/ci.yaml`
   - In `.github/workflows/publish.yaml`
4. Library dependencies
   - In `./src/deps.ts`
   - In `./src/integration.test.ts`

The emphasis should be on keeping up-to-date with major version changes (to stay
close for security patches) while minimizing other upgrades (to reduce supply
chain security attack risk).
