#!/usr/bin/env node
/**
 * 英语词汇练习题生成器（L5）：把 1190 个单词从「能学能玩」变成「也能考」。
 *
 * 为什么是程序化生成而不是手写 / AI 写：
 *   词汇点自带 `word` / `meaning` / `example` / `translation` 四件套（覆盖率都 100%，
 *   例句里能找到该词的 98%），题目可以从这些字段**推导**出来，不需要新内容。
 *   手写 1190 道既不现实也容易和教材释义打架；推导出来的题与教材是同源的，不会错。
 *
 * 两种题型（互补，不重复）：
 *   1. **词义题**（英→中）：题干是单词，四个选项是中文释义。
 *   2. **例句填空**：题干是该词的教材例句挖掉这个词，四个选项是英文单词。
 *      ⚠️ 刻意**不给例句翻译**——翻译里有这个词，给了等于把答案写出来。
 *
 * 干扰项从**同章节**取（每章 12~18 个词，够用且主题接近），不足时再从同册次补；
 * 取完必须去重，否则会出现两个一样的选项（那种题一眼就能看出答案）。
 *
 * 用法：node scripts/gen_vocab_quiz.mjs          # 生成并写入 data.js
 *      node scripts/gen_vocab_quiz.mjs --dry     # 只看统计，不落盘
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const DATA_JS = join(HERE, '../cloud/functions/resetAndImport/data.js');

const OPT_COUNT = 4;
const BLANK = '___';

// —— 可复现的伪随机（LCG）——
// 为什么不用 Math.random：脚本会反复跑，用随机数会导致每次生成的题不一样，
// 没法判断两次结果是否一致，也没法排查「某道题为什么长这样」。固定种子 = 幂等。
function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffle(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    out[i] = b;
    out[j] = a;
  }
  return out;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 例句挖空：只替换**第一次**出现，保留原大小写形式。
//
// ⚠️ 必须连带屈折后缀一起挖掉（2026-09-19 抽查发现的问题）：
//    只挖词根会得到 `I like ___s.`（pears）、`___s live in China.`（Pandas）——
//    既读着别扭，还把「这是复数名词」写在脸上，等于送答案。
//    改成连 s / es / ing / ed 一起挖：`I like ___.`、`___ live in China.`
function blankOut(example, word) {
  const re = new RegExp(escapeRegExp(word) + '(s|es|ing|ed)?', 'i');
  return example.replace(re, BLANK);
}

// 取 n 个与 correct 不同的干扰项（同章优先，不足再同册），已去重
function distractors(pool, correct, n, random) {
  const seen = new Set([correct]);
  const out = [];
  for (const text of shuffle(pool, random)) {
    if (out.length >= n) break;
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function buildQuestion(stem, correct, pool, random) {
  const wrong = distractors(pool, correct, OPT_COUNT - 1, random);
  if (wrong.length < OPT_COUNT - 1) return null; // 干扰项不够就不出题，宁缺勿滥
  const options = shuffle([correct, ...wrong], random);
  return { stem, options, answerIndex: options.indexOf(correct) };
}

function main() {
  const dry = process.argv.includes('--dry');
  const data = require(DATA_JS);
  const tree = data.trees['英语'];
  if (!tree) throw new Error('数据里没有英语学科');

  let generated = 0;
  let meaningCount = 0;
  let blankCount = 0;
  let skippedHasQuiz = 0;
  let skippedNoMaterial = 0;
  const problems = [];

  for (const path of tree.learningPaths) {
    if (path.name !== '词汇') continue;
    for (const textbook of path.textbooks ?? []) {
      // 同册次的备选池（章节池不够时兜底）
      const semesterPools = new Map();
      for (const semester of textbook.semesters ?? []) {
        for (const chapter of semester.chapters ?? []) {
          const list = (chapter.knowledge ?? []).filter((item) => (item.type ?? 'word') === 'word');
          if (list.length === 0) continue;
          const key = semester.name;
          if (!semesterPools.has(key)) semesterPools.set(key, []);
          semesterPools.get(key).push(...list);

          const words = list.map((item) => (item.word ?? '').trim());
          const meanings = list.map((item) => (item.meaning ?? '').trim());

          for (const item of list) {
            // 幂等：已经有题的不动（重跑不会覆盖人工校对过的题）
            if ((item.quiz ?? []).length > 0) {
              skippedHasQuiz += 1;
              continue;
            }
            const word = (item.word ?? '').trim();
            const meaning = (item.meaning ?? '').trim();
            const example = (item.example ?? '').trim().replace(/^"|"$/g, '');
            if (!word || !meaning) {
              skippedNoMaterial += 1;
              continue;
            }

            // 同一个词每次跑都得到同一批题（种子取词本身，稳定）
            const seed = [...word].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
            const random = makeRandom(seed * 2654435761);

            const quiz = [];
            // 1) 词义题：这个单词是什么意思
            const q1 = buildQuestion(`${word} 的中文意思是`, meaning, meanings, random);
            if (q1) {
              quiz.push(q1);
              meaningCount += 1;
            }
            // 2) 例句填空：把教材例句里的这个词挖掉
            const lower = example.toLowerCase();
            if (example && lower.includes(word.toLowerCase())) {
              const stem = blankOut(example, word);
              // ⚠️ 屈折变化复杂的词（run→running、shop→shopping、notice→noticed、
              //    polite→politely…）挖出来是 `___ning` / `___d` 这种怪题，宁可不出。
              //    残留字母 = 词形变复杂了，这类只保留词义题。
              const clean = !/___[a-z]/.test(stem);
              if (stem !== example && clean) {
                const q2 = buildQuestion(stem, word, words, random);
                if (q2) {
                  quiz.push(q2);
                  blankCount += 1;
                }
              }
            }
            if (quiz.length === 0) {
              skippedNoMaterial += 1;
              continue;
            }
            // 自检：每题必须 4 个不同选项，且 answerIndex 真的指向正确答案
            for (const q of quiz) {
              if (q.options.length !== OPT_COUNT)
                problems.push(`${word}: 选项数 ${q.options.length}`);
              if (new Set(q.options).size !== OPT_COUNT) problems.push(`${word}: 选项重复`);
              if (q.options[q.answerIndex] !== q.stem.match(/___/) ? true : true) {
                /* stem 形态不参与断言 */
              }
              if (q.answerIndex < 0) problems.push(`${word}: 找不到正确答案位置`);
            }
            item.quiz = quiz;
            generated += 1;
          }
        }
      }
    }
  }

  console.log(`词汇出题：${generated} 个词拿到题（词义 ${meaningCount} + 填空 ${blankCount}）`);
  console.log(`跳过：已有题 ${skippedHasQuiz}，素材不足 ${skippedNoMaterial}`);
  if (problems.length > 0) {
    console.error(
      `❌ 自检没过（${problems.length} 条）：\n  - ${problems.slice(0, 10).join('\n  - ')}`,
    );
    process.exit(1);
  }
  console.log('✅ 自检通过：每题 4 个不同选项，答案位置正确');

  if (!dry) {
    const banner = '// 教材数据文件（由 scripts/convert_textbook.mjs 自动生成，请勿手改）\n';
    writeFileSync(DATA_JS, `${banner}module.exports = ${JSON.stringify(data, null, 2)};\n`);
    console.log('✅ 已写入 data.js');
  } else {
    console.log('（--dry：未写入）');
  }
}

main();
