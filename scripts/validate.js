// Check every protocol page against the standard in AGENTS.md.
//
//   node scripts/validate.js
//
// Exits non-zero on any error. Each message names the file and, where it can, the
// step or field, so a failure says what to fix rather than only that something broke.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  ROOT, PROTOCOLS, SLUG_RE, VERSION_RE, PARENT_RE, QUANTITY_RE, compareVersions, LICENSES, SOURCE_RELATIONS,
  CONTRIBUTOR_ROLES, SCALES, READOUTS, ACTIONS, SECTIONS, SEQUENCING_ONLY, ALLOWED_EXTS,
  MAX_FILE_BYTES, MAX_METHOD_BYTES, MAX_SUMMARY, parsePage, listPages, walk,
} from './lib.js';

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// Level-2 and level-3 headings outside fenced code, with their line numbers.
function headings(body) {
  const out = [];
  let fenced = false;
  body.split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return; }
    if (fenced) return;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (m) out.push({ level: m[1].length, text: m[2], line: i });
  });
  return out;
}

function citationsIn(text) {
  const ids = [];
  for (const m of text.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
    for (const n of m[1].split(',')) ids.push(Number(n.trim()));
  }
  return ids;
}

function checkFrontmatter(page, fm) {
  const at = page.rel;

  if (fm.slug !== page.expectedSlug) {
    fail(at, `slug "${fm.slug}" must equal "${page.expectedSlug}"`);
  }
  if (!SLUG_RE.test(String(fm.slug ?? ''))) fail(at, 'slug must match ^[a-z0-9-]+$');
  if (!nonEmpty(fm.title)) fail(at, 'title is required');
  if (!VERSION_RE.test(String(fm.version ?? ''))) fail(at, 'version must be semver, e.g. 1.0.0');
  if (!nonEmpty(fm.summary)) fail(at, 'summary is required');
  else if (fm.summary.length > MAX_SUMMARY) fail(at, `summary exceeds ${MAX_SUMMARY} characters`);

  // Context: what the page is for.
  const ctx = fm.context;
  if (!isObj(ctx)) {
    fail(at, 'context is required (organism, technique, …)');
  } else {
    const orgs = asList(ctx.organism);
    if (orgs.length === 0) fail(at, 'context.organism needs at least one entry');
    orgs.forEach((o, i) => {
      if (!isObj(o) || !nonEmpty(o.name) || !Number.isInteger(o.taxon)) {
        fail(at, `context.organism[${i}] needs a name and an integer NCBI taxon id`);
      }
    });
    if (!nonEmpty(ctx.technique) || !SLUG_RE.test(ctx.technique)) {
      fail(at, 'context.technique must be a slug');
    }
    if (ctx.scale != null && !SCALES.has(ctx.scale)) {
      fail(at, `context.scale must be one of: ${[...SCALES].join(', ')}`);
    }
    for (const r of asList(ctx.readout)) {
      if (!READOUTS.has(r)) fail(at, `context.readout "${r}" must be one of: ${[...READOUTS].join(', ')}`);
    }
  }

  // Safety.
  const bsl = fm.safety?.biosafety_level;
  if (!isObj(fm.safety)) fail(at, 'safety is required');
  else if (bsl !== 1 && bsl !== 2) fail(at, 'safety.biosafety_level must be 1 or 2; higher is out of scope');
  if (isObj(fm.safety) && !Array.isArray(fm.safety.hazards)) fail(at, 'safety.hazards must be a list (may be empty)');

  // Reagents: every one resolved to an identifier.
  const reagentIds = new Set();
  asList(fm.reagents).forEach((r, i) => {
    const where = `reagents[${i}]`;
    if (!isObj(r)) { fail(at, `${where} must be a mapping`); return; }
    if (!nonEmpty(r.id) || !SLUG_RE.test(r.id)) fail(at, `${where}.id must be a slug`);
    else if (reagentIds.has(r.id)) fail(at, `${where}.id "${r.id}" is duplicated`);
    else reagentIds.add(r.id);
    if (!nonEmpty(r.name)) fail(at, `${where}.name is required`);
    if (!nonEmpty(r.role)) fail(at, `${where}.role is required`);
    const hasSource = isObj(r.source) && nonEmpty(r.source.vendor) && nonEmpty(String(r.source.catalog ?? ''));
    if (!nonEmpty(r.rrid) && !hasSource) {
      fail(at, `${where} (${r.id ?? '?'}) needs an rrid or a source with vendor and catalog`);
    }
    if (r.critical != null && typeof r.critical !== 'boolean') fail(at, `${where}.critical must be true or false`);
  });

  asList(fm.kit_documents).forEach((k, i) => {
    if (!isObj(k) || !nonEmpty(k.vendor) || !nonEmpty(String(k.document ?? '')) || !nonEmpty(String(k.revision ?? ''))) {
      fail(at, `kit_documents[${i}] needs vendor, document and revision`);
    }
  });

  // Sources.
  const sourceIds = new Set();
  const sources = asList(fm.sources);
  if (sources.length === 0) fail(at, 'sources needs at least one entry: every page traces to a reference');
  sources.forEach((s, i) => {
    const where = `sources[${i}]`;
    if (!isObj(s)) { fail(at, `${where} must be a mapping`); return; }
    if (!Number.isInteger(s.id)) fail(at, `${where}.id must be an integer`);
    else if (sourceIds.has(s.id)) fail(at, `${where}.id ${s.id} is duplicated`);
    else sourceIds.add(s.id);
    if (!nonEmpty(s.doi) && !nonEmpty(s.url)) fail(at, `${where} needs a doi or url`);
    if (!nonEmpty(s.license)) fail(at, `${where}.license is required (use "all-rights-reserved" for closed sources)`);
    if (!SOURCE_RELATIONS.has(s.relation)) {
      fail(at, `${where}.relation must be one of: ${[...SOURCE_RELATIONS].join(', ')}`);
    }
  });

  // Licence, and adapted text.
  if (!LICENSES.has(fm.license)) fail(at, `license must be one of: ${[...LICENSES].join(', ')}`);
  const adapted = sources.filter((s) => isObj(s) && s.relation === 'adapted');
  for (const s of adapted) {
    if (!LICENSES.has(s.license)) {
      fail(at, `source ${s.id} is adapted but its license "${s.license}" is not one we can redistribute`);
    } else if (s.license !== fm.license) {
      fail(at, `source ${s.id} is adapted under ${s.license}, so license must be ${s.license}, not ${fm.license}`);
    }
  }

  // Contributors.
  const contributors = asList(fm.contributors);
  if (contributors.length === 0) fail(at, 'contributors needs at least one entry');
  contributors.forEach((c, i) => {
    if (!isObj(c) || !nonEmpty(c.name)) fail(at, `contributors[${i}].name is required`);
    else if (!CONTRIBUTOR_ROLES.has(c.role)) {
      fail(at, `contributors[${i}].role must be one of: ${[...CONTRIBUTOR_ROLES].join(', ')}`);
    }
    if (isObj(c) && c.orcid != null && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(String(c.orcid))) {
      fail(at, `contributors[${i}].orcid is not a valid ORCID iD`);
    }
  });

  // Variants name their parent.
  if (page.kind === 'variant') {
    const m = String(fm.parent ?? '').match(PARENT_RE);
    if (!m) fail(at, 'a variant needs parent: <method>@<version>');
    else if (m[1] !== page.method) fail(at, `parent method "${m[1]}" must be "${page.method}"`);
  } else if (fm.parent != null) {
    fail(at, 'only variants carry parent');
  }
  if (fm.supersedes != null && !SLUG_RE.test(String(fm.supersedes))) fail(at, 'supersedes must be a method slug or null');

  return { sourceIds, adapted: adapted.length > 0,
           parentVersion: page.kind === 'variant' ? String(fm.parent ?? '').match(PARENT_RE)?.[2] : null,
           sequencing: isObj(ctx) && asList(ctx.readout).includes('sequencing') };
}

