# heurekaprotocols

The public side of **Heureka Protocols**: where you request a protocol, contribute your own for
credit, and find the standard contributions meet.

Heureka Protocols brings together the published protocols for each wet-lab method and builds a
cited recipe from them, one page per method, plus variants for the organisms and setups where the
steps genuinely differ. The recipes are published on the Heureka Protocols site. This repository
holds the parts that belong in the open:

- **Requests.** Ask for a method, a variant for your organism or setup, or offer your own protocol,
  through an [issue](https://github.com/heurekalabsco/heurekaprotocols/issues/new/choose).
- **Contributed protocols.** Protocols their originators publish here under their own name. Each
  one becomes a credited source for the recipes built from it.
- **The standard.** [AGENTS.md](AGENTS.md) says how a contributed protocol is written, and the
  checks in `scripts/` enforce it.

## What a protocol is here

A recipe. Every lab cooks for its own diners: a protocol is a starting point that a scientist
adapts to their organism, sample and bench, not a law.

- **Cited at every step.** Each step, and every amount, time and temperature in it, traces to a
  published source. A protocol works because it comes from a citation, the way a recipe works
  once a chef has cooked it and a diner has ordered it.
- **Clear about context.** Each protocol says which organism, sample, scale and equipment it is
  for. Cloning in *C. elegans* is not cloning in human cells.
- **Clear about what matters.** Steps the method depends on are marked critical. Everything else
  is yours to change.
- **Credit to the originators.** The people and papers a protocol came from are cited first.

## Layout

```
protocols/<method>/
  protocol.md              # a contributed protocol: YAML frontmatter + Markdown body
  variants/<variant>.md    # a contributed variant for another context
  seqspec.yaml             # sequencing protocols only: the library structure
  figures/                 # optional
```

## Contributing

Open a [protocol request](https://github.com/heurekalabsco/heurekaprotocols/issues/new/choose), or
write the protocol yourself to the standard and open a pull request. Contributions are credited to
you by name, and by ORCID iD if you give one. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Contributed protocols are [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), credited to
their contributors; code is Apache-2.0. Protocols adapted from third-party text keep their original
licence and are listed in [NOTICE](NOTICE).
