/**
 * Generate `src/i18n/locales/<code>.json` from the English source of truth.
 *
 * Build-time only. The app never translates at runtime -- it ships the finished
 * JSON, which is what lets it claim it contacts no third party.
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/gen-locales.mjs            # missing keys only
 *   GEMINI_API_KEY=... node scripts/gen-locales.mjs bn hi      # just these locales
 *   GEMINI_API_KEY=... node scripts/gen-locales.mjs --force bn # retranslate everything
 *
 * Env:
 *   GEMINI_API_KEY  key for the default cloud provider (required unless LLM_BASE is set)
 *   LLM_BASE        OpenAI-compatible base URL
 *   LLM_MODEL       model id      (default: gemini-3.5-flash)
 *   LLM_API_KEY     bearer token  (default: GEMINI_API_KEY)
 *
 * Translation runs in the cloud rather than on the Spark on purpose: the box
 * keeps ONE model resident, and pulling it away for a batch job would evict
 * whatever the live tutor is serving. Runtime still contacts nobody -- this
 * script's output is committed JSON.
 *
 * Gemini 3.x spends tokens on reasoning before it answers, which returns an
 * empty `content` with `finish_reason: "length"` on short budgets. Hence
 * `reasoning_effort: "none"` -- this is mechanical translation, not a task
 * that benefits from deliberation.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOCALE_DIR = join(HERE, '..', 'src', 'i18n', 'locales');

const TARGETS = {
  bn: 'Bangla (Bengali), as spoken in Bangladesh',
  hi: 'Hindi, as spoken in India',
  zh: 'Simplified Chinese, as written in mainland China',
  es: 'Spanish, neutral Latin American',
  id: 'Indonesian (Bahasa Indonesia)',
  ms: 'Malay (Bahasa Melayu)',
  ha: 'Hausa, as spoken in Nigeria',
};

const BASE = process.env.LLM_BASE ?? 'https://generativelanguage.googleapis.com/v1beta/openai';
const MODEL = process.env.LLM_MODEL ?? 'gemini-3.5-flash';
const KEY = process.env.LLM_API_KEY ?? process.env.GEMINI_API_KEY;
/** Small enough that a model does not start dropping keys near the end. */
const CHUNK = 20;

const argv = process.argv.slice(2);
const force = argv.includes('--force');
const only = argv.filter((a) => !a.startsWith('--'));
const codes = only.length ? only : Object.keys(TARGETS);

if (!KEY) {
  console.error('Set GEMINI_API_KEY (or LLM_API_KEY with LLM_BASE) before running.');
  process.exit(1);
}

const en = JSON.parse(readFileSync(join(LOCALE_DIR, 'en.json'), 'utf8'));

/** `"Step {n}"` -> `["n"]`. A translation must carry exactly the same set. */
const placeholders = (s) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(',');

const SYSTEM = `You translate UI strings for Sensei, a Socratic tutoring app for students.

Rules:
- Return ONLY a JSON object mapping each input key to its translated string. No prose, no markdown fence.
- Translate every key you are given. Never drop, add or rename a key.
- Preserve placeholders like {n}, {url}, {a}, {b}, {opt}, {model} EXACTLY as written. Do not translate or reorder them away.
- "Sensei" is the product name. Leave it untranslated.
- These are buttons, labels and short help text in a dense UI. Match the English brevity; do not expand a two-word button into a sentence.
- Keep the register plain and encouraging, appropriate for a secondary-school student.
- Use Western Arabic numerals (0-9), not locale-specific digit forms.
- Preserve terminal punctuation and the presence or absence of a final period.`;

async function complete(messages) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 8000,
      reasoning_effort: 'none',
    }),
    signal: AbortSignal.timeout(900_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error(`empty completion (finish=${body.choices?.[0]?.finish_reason})`);
  return text;
}

/** Tolerate a stray ```json fence or leading chatter around the object. */
function parseObject(text) {
  const cleaned = text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`no JSON object in: ${text.slice(0, 200)}`);
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function translateChunk(entries, langName) {
  const payload = Object.fromEntries(entries);
  const ask = [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Translate these UI strings into ${langName}.\n\n${JSON.stringify(payload, null, 2)}`,
    },
  ];

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const got = parseObject(await complete(ask));
      const out = {};
      const bad = [];
      for (const [k, source] of entries) {
        const v = got[k];
        if (typeof v !== 'string' || !v.trim()) {
          bad.push(`${k}: missing`);
        } else if (placeholders(v) !== placeholders(source)) {
          bad.push(`${k}: placeholders ${placeholders(v) || '(none)'} != ${placeholders(source)}`);
        } else {
          out[k] = v.trim();
        }
      }
      // Keep what validated and re-ask only for the rest, so one bad key does
      // not force a whole chunk through the model again.
      if (!bad.length) return out;
      console.warn(`      retry ${attempt}: ${bad.length} rejected (${bad[0]})`);
      const remaining = entries.filter(([k]) => !(k in out));
      if (attempt === 3) {
        for (const [k] of remaining) console.warn(`      giving up on ${k}, English will show`);
        return out;
      }
      const partial = await translateChunk(remaining, langName);
      return { ...out, ...partial };
    } catch (err) {
      console.warn(`      attempt ${attempt} failed: ${err.message}`);
      if (attempt === 3) return {};
    }
  }
  return {};
}

if (!existsSync(LOCALE_DIR)) mkdirSync(LOCALE_DIR, { recursive: true });

for (const code of codes) {
  const langName = TARGETS[code];
  if (!langName) {
    console.error(`unknown locale "${code}" -- known: ${Object.keys(TARGETS).join(', ')}`);
    continue;
  }

  const path = join(LOCALE_DIR, `${code}.json`);
  const existing = !force && existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const todo = Object.entries(en).filter(([k]) => !existing[k]);

  console.log(`\n${code} (${langName}) -- ${todo.length} of ${Object.keys(en).length} to translate`);
  if (!todo.length) {
    console.log('   up to date');
    continue;
  }

  const translated = { ...existing };
  for (let i = 0; i < todo.length; i += CHUNK) {
    const slice = todo.slice(i, i + CHUNK);
    process.stdout.write(`   ${i + 1}-${i + slice.length} … `);
    Object.assign(translated, await translateChunk(slice, langName));
    console.log('ok');
  }

  // Write in en.json key order so the files diff cleanly against each other.
  const ordered = {};
  for (const k of Object.keys(en)) if (translated[k]) ordered[k] = translated[k];
  writeFileSync(path, `${JSON.stringify(ordered, null, 2)}\n`);

  const missing = Object.keys(en).length - Object.keys(ordered).length;
  console.log(`   wrote ${path}${missing ? ` (${missing} keys fell back to English)` : ''}`);
}