function checkBody(page, body, { sourceIds, sequencing }) {
  const at = page.rel;
  const hs = headings(body);
  const lines = body.split('\n');

  // Sections, in order.
  const want = SECTIONS.filter((s) => sequencing || s !== SEQUENCING_ONLY);
  const got = hs.filter((h) => h.level === 2).map((h) => h.text);
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    fail(at, `sections must be, in order: ${want.join(' · ')}. Found: ${got.join(' · ') || 'none'}`);
  }

  // Steps: every level-3 heading under ## Steps has a stable anchor and a step line.
  const h2 = hs.filter((h) => h.level === 2);
  let stepIds = new Set();
  const stepsIdx = h2.findIndex((h) => h.text === 'Steps');
  if (stepsIdx !== -1) {
    const start = h2[stepsIdx].line;
    const end = stepsIdx + 1 < h2.length ? h2[stepsIdx + 1].line : lines.length;
    const steps = hs.filter((h) => h.level === 3 && h.line > start && h.line < end);
    if (steps.length === 0) fail(at, '## Steps has no steps (### Title {#step-id})');
    const ids = new Set();
    for (const s of steps) {
      const m = s.text.match(/\{#([^}]+)\}$/);
      if (!m) { fail(at, `step "${s.text}" needs an anchor: ### Title {#step-id}`); continue; }
      const id = m[1];
      if (!/^[a-z0-9-]+$/.test(id)) fail(at, `step id "${id}" must match ^[a-z0-9-]+$`);
      if (ids.has(id)) fail(at, `step id "${id}" is duplicated`);
      ids.add(id);

      const next = lines.slice(s.line + 1, end).find((l) => l.trim() !== '');
      const line = next?.trim() ?? '';
      const action = line.match(/^`([a-z-]+)`/);
      if (!action) { fail(at, `step #${id} needs a step line starting with \`action\``); continue; }
      if (!ACTIONS.has(action[1])) {
        fail(at, `step #${id}: action "${action[1]}" is not in the list in AGENTS.md §6`);
      }
      if (action[1] !== 'pause' && citationsIn(line).length === 0) {
        fail(at, `step #${id}: the step line must cite its source, e.g. [1]`);
      }
      // Every quantity cites: each `·` segment that states a quantity carries its own [n].
      for (const seg of line.replace(/^`[a-z-]+`/, '').split('·').map((x) => x.trim())) {
        if (!seg || /^critical:/.test(seg)) continue;
        const bare = seg.replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '');
        if (QUANTITY_RE.test(bare) && citationsIn(seg).length === 0) {
          fail(at, `step #${id}: "${seg}" states a quantity without a citation`);
        }
      }
    }
    stepIds = ids;
  }

  // Troubleshooting names the steps it concerns as #step-id; each must exist.
  const tsIdx = h2.findIndex((h) => h.text === 'Troubleshooting');
  if (tsIdx !== -1) {
    const start = h2[tsIdx].line;
    const end = tsIdx + 1 < h2.length ? h2[tsIdx + 1].line : lines.length;
    const text = lines.slice(start + 1, end).join('\n');
    for (const m of text.matchAll(/(?<![#\w{])#([a-z0-9-]+)/g)) {
      if (!stepIds.has(m[1])) fail(at, `Troubleshooting refers to #${m[1]}, which is not a step id`);
    }
  }

  // Every citation points at a source, and every source is cited.
  const cited = new Set(citationsIn(body));
  for (const n of cited) {
    if (!sourceIds.has(n)) fail(at, `citation [${n}] has no matching sources entry`);
  }
  for (const n of sourceIds) {
    if (!cited.has(n)) fail(at, `source ${n} is never cited in the body`);
  }
}

function checkFiles() {
  if (!fs.existsSync(PROTOCOLS)) return;
  for (const method of fs.readdirSync(PROTOCOLS)) {
    const dir = path.join(PROTOCOLS, method);
    if (!fs.statSync(dir).isDirectory()) {
      if (method !== 'README.md') fail(path.relative(ROOT, dir), 'only method directories and README.md belong in protocols/');
      continue;
    }
    const rel = path.relative(ROOT, dir);
    if (!SLUG_RE.test(method)) fail(rel, 'method directory name must match ^[a-z0-9-]+$');
    if (!fs.existsSync(path.join(dir, 'protocol.md'))) fail(rel, 'missing protocol.md');
    let total = 0;
    for (const f of walk(dir)) {
      const r = path.relative(dir, f);
      const size = fs.statSync(f).size;
      total += size;
      const ext = path.extname(f).toLowerCase();
      const allowed = r === 'protocol.md' || r === 'seqspec.yaml'
        || /^variants\/[a-z0-9-]+\.md$/.test(r)
        || (/^figures\//.test(r) && ['.svg', '.png'].includes(ext));
      if (!allowed || !ALLOWED_EXTS.has(ext)) fail(path.relative(ROOT, f), 'unexpected file; see AGENTS.md §3');
      if (size > MAX_FILE_BYTES) fail(path.relative(ROOT, f), `larger than ${MAX_FILE_BYTES} bytes`);
      if (['.md', '.yaml', '.yml', '.svg'].includes(ext)) {
        const text = fs.readFileSync(f, 'utf8');
        if (/\/Users\/|\/home\/[a-z]|C:\\Users\\/.test(text)) {
          fail(path.relative(ROOT, f), 'contains a local file path');
        }
      }
    }
    if (total > MAX_METHOD_BYTES) fail(rel, `method directory exceeds ${MAX_METHOD_BYTES} bytes`);
  }
}

// ---------------------------------------------------------------------------------------

const notice = fs.existsSync(path.join(ROOT, 'NOTICE')) ? fs.readFileSync(path.join(ROOT, 'NOTICE'), 'utf8') : '';
const pages = listPages();
const sequencingMethods = new Set();
const canonicalVersions = new Map();
const variantParents = [];

for (const page of pages) {
  const parsed = parsePage(fs.readFileSync(page.file, 'utf8'));
  if (parsed.error) { fail(page.rel, parsed.error); continue; }
  const facts = checkFrontmatter(page, parsed.fm);
  checkBody(page, parsed.body, facts);
  if (facts.sequencing) sequencingMethods.add(page.method);
  if (facts.adapted && !notice.includes(page.rel)) {
    fail(page.rel, 'adapts third-party text, so it must be listed in NOTICE');
  }
  if (page.kind === 'canonical') canonicalVersions.set(page.method, String(parsed.fm.version ?? ''));
  else if (facts.parentVersion) variantParents.push({ page, version: facts.parentVersion });
}

// A variant names a parent version that has existed: no later than the parent's current one.
for (const { page, version } of variantParents) {
  const current = canonicalVersions.get(page.method);
  if (current && VERSION_RE.test(current) && compareVersions(version, current) > 0) {
    fail(page.rel, `parent ${page.method}@${version} is later than ${page.method}'s current version ${current}`);
  }
}

for (const method of sequencingMethods) {
  const f = path.join(PROTOCOLS, method, 'seqspec.yaml');
  const rel = path.relative(ROOT, f);
  if (!fs.existsSync(f)) { fail(rel, 'required: a page in this method reads out by sequencing'); continue; }
  try { yaml.load(fs.readFileSync(f, 'utf8')); } catch (e) { fail(rel, `not valid YAML: ${e.reason || e.message}`); }
}

checkFiles();

if (errors.length) {
  console.error(`✗ ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`✓ ${pages.length} page${pages.length === 1 ? '' : 's'} valid`);
