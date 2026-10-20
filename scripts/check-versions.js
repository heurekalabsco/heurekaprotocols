// Refuse a changed page whose `version` did not move.
//
//   node scripts/check-versions.js [base-ref]     # default: $BASE_REF, then origin/main
//
// `version` is how a reader, an agent or a lab that adapted a page knows it changed
// underneath them. validate.js checks the field is well formed; only the diff can show it
// was bumped. Each page (canonical or variant) carries its own version and is judged on
// its own file. A method's seqspec.yaml and figures belong to its canonical page, so a
// change to them must move protocol.md's version.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, VERSION_RE, compareVersions, splitFrontmatter } from './lib.js';

const base = process.argv[2] || process.env.BASE_REF || 'origin/main';

// stderr is discarded: asking git for a file the branch adds prints a `fatal:` that reads
// like a failure. Absence is an expected answer here.
const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
};

// Tell "not there at the base" apart from "git failed", so a failure never waves a page
// through as new. ls-tree prints nothing for a path absent at ref and exits non-zero only
// when git itself fails.
const existsAt = (ref, file) => {
  try {
    return execFileSync('git', ['ls-tree', '--name-only', ref, '--', file],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() !== '';
  } catch {
    console.error(`git could not read ${file} at ${ref}; refusing to treat it as new.`);
    process.exit(2);
  }
};

const mergeBase = git('merge-base', base, 'HEAD').trim();
if (!mergeBase) {
  console.error(`could not resolve a merge base between "${base}" and HEAD.`);
  console.error('Pass an explicit base (node scripts/check-versions.js <ref>), and make sure the');
  console.error('clone is not shallow (actions/checkout needs fetch-depth: 0).');
  process.exit(2);
}

// The version from the frontmatter only, never from an example further down the page.
const versionOf = (text) => {
  const parts = splitFrontmatter(text);
  if (!parts) return null;
  return (parts.raw.match(/^version:\s*['"]?(\S+?)['"]?\s*$/m) || [])[1] || null;
};

// Map each changed file to the page whose version must move.
const pageFor = (f) => {
  const m = f.match(/^protocols\/([a-z0-9-]+)\/(.+)$/);
  if (!m) return null;
  if (/^variants\/[^/]+\.md$/.test(m[2])) return f;
  return `protocols/${m[1]}/protocol.md`;
};

// Working tree against the merge base, plus untracked files, so a check run before
// committing sees everything it would publish.
const changed = [
  ...git('diff', '--name-only', mergeBase, '--', 'protocols').split('\n'),
  ...git('ls-files', '--others', '--exclude-standard', 'protocols').split('\n'),
].filter(Boolean);

const pages = new Set(changed.map(pageFor).filter(Boolean));
const errors = [];
let checked = 0;

for (const page of [...pages].sort()) {
  const abs = path.join(ROOT, page);
  if (!fs.existsSync(abs)) continue;                       // deleted: nothing to bump
  if (!existsAt(mergeBase, page)) continue;                // new page: any valid version
  const now = versionOf(fs.readFileSync(abs, 'utf8'));
  const was = versionOf(git('show', `${mergeBase}:${page}`));
  checked += 1;
  if (!now || !VERSION_RE.test(now)) { errors.push(`${page}: version "${now}" is not semver`); continue; }
  if (!was || !VERSION_RE.test(was)) continue;             // nothing valid to compare against
  const d = compareVersions(now, was);
  if (d === 0) errors.push(`${page}: content changed but version is still ${now}`);
  else if (d < 0) errors.push(`${page}: version went backwards, ${was} → ${now}`);
}

if (errors.length) {
  console.error(`✗ ${errors.length} page${errors.length === 1 ? '' : 's'} need${errors.length === 1 ? 's' : ''} a version bump:\n`);
  for (const e of errors) console.error(`  ${e}`);
  console.error('\nMinor for a changed step, amount, time or recommendation; patch for wording and links.');
  process.exit(1);
}
console.log(`✓ versions ok (${checked} changed page${checked === 1 ? '' : 's'} compared)`);
