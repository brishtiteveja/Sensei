#!/usr/bin/env python3
"""Multilingual Socratic-tutoring probe against the DGX router.

  python3 _tutor_test.py --out ../lang_runs/tutor.jsonl
  python3 _tutor_test.py --only hindi,spanish

One JSON object per (lang, turn) appended to the JSONL. Resumable.
"""
import argparse, json, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ.get("DGX_BASE", "https://spark-e257.tail803c7f.ts.net:8443/v1")
KEY = os.environ.get("DGX_API_KEY", "")
MODEL = "qwen3-vl-30b-a3b-gguf"

SYSTEM = """You are Sensei, a patient one-on-one tutor.
Lead the student to the answer with one focused question at a time.
When they are stuck, narrow the question rather than supplying the answer.
Reply ONLY in {language}. Keep replies to two or three sentences, ending in a question."""

# Physics thread: ball thrown straight up at 20 m/s, g=9.8 -> h = v^2/2g = 20.4 m
# Turn 2 = student is stuck (tests "narrow, don't supply")
# Turn 3 = student asserts a WRONG number (tests math correctness + willingness to correct)
# Turn 4 = separate algebra item, single shot (tests correctness cleanly)
LANGS = {
    "english": {
        "language": "English",
        "turns": [
            "A ball is thrown straight up at 20 m/s. How high does it go? I don't get it.",
            "I don't know, I'm stuck. Which formula am I supposed to use?",
            "Okay so I think the answer is 40 metres.",
            "Oh — the speed becomes zero at the very top.",
            "So I used v^2 = u^2 - 2gh and got 0 = 400 - 19.6h.",
            "So h = 20.4 metres?",
        ],
        "algebra": "Solve 3x + 7 = 22 for me. I got x = 9, is that right?",
        "speed": "Explain, in about eight sentences, why a ball thrown straight upward slows down, stops, and falls back.",
    },
    "bengali": {
        "language": "Bengali (Bangla)",
        "turns": [
            "একটি বল সোজা উপরের দিকে ২০ m/s বেগে ছোঁড়া হলো। এটি কত উঁচুতে উঠবে? আমি বুঝতে পারছি না।",
            "আমি জানি না, আটকে গেছি। কোন সূত্র ব্যবহার করব?",
            "ঠিক আছে, আমার মনে হয় উত্তর ৪০ মিটার।",
            "ও আচ্ছা — সবচেয়ে উপরে বেগ শূন্য হয়ে যায়।",
            "তাহলে আমি v^2 = u^2 - 2gh ব্যবহার করলাম, পেলাম 0 = 400 - 19.6h।",
            "তাহলে h = 20.4 মিটার?",
        ],
        "algebra": "3x + 7 = 22 সমাধান করো। আমি পেয়েছি x = 9, এটা কি ঠিক?",
        "speed": "প্রায় আট বাক্যে ব্যাখ্যা করো, কেন উপরের দিকে ছোঁড়া একটি বল ধীর হয়ে যায়, থেমে যায় এবং আবার নিচে পড়ে।",
    },
    "hindi": {
        "language": "Hindi",
        "turns": [
            "एक गेंद को सीधे ऊपर 20 m/s की गति से फेंका गया। यह कितनी ऊँचाई तक जाएगी? मुझे समझ नहीं आ रहा।",
            "मुझे नहीं पता, मैं अटक गया हूँ। मुझे कौन सा सूत्र इस्तेमाल करना चाहिए?",
            "ठीक है, मुझे लगता है उत्तर 40 मीटर है।",
            "अच्छा — सबसे ऊपर गति शून्य हो जाती है।",
            "तो मैंने v^2 = u^2 - 2gh लगाया, मिला 0 = 400 - 19.6h।",
            "तो h = 20.4 मीटर?",
        ],
        "algebra": "3x + 7 = 22 हल कीजिए। मुझे x = 9 मिला, क्या यह सही है?",
        "speed": "लगभग आठ वाक्यों में समझाइए कि ऊपर की ओर फेंकी गई गेंद धीमी क्यों होती है, रुकती क्यों है और वापस क्यों गिरती है।",
    },
    "indonesian": {
        "language": "Indonesian (Bahasa Indonesia)",
        "turns": [
            "Sebuah bola dilempar lurus ke atas dengan kecepatan 20 m/s. Berapa tinggi maksimumnya? Saya tidak mengerti.",
            "Saya tidak tahu, saya buntu. Rumus mana yang harus saya pakai?",
            "Oke, saya rasa jawabannya 40 meter.",
            "Oh — kecepatannya menjadi nol di titik tertinggi.",
            "Jadi saya pakai v^2 = u^2 - 2gh, hasilnya 0 = 400 - 19,6h.",
            "Jadi h = 20,4 meter?",
        ],
        "algebra": "Selesaikan 3x + 7 = 22. Saya dapat x = 9, apakah itu benar?",
        "speed": "Jelaskan dalam sekitar delapan kalimat mengapa bola yang dilempar lurus ke atas melambat, berhenti, lalu jatuh kembali.",
    },
    "swahili": {
        "language": "Swahili (Kiswahili)",
        "turns": [
            "Mpira umerushwa juu moja kwa moja kwa kasi ya 20 m/s. Utafika kimo gani cha juu zaidi? Sielewi.",
            "Sijui, nimekwama. Nitumie fomula gani?",
            "Sawa, nadhani jibu ni mita 40.",
            "Aha — kasi inakuwa sifuri kwenye kilele.",
            "Basi nimetumia v^2 = u^2 - 2gh, nimepata 0 = 400 - 19.6h.",
            "Kwa hiyo h = mita 20.4?",
        ],
        "algebra": "Tatua 3x + 7 = 22. Nimepata x = 9, je ni sahihi?",
        "speed": "Eleza kwa sentensi takriban nane kwa nini mpira uliorushwa juu hupunguza kasi, husimama, kisha huanguka chini.",
    },
    "spanish": {
        "language": "Spanish",
        "turns": [
            "Se lanza una pelota verticalmente hacia arriba a 20 m/s. ¿Qué altura máxima alcanza? No lo entiendo.",
            "No sé, estoy atascado. ¿Qué fórmula debo usar?",
            "Vale, creo que la respuesta es 40 metros.",
            "Ah — la velocidad se hace cero en el punto más alto.",
            "Entonces usé v^2 = u^2 - 2gh y me da 0 = 400 - 19,6h.",
            "¿Entonces h = 20,4 metros?",
        ],
        "algebra": "Resuelve 3x + 7 = 22. Me dio x = 9, ¿está bien?",
        "speed": "Explica, en unas ocho frases, por qué una pelota lanzada hacia arriba se frena, se detiene y vuelve a caer.",
    },
    "arabic": {
        "language": "Arabic",
        "turns": [
            "تُقذف كرة رأسياً إلى أعلى بسرعة 20 م/ث. ما أقصى ارتفاع تصل إليه؟ لا أفهم.",
            "لا أعرف، أنا عالق. أي قانون يجب أن أستخدم؟",
            "حسناً، أعتقد أن الجواب 40 متراً.",
            "آه — تصبح السرعة صفراً عند أعلى نقطة.",
            "إذن استخدمت v^2 = u^2 - 2gh فحصلت على 0 = 400 - 19.6h.",
            "إذن h = 20.4 متر؟",
        ],
        "algebra": "حل المعادلة 3x + 7 = 22. حصلت على x = 9، هل هذا صحيح؟",
        "speed": "اشرح في حوالي ثماني جمل لماذا تتباطأ الكرة المقذوفة إلى أعلى ثم تتوقف ثم تسقط مرة أخرى.",
    },
}


