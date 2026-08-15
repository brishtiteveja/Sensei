#!/usr/bin/env python3
"""Generate i18n translation files from en.ts using SenseiClaw translate API.

Usage:
    python scripts/generate-translations.py hi zh es id ms ha
    python scripts/generate-translations.py --all
    python scripts/generate-translations.py hi --force  # re-translate even if cached

Reads src/i18n/en.ts, extracts all string values, translates via
POST /curriculum/translate, writes src/i18n/{lang}.ts.

Translations are cached server-side — only new/changed strings hit the LLM.
"""

import json
import os
import re
import sys
import time
import requests

API = os.environ.get("SENSEI_API", "http://167.86.98.204:4050")
I18N_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "i18n")

ALL_LANGS = ["hi", "zh", "es", "id", "ms", "ha"]

LANG_NAMES = {
    "hi": "Hindi",
    "zh": "Chinese (Simplified)",
    "es": "Spanish",
    "id": "Indonesian",
    "ms": "Malay",
    "ha": "Hausa",
    "fr": "French",
    "ar": "Arabic",
    "pt": "Portuguese",
    "ur": "Urdu",
    "ja": "Japanese",
    "ko": "Korean",
    "th": "Thai",
    "vi": "Vietnamese",
    "tr": "Turkish",
    "de": "German",
    "ru": "Russian",
    "sw": "Swahili",
    "ne": "Nepali",
    "si": "Sinhala",
    "my": "Burmese",
    "km": "Khmer",
    "tl": "Filipino",
}


def parse_ts_to_dict(filepath):
    with open(filepath, encoding="utf-8") as f:
        content = f.read()

    match = re.search(r"=\s*(\{[\s\S]*\});?\s*$", content, re.MULTILINE)
    if not match:
        print(f"ERROR: Could not parse {filepath}")
        sys.exit(1)

    js_obj = match.group(1)
    js_obj = re.sub(r"//.*$", "", js_obj, flags=re.MULTILINE)
    js_obj = re.sub(r",\s*([}\]])", r"\1", js_obj)
    js_obj = re.sub(r"(\w+)\s*:", r'"\1":', js_obj)
    js_obj = js_obj.replace("'", '"')

    try:
        return json.loads(js_obj)
    except json.JSONDecodeError as e:
        print(f"ERROR: JSON parse failed: {e}")
        alt_path = filepath.replace(".ts", ".json")
        print(f"Try exporting as JSON first: {alt_path}")
        sys.exit(1)


def flatten_dict(d, prefix=""):
    items = {}
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            items.update(flatten_dict(v, key))
        elif isinstance(v, str):
            items[key] = v
    return items


def unflatten_dict(flat):
    result = {}
    for key, value in flat.items():
        parts = key.split(".")
        d = result
        for part in parts[:-1]:
            d = d.setdefault(part, {})
        d[parts[-1]] = value
    return result


def translate_batch(texts, target_lang, batch_size=10):
    translated = {}
    keys = list(texts.keys())

    for i in range(0, len(keys), batch_size):
        batch_keys = keys[i:i + batch_size]
        combined = "\n---SPLIT---\n".join(texts[k] for k in batch_keys)

        try:
            r = requests.post(
                f"{API}/curriculum/translate",
                json={"text": combined, "target_lang": target_lang, "source_lang": "en"},
                timeout=60,
            )
            if r.status_code != 200:
                print(f"  WARN: API returned {r.status_code} for batch {i//batch_size + 1}")
                for k in batch_keys:
                    translated[k] = texts[k]
                continue

            result = r.json().get("translated", combined)
            parts = result.split("\n---SPLIT---\n")

            for j, k in enumerate(batch_keys):
                if j < len(parts):
                    translated[k] = parts[j].strip()
                else:
                    translated[k] = texts[k]

        except Exception as e:
            print(f"  ERROR: {e}")
            for k in batch_keys:
                translated[k] = texts[k]

        done = min(i + batch_size, len(keys))
        print(f"  [{done}/{len(keys)}] translated")

        if i + batch_size < len(keys):
            time.sleep(0.5)

    return translated


