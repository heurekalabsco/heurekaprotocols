# Contributing a protocol

The standard for every protocol contributed to this repository, for people and agents alike.
`npm run validate` enforces the parts a machine can check. The rest is on the author.

A contributed protocol is published here under its contributor's name. Heureka Protocols then uses
it as a credited source, alongside the other published protocols for the same method, when it
builds the recipe for that method.

## 1. The recipe model

Protocols are recipes. Keep the analogy close.

- **A recipe is a starting point, not a law.** A cook who doesn't like tomatoes leaves them off the
  hamburger, and it is still a hamburger. A scientist who swaps a buffer, scales to a 96-well plate
  or skips an optional wash is still running the protocol. Protocols are written to be adapted.
- **Some ingredients are the dish.** Leave out the beef and it isn't a hamburger. Leave out the
  transposase and it isn't CUT&Tag. Mark what the method depends on as `critical`, and say why.
- **Bespoke is normal.** Your lab's version is a legitimate protocol, and so is everyone else's.
  Contribute the version you actually run, for the context you run it in.
- **A recipe works once someone has cooked it and someone has ordered it.** A protocol here works
  because it comes from a published, cited source: usually your own paper.
- **Credit the original cook.** The people and papers a protocol came from are cited first.

## 2. The two tests

Every page passes both.

**Validity: every step traces to a reference.**
- Every step, and every amount, time, temperature, speed and cycle count in it, cites a source.
  Usually that is the paper your protocol was published in; cite others where a step comes from
  them.
- Reagents carry an RRID or a vendor catalog number. Kits carry the vendor's document id and
  revision. Organisms carry their NCBI Taxonomy id.
- The **Principle** section explains the mechanism: what each enzyme does, where it acts, and what
  ends up where on the molecule.

**Utility: the protocol says what it is for.** Each protocol declares one context:

| Field | Vocabulary | Example |
|---|---|---|
| `organism` | NCBI Taxonomy (name + taxon id) | *Caenorhabditis elegans*, 6239 |
| `sample` | free text, preferably Cell Ontology / UBERON terms | L4 hermaphrodite; HEK293T |
| `technique` | a short slug | `crispr-knock-in` |
| `target` | gene symbols, where the protocol is gene-specific | `unc-54` |
| `scale` | `single-sample` · `multiwell` · `pooled` | |
| `equipment` | free text list | microinjection rig |
| `readout` | `sequencing` · `imaging` · `gel` · `plate-reader` · `mass-spec` · `flow` · `pcr` · `other` | |

When a change of context changes the steps, write a **variant**, not a footnote.

## 3. Layout

```
protocols/<method>/
  protocol.md              # the method's protocol
  variants/<variant>.md    # context variants
  seqspec.yaml             # required when readout includes sequencing
  figures/                 # optional: .svg or .png
```

`<method>` and `<variant>` are lowercase slugs: `^[a-z0-9-]+$`. A page's `slug` equals its directory
name (canonical) or file name (variant).

## 4. Frontmatter

```yaml
---
slug: crispr-knock-in
title: CRISPR/Cas9 knock-in
version: 1.0.0
summary: Insert a tag or edit at a defined locus by homology-directed repair from a template.
context:
  organism: [{name: Homo sapiens, taxon: 9606}]
  sample: [HEK293T]
  technique: crispr-knock-in
  scale: single-sample
  readout: [pcr, imaging]
time: {total: 3w, hands_on: 6h}
safety: {biosafety_level: 1, hazards: []}
reagents:
  - {id: cas9, name: SpCas9 protein, role: nuclease, critical: true, source: {vendor: Example Co, catalog: "000-000"}}
  - {id: anti-gfp, name: anti-GFP antibody, role: antibody, rrid: AB_0000000}
kit_documents: []
sources:
  - {id: 1, doi: 10.0000/example, license: CC-BY-4.0, relation: primary}
contributors:
  - {name: Jane Doe, orcid: 0000-0000-0000-0000, role: originator}
license: CC-BY-4.0
supersedes: null
---
```