def call(messages, max_tokens=400):
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0,
        "max_tokens": max_tokens,
    }
    p = os.path.join(HERE, "_payload.json")
    with open(p, "w") as f:
        json.dump(payload, f, ensure_ascii=False)
    t0 = time.time()
    r = subprocess.run(
        ["curl", "-sS", "--max-time", "900", f"{BASE}/chat/completions",
         "-H", "Content-Type: application/json",
         "-H", f"Authorization: Bearer {KEY}",
         "--data-binary", f"@{p}"],
        capture_output=True, text=True)
    dt = time.time() - t0
    try:
        j = json.loads(r.stdout)
    except Exception:
        return {"error": r.stdout[:2000] + r.stderr[:500], "elapsed": dt}
    if "choices" not in j:
        return {"error": json.dumps(j)[:2000], "elapsed": dt}
    txt = j["choices"][0]["message"]["content"]
    u = j.get("usage", {})
    ct = u.get("completion_tokens", 0)
    return {
        "text": txt,
        "elapsed": round(dt, 2),
        "prompt_tokens": u.get("prompt_tokens"),
        "completion_tokens": ct,
        "tok_s": round(ct / dt, 1) if dt > 0 else None,
        "chars": len(txt),
        "chars_per_tok": round(len(txt) / ct, 2) if ct else None,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(HERE, "..", "lang_runs", "tutor.jsonl"))
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    out = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    done = set()
    if os.path.exists(out):
        for line in open(out):
            try:
                d = json.loads(line)
                done.add((d["lang"], d["turn"]))
            except Exception:
                pass
    want = [x for x in a.only.split(",") if x] or list(LANGS)
    fh = open(out, "a")
    for lang in want:
        cfg = LANGS[lang]
        sysmsg = SYSTEM.format(language=cfg["language"])
        msgs = [{"role": "system", "content": sysmsg}]
        for i, student in enumerate(cfg["turns"], 1):
            msgs.append({"role": "user", "content": student})
            if (lang, i) in done:
                # replay stored assistant reply to keep the thread coherent
                for line in open(out):
                    d = json.loads(line)
                    if d["lang"] == lang and d["turn"] == i:
                        msgs.append({"role": "assistant", "content": d.get("text", "")})
                        break
                continue
            res = call(msgs)
            rec = {"lang": lang, "turn": i, "student": student, **res}
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fh.flush()
            print(f"[{lang} t{i}] {res.get('elapsed')}s {res.get('tok_s')} tok/s")
            print("   ", (res.get("text") or res.get("error", ""))[:300].replace("\n", " "))
            msgs.append({"role": "assistant", "content": res.get("text", "")})
        # standalone algebra item
        if (lang, "algebra") not in done:
            res = call([{"role": "system", "content": sysmsg},
                        {"role": "user", "content": cfg["algebra"]}])
            rec = {"lang": lang, "turn": "algebra", "student": cfg["algebra"], **res}
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fh.flush()
            print(f"[{lang} algebra] {res.get('elapsed')}s {res.get('tok_s')} tok/s")
            print("   ", (res.get("text") or res.get("error", ""))[:300].replace("\n", " "))
        # long-output speed item: clean decode-rate measurement
        if (lang, "speed") not in done:
            res = call([{"role": "system", "content":
                         f"You are a physics teacher. Reply ONLY in {cfg['language']}."},
                        {"role": "user", "content": cfg["speed"]}], max_tokens=700)
            rec = {"lang": lang, "turn": "speed", "student": cfg["speed"], **res}
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fh.flush()
            cps = round(res["chars"] / res["elapsed"], 1) if res.get("chars") else None
            print(f"[{lang} SPEED] {res.get('elapsed')}s {res.get('completion_tokens')}tok "
                  f"{res.get('tok_s')} tok/s  {cps} chars/s  cpt={res.get('chars_per_tok')}")
    fh.close()


if __name__ == "__main__":
    main()
