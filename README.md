# heurekaprotocols

Public, cited wet-lab protocols from [Heureka Labs](https://heurekalabs.co). One canonical page per
method, plus variants for the contexts where the steps genuinely differ.

This repository is the source of truth for protocol content. Nothing else lives here.

## What a protocol is here

A recipe. Every lab cooks for its own diners: a protocol is a starting point that a scientist adapts
to their organism, sample and bench, not a law. What we publish is the base recipe, done properly:

- **Cited at every step.** Each step, and every amount, time and temperature in it, traces to a
  published source. A protocol "works" because it comes from a citation, the way a recipe works once
  a chef has cooked it and a diner has ordered it.
- **Synthesised, not copied.** A canonical page brings together the published uses of a method and
  shows where they agree and where they differ.
- **Clear about context.** Each page says which organism, sample, scale and equipment it is for.
  Cloning in *C. elegans* is not cloning in human cells, so those are separate variants.
- **Clear about what matters.** Steps the method depends on are marked critical. Everything else is
  yours to change.
- **Credit to the originators.** The people and papers a protocol came from are cited first.

How a page is written, and what the checks enforce, is in [AGENTS.md](AGENTS.md).

## Layout

```
protocols/<method>/
  protocol.md              # the canonical page: YAML frontmatter + Markdown body
  variants/<variant>.md    # context variants, each naming its parent and version
  seqspec.yaml             # sequencing protocols only: the library structure
  figures/                 # optional
```

## Contributing

Request a protocol, or offer your own, through an
[issue](https://github.com/heurekalabsco/heurekaprotocols/issues/new/choose). Contributions are
credited to you by name (and ORCID, if you give one). See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Protocol content is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); code is Apache-2.0.
Pages adapted from third-party text keep their original licence and are listed in [NOTICE](NOTICE).
