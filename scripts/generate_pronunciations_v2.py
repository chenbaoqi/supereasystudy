#!/usr/bin/env python3
"""批量单词发音生成器 v2 — 使用 Microsoft Edge TTS 免费神经网络语音。
异步并发合成，速度远快于 gTTS。
"""

import asyncio, edge_tts, json5, os, re, sys, time

DATA_JS = os.path.join(
    os.path.dirname(__file__), "..", "cloud", "functions", "resetAndImport", "data.js"
)
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "assets", "pronunciations")
os.makedirs(OUTPUT_DIR, exist_ok=True)

VOICE = "en-US-JennyNeural"
CONCURRENCY = 10  # 并发数

def sanitize_filename(word):
    return re.sub(r"[ /\\]", "_", word)

def load_words():
    lines = open(DATA_JS).readlines()
    idx = 0
    for i, line in enumerate(lines):
        if line.startswith("module.exports = "):
            idx = i
            break
    raw = "".join(lines[idx:]).replace("module.exports = ", "", 1).rstrip(";\n")
    data = json5.loads(raw)
    words = set()
    for path in data.get("trees", {}).get("英语", {}).get("learningPaths", []):
        for t in path.get("textbooks", []):
            for s in t.get("semesters", []):
                for c in s.get("chapters", []):
                    for k in c.get("knowledge", []):
                        if k.get("word"):
                            words.add(k["word"])
    return sorted(words)

async def synth_one(sem, word):
    filename = sanitize_filename(word) + ".mp3"
    filepath = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(filepath):
        return f"跳过 {word}"
    for attempt in range(3):
        try:
            communicate = edge_tts.Communicate(text=word, voice=VOICE)
            await communicate.save(filepath)
            return f"{word} → {os.path.getsize(filepath)} bytes"
        except Exception as e:
            if attempt == 2:
                return f"{word} 失败: {e}"
            await asyncio.sleep(1)

async def main():
    words = load_words()
    total = len(words)
    print(f"共 {total} 个单词，使用 {VOICE}，并发 {CONCURRENCY}")

    sem = asyncio.Semaphore(CONCURRENCY)
    async def bounded(word):
        async with sem:
            return await synth_one(sem, word)

    tasks = [bounded(w) for w in words]
    done = 0
    for coro in asyncio.as_completed(tasks):
        result = await coro
        done += 1
        if done % 50 == 0 or "失败" in result:
            print(f"  [{done}/{total}] {result}")

    count = len([f for f in os.listdir(OUTPUT_DIR) if f.endswith(".mp3")])
    print(f"\n完成: {count}/{total} 个 mp3 → {OUTPUT_DIR}")

if __name__ == "__main__":
    asyncio.run(main())
