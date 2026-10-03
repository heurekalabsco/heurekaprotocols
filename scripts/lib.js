// Shared rules for validate.js and check-versions.js. AGENTS.md is the prose version of
// everything here; when one changes, change the other.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROTOCOLS = path.join(ROOT, 'protocols');

export const SLUG_RE = /^[a-z0-9-]+$/;
export const VERSION_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const PARENT_RE = /^([a-z0-9-]+)@((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;

export const LICENSES = new Set([
  'CC-BY-4.0', 'CC0-1.0', 'MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0',
]);
export const SOURCE_RELATIONS = new Set(['primary', 'adapted', 'cited', 'variant']);
export const CONTRIBUTOR_ROLES = new Set(['originator', 'author', 'adapter']);
export const SCALES = new Set(['single-sample', 'multiwell', 'pooled']);
export const READOUTS = new Set([
  'sequencing', 'imaging', 'gel', 'plate-reader', 'mass-spec', 'flow', 'pcr', 'other',
]);
export const ACTIONS = new Set([
  'add', 'mix', 'incubate', 'centrifuge', 'wash', 'bind', 'elute', 'amplify', 'purify',
  'inject', 'transform', 'transfect', 'fix', 'permeabilize', 'lyse', 'stain', 'image',
  'measure', 'sequence', 'store', 'pause',
]);

// Required level-2 sections, in order. "Library structure" is required only when the
// readout includes sequencing, and must sit between Principle and Materials.
export const SECTIONS = [
  'Overview', 'Principle', 'Library structure', 'Materials', 'Steps',
  'Critical parameters and limitations', 'Expected results and QC', 'Troubleshooting',
  'Variants and changes', 'References',
];
export const SEQUENCING_ONLY = 'Library structure';

export const ALLOWED_EXTS = new Set(['.md', '.yaml', '.yml', '.svg', '.png']);
export const MAX_FILE_BYTES = 1_000_000;
export const MAX_METHOD_BYTES = 5_000_000;
export const MAX_SUMMARY = 400;

// Split a page into its YAML frontmatter and body. Returns null when there is no
// well-formed `---` block at the very top.
export function splitFrontmatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return null;
  return { raw: m[1], body: m[2] };
}

export function parsePage(text) {
  const parts = splitFrontmatter(text);
  if (!parts) return { error: 'missing or malformed YAML frontmatter (--- … --- at the top)' };
  let fm;
  try {
    fm = yaml.load(parts.raw);
  } catch (e) {
    return { error: `frontmatter is not valid YAML: ${e.reason || e.message}` };
  }
  if (!fm || typeof fm !== 'object' || Array.isArray(fm)) {
    return { error: 'frontmatter must be a YAML mapping' };
  }
  return { fm, body: parts.body };
}

// Every page file under protocols/: each method's protocol.md and variants/*.md.
// Returns [{ method, file, rel, kind: 'canonical' | 'variant', expectedSlug }].
export function listPages() {
  if (!fs.existsSync(PROTOCOLS)) return [];
  const pages = [];
  for (const method of fs.readdirSync(PROTOCOLS).sort()) {
    const dir = path.join(PROTOCOLS, method);
    if (!fs.statSync(dir).isDirectory()) continue;
    const canonical = path.join(dir, 'protocol.md');
    if (fs.existsSync(canonical)) {
      pages.push({ method, file: canonical, rel: path.relative(ROOT, canonical),
                   kind: 'canonical', expectedSlug: method });
    }
    const vdir = path.join(dir, 'variants');
    if (fs.existsSync(vdir)) {
      for (const f of fs.readdirSync(vdir).sort()) {
        if (!f.endsWith('.md')) continue;
        const file = path.join(vdir, f);
        pages.push({ method, file, rel: path.relative(ROOT, file),
                     kind: 'variant', expectedSlug: f.slice(0, -3) });
      }
    }
  }
  return pages;
}

// Every file under a directory, recursively.
export function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