| Field | Rule |
|---|---|
| `version` | semver; see §8 |
| `summary` | one line, at most 400 characters |
| `context.organism` | at least one, each with an integer `taxon` |
| `reagents` | each has `id`, `name`, `role`, and an `rrid` or a `source` with `vendor` and `catalog`. `critical: true` marks an ingredient the method depends on |
| `kit_documents` | `{vendor, document, revision}` for every vendor kit protocol relied on |
| `sources` | at least one; each has a unique integer `id`, a `doi` or `url`, its `license`, and a `relation`: `primary` · `adapted` · `cited` · `variant` |
| `contributors` | at least one; each has `name` and `role` (`originator` · `author` · `adapter`); `orcid` optional |
| `license` | one of: `CC-BY-4.0`, `CC0-1.0`, `MIT`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0` |
| `safety.biosafety_level` | 1 or 2 |
| variants only | `parent: <method>@<version>`, naming the method's protocol.md and the version it differs from |

## 5. Body: required sections, in this order

```
## Overview
## Principle
## Library structure          (only when readout includes sequencing)
## Materials
## Steps
## Critical parameters and limitations
## Expected results and QC
## Troubleshooting
## Variants and changes
## References
```

- **Materials** is a Key Resources Table: reagent, role, source, identifier, citation.
- **Troubleshooting** entries name the steps they concern as `#step-id`, and each must be a step on
  the page.
- **References** lists every `sources` entry by its `id`.

## 6. Steps

Each step is a level-3 heading with a stable anchor, followed by a **step line** in backticks:

```markdown
### 4. Inject the gonad {#inject}
`inject` · 20 ng/µL Cas9 RNP + 50 ng/µL repair template [2,5] · young adults [2]

Load the needle with … (prose explains; the step line carries the quantities)
```

- **The anchor `{#step-id}` is permanent.** Comments, diffs and adaptations key on it.
  Renumbering headings is free. Removing or re-meaning an id needs a line in the change log.
- **The step line starts with an action** from this list: `add`, `mix`, `incubate`, `centrifuge`,
  `wash`, `bind`, `elute`, `amplify`, `purify`, `inject`, `transform`, `transfect`, `fix`,
  `permeabilize`, `lyse`, `stain`, `image`, `measure`, `sequence`, `store`, `pause`.
- **It carries the quantities, with units, and their citations** as `[n]` or `[n,m]`, matching
  `sources` ids. Separate items with ` · `; every item that states a number carries its own
  citation.
- **Critical steps** add `· critical: <why>`.
- **Prose never states a quantity the step line does not.**

## 7. Variants

A variant is the same method for a different context: another organism, sample, scale or kit.
Contribute one when you run a method that is already here, and your context changes its steps.

- It is a complete page, readable on its own, with its own `context`.
- It names `parent: <method>@<version>`, no later than the parent's current version.
- It keeps the parent's step ids wherever the step is the same, so the two compare cleanly.
- Its `contributors` credit the parent's originators as well as you.

## 8. Versioning

Every page carries its own semver, starting at `1.0.0`.
- **Minor:** a changed step, amount, time or recommendation.
- **Patch:** wording and links.
- **Never a major bump.** A new kit chemistry that changes the steps is a **new method slug**,
  linked from the old page by `supersedes`.

`npm run check-versions` fails a change that does not move the version.

## 9. Sources and licences

**Whose text is it?**
- **Original:** you wrote it, from your own work or from the facts. It is `CC-BY-4.0`, credited to
  you. Steps, amounts and timings are facts; restating them in your own words is original work.
  Contributing a protocol from your own paper is the usual case: check that your publisher's
  agreement leaves you free to publish the method text under CC BY, or write it fresh.
- **Adapted:** you reused a source's own prose, structure or worked examples, including by
  rewording them.
  - Mark that source `relation: adapted`.
  - Set `license` to that source's licence, which must be on the list in §4.
  - Add the page to `NOTICE`.
  - If you cannot tell which you did, treat it as adapted.

**Never:**
- copy text from vendor manuals or subscription sources: cite them and restate the facts;
- adapt non-commercial (`-NC`), share-alike, or unlicensed text.

## 10. Credit

- **Originators first:** the people and papers a protocol came from, then everyone else.
- A contributor who publishes their own protocol is credited by name (and ORCID, if given) as
  `originator`.
- That credit travels. Every recipe on Heureka Protocols built from your protocol cites you as a
  source, and your originator page shows your protocols and how often they have been adapted.
- A variant carries its parent's originators forward in its own `contributors`.

## 11. Safety and scope

**Out of scope:**
- select agents and toxins;
- culture or enhancement of human, animal or plant pathogens;
- synthesis of regulated sequences;
- anything above biosafety level 2.

Pages are screened before publication. A page that touches these is not published.

Each page lists its chemical and biological hazards in `safety.hazards`.

## 12. Checks

```bash
npm ci
npm run validate          # frontmatter, sections, steps, citations, identifiers, licences, files
npm run check-versions    # every changed page moved its version
```

CI runs both on every pull request.

## 13. This repository is public, including its history

Every commit, branch, commit message and pull request here is public, permanently. Deleting a file
in a later commit does not remove it from history. Get a protocol right before you push it.
