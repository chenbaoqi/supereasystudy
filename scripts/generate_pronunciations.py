#!/usr/bin/env python3
"""批量单词发音生成器（Google TTS，免费专业级女声）。
从 data.js 的 knowledge 树取所有英文单词（含短语），逐词合成 mp3。
输出到 scripts/assets/pronunciations/（每个单词一个文件）。
需先 pip install gtts（已完成）。
"""

import json5, os, re, sys, time

from gtts import gTTS

DATA_JS = os.path.join(
    os.path.dirname(__file__), "..", "cloud", "functions", "resetAndImport", "data.js"
)
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "assets", "pronunciations")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def sanitize_filename(word):
    # 短语里的空格/斜杠变下划线
    return re.sub(r"[ /\\]", "_", word)

def main():
    # 读取 data.js（跳过 // 注释与 module.exports = 包装）
    lines = open(DATA_JS).readlines()
    idx = 0
    for i, line in enumerate(lines):
        if line.startswith("module.exports = "):
            idx = i
            break
    raw = "".join(lines[idx:]).replace("module.exports = ", "", 1).rstrip(";\n")
    data = json5.loads(raw)

    # 收集所有英文单词（去重）
    words = set()
    for path in data.get("trees", {}).get("英语", {}).get("learningPaths", []):
        for textbook in path.get("textbooks", []):
            for semester in textbook.get("semesters", []):
                for chapter in semester.get("chapters", []):
                    for knowledge in chapter.get("knowledge", []):
                        word = knowledge.get("word", "").strip()
                        if word:
                            words.add(word)

    words = sorted(words)
    total = len(words)
    print(f"共 {total} 个单词，开始合成…")

    for i, word in enumerate(words):
        filename = sanitize_filename(word) + ".mp3"
        filepath = os.path.join(OUTPUT_DIR, filename)
        if os.path.exists(filepath):
            print(f"  [{i+1}/{total}] 跳过 {word}")
            continue
        try:
            tts = gTTS(word, lang="en", slow=False)
            tts.save(filepath)
            print(f"  [{i+1}/{total}] {word} → {os.path.getsize(filepath)} bytes")
        except Exception as e:
            print(f"  [{i+1}/{total}] {word} 失败: {e}")
        time.sleep(0.3)  # 避免请求过快被限

    count = len([f for f in os.listdir(OUTPUT_DIR) if f.endswith(".mp3")])
    print(f"\n完成: {count}/{total} 个 mp3 已生成 → {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
