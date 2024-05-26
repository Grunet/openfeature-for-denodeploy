# Changelog

## v0.2.1

- Update the example to use an environment variable instead of a hard-coded
  string

## v0.2.0

- Add a method to read the feature flag definitions from KV

## v0.1.8

- Refactor saving to reduce some code duplication

## v0.1.7

- Fix to the watch not getting setup if the initial config is invalid

## v0.1.6

- Update logging to be more consistent and helpful

## v0.1.5

- Fix issue where the flag definitions member property can get out of sync with
  what's stored in the FlagdCore instance and add some relevant tests

## v0.1.4

- Add a test for invalid flag definitions configuration

## v0.1.3

- Minor improvements to the README

## v0.1.2

- Fix creating a new KV watcher every time the flag definitions changed

## v0.1.1

- Add missing documentation into the README
- Add example files for how to use on Deno Deploy

## v0.1.0

Initial functionality

- A client to store feature flag definitions in KV
- An OpenFeature provider that references values in KV

## v0.0.1

- Sets up CI and publish workflows with a dummy entrypoint
