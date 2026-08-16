/**
 * Stage the curated sample kit into public/ before a build.
 *
 * The images live in the repo at /samples (committed). Rather than duplicate
 * 11 MB into git under web/public, this copies the manifest and the three
 * subject folders into public/samples at build time, where Vite serves them at
 * /sensei/samples/…. public/samples is gitignored — this script is the source
 * of that copy, so a fresh clone + build reproduces it.
 *
 * Regenerate the manifest itself with: python3 scripts/build_samples_manifest.py
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const src = join(repo, 'samples');
const dest = join(here, '..', 'public', 'samples');

if (!existsSync(join(src, 'manifest.json'))) {
  console.warn('[copy-samples] no samples/manifest.json — run build_samples_manifest.py; skipping');
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(join(src, 'manifest.json'), join(dest, 'manifest.json'));
for (const subject of ['physics', 'chemistry', 'math']) {
  const from = join(src, subject);
  if (existsSync(from)) cpSync(from, join(dest, subject), { recursive: true });
}
console.log('[copy-samples] staged samples into public/samples');

// The NoTeS-Bank benchmark subset, same deal: committed once under datasets/,
// staged into public/ at build time rather than duplicated into git.
// Fetch it with: python3 scripts/fetch_notesbank.py
const nbSrc = join(repo, 'datasets', 'notesbank');
const nbDest = join(here, '..', 'public', 'notesbank');
rmSync(nbDest, { recursive: true, force: true });
if (existsSync(join(nbSrc, 'manifest.json'))) {
  cpSync(nbSrc, nbDest, { recursive: true });
  console.log('[copy-samples] staged notesbank into public/notesbank');
} else {
  console.warn('[copy-samples] no datasets/notesbank — benchmark tab will show a hint');
}
