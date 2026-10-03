# Contributing

## Request a protocol, or offer yours

Open a [protocol request](https://github.com/heurekalabsco/heurekaprotocols/issues/new?template=protocol-request.yml).
Use it to ask for a method we don't cover, a variant for your organism or setup, or to offer a
protocol you published. Published protocols are credited to their originators by name, and by
ORCID iD if you give one.

## Write a page

1. Read [AGENTS.md](AGENTS.md). It is the standard every page meets.
2. Add `protocols/<method>/protocol.md`, or a variant under `protocols/<method>/variants/`.
3. Run the checks:

   ```bash
   npm ci
   npm run validate
   npm run check-versions
   ```

4. Open a pull request. CI runs the same checks.

## Before you push

This repository is public, including every commit, branch, commit message and pull request, and
that history is permanent. Only commit text you have the right to publish under the page's licence
(AGENTS.md §9), and get a page right locally before pushing it.