def dict_to_ts(data, lang_code):
    def to_ts_obj(d, indent=2):
        lines = []
        spaces = " " * indent
        for k, v in d.items():
            if isinstance(v, dict):
                lines.append(f"{spaces}{k}: {{")
                lines.append(to_ts_obj(v, indent + 2))
                lines.append(f"{spaces}}},")
            else:
                escaped = v.replace("\\", "\\\\").replace("'", "\\'")
                lines.append(f"{spaces}{k}: '{escaped}',")
        return "\n".join(lines)

    body = to_ts_obj(data)
    return f"""import type {{ TranslationTree }} from '@/i18n/translations';

export const {lang_code}: TranslationTree = {{
{body}
}};
"""


def main():
    args = sys.argv[1:]
    force = "--force" in args
    args = [a for a in args if a != "--force"]

    if not args or "--all" in args:
        langs = ALL_LANGS
    else:
        langs = args

    en_path = os.path.join(I18N_DIR, "en.ts")
    print(f"Parsing {en_path}...")
    en_dict = parse_ts_to_dict(en_path)
    flat_en = flatten_dict(en_dict)
    print(f"Found {len(flat_en)} translation keys\n")

    for lang in langs:
        lang_name = LANG_NAMES.get(lang, lang.upper())
        out_path = os.path.join(I18N_DIR, f"{lang}.ts")
        print(f"=== Generating {lang}.ts ({lang_name}) ===")

        existing_flat = {}
        if os.path.exists(out_path) and not force:
            try:
                existing_dict = parse_ts_to_dict(out_path)
                existing_flat = flatten_dict(existing_dict)
                print(f"  Existing file has {len(existing_flat)} keys")
            except:
                pass

        to_translate = {}
        for k, v in flat_en.items():
            if k not in existing_flat or force:
                to_translate[k] = v

        if not to_translate:
            print(f"  All {len(flat_en)} keys already translated. Skipping.\n")
            continue

        print(f"  Translating {len(to_translate)} new/changed keys to {lang_name}...")
        translated_flat = translate_batch(to_translate, lang, batch_size=8)

        merged = {**existing_flat, **translated_flat}
        for k in flat_en:
            if k not in merged:
                merged[k] = flat_en[k]

        ordered = {k: merged[k] for k in flat_en if k in merged}
        result_dict = unflatten_dict(ordered)

        ts_content = dict_to_ts(result_dict, lang)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(ts_content)

        print(f"  Wrote {out_path} ({len(ordered)} keys)\n")

    translations_path = os.path.join(I18N_DIR, "translations.ts")
    print("Updating translations.ts imports...")

    all_langs_in_dir = []
    for f in sorted(os.listdir(I18N_DIR)):
        if f.endswith(".ts") and f not in ("translations.ts", "i18n-context.tsx"):
            code = f.replace(".ts", "")
            all_langs_in_dir.append(code)

    imports = "\n".join(f"import {{ {c} }} from '@/i18n/{c}';" for c in all_langs_in_dir)
    lang_type = " | ".join(f"'{c}'" for c in all_langs_in_dir)
    entries = "\n  ".join(f"{c}," for c in all_langs_in_dir)

    ts = f"""{imports}

export type Language = {lang_type};

export type TranslationNode = string | {{ [key: string]: TranslationNode }};
export type TranslationTree = {{ [key: string]: TranslationNode }};
export type Translations = Record<string, TranslationTree>;

export const translations: Translations = {{
  {entries}
}};
"""
    with open(translations_path, "w", encoding="utf-8") as f:
        f.write(ts)

    print(f"Updated {translations_path} with {len(all_langs_in_dir)} languages: {', '.join(all_langs_in_dir)}")
    print("\nDone!")


if __name__ == "__main__":
    main()
