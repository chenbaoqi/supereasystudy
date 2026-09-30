#!/usr/bin/env node
/**
 * 给英语题挂示意图（2026-09-21）：时态轴 / 介词方位 / 词族图谱。
 *
 * 为什么是这三类而不是「单词配图」：
 *   给 1190 个单词配 AI 图既贵（几百张生成 + 人工审），又容易让孩子记图不记词，
 *   而且抽象词（because / very / think）根本没图可配。真正卡住中小学英语的是
 *   **时态混淆**和**介词方位**——这两样用一张画布就能讲清，也不用担心 AI 的风格漂移。
 *
 * 挂法：
 *   - 时态：语法点名含「过去/现在/将来」+「进行/完成」→ tense
 *   - 介词：词汇点的 word 是方位介词（in/on/under/…）→ preposition
 *   - 词族：自动找「共享前缀 ≥4 字母」的一簇词 → word-family（挂到那簇的短词上）
 *
 * 用法：node scripts/attach_english_visual.mjs        # 写入 data.js
 *      node scripts/attach_english_visual.mjs --dry   # 只看统计
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const DATA_JS = join(HERE, '../cloud/functions/resetAndImport/data.js');

// 方位介词（与 utils/englishDiagram.ts 的 BALL_AT 对齐）
const PREPOSITIONS = [
  'in',
  'on',
  'under',
  'behind',
  'near',
  'beside',
  'between',
  'above',
  'next to',
];

/**
 * 词族判定：必须是**真正的词缀派生**，即「词根 + 一个常见后缀」。
 *
 * ⚠️ 一开始我用「共享前 4 个字母」聚类，结果挖出 219 组——里面大量是巧合
 *    （water / watch、book / boot 共享前缀但毫无关系）。把这种假词族画成图谱，
 *    等于教孩子错误的构词法，比不画更糟。所以改成严格匹配后缀。
 */
const SUFFIXES = [
  'fully',
  'lessly',
  'fulness',
  'lessness',
  'ment',
  'tion',
  'ship',
  'ness',
  'ful',
  'less',
  'able',
  'ive',
  'ing',
  'est',
  'er',
  'ed',
  'ly',
  'y',
];

// 词根至少这么长。太短会撞巧合：car + ing = caring，但 caring 来自 care 不是 car
// （2026-09-21 抽查抓到过这种假词族）。
const MIN_ROOT = 4;

function isDerivedFrom(word, root) {
  if (word === root) return false;
  if (root.length < MIN_ROOT) return false;
  if (!word.startsWith(root)) return false;
  return SUFFIXES.includes(word.slice(root.length));
}

function isTensePoint(word) {
  return /时$/.test(word) || /时态$/.test(word) || /时$/.test(word);
}

function main() {
  const dry = process.argv.includes('--dry');
  const data = require(DATA_JS);
  let tense = 0;
  let prep = 0;
  let family = 0;
  let skipped = 0;

  const tree = data.trees['英语'];
  if (!tree) throw new Error('数据里没有英语学科');

  // 先收集全部词汇点，用于词族挖掘
  const vocab = [];
  for (const path of tree.learningPaths ?? []) {
    for (const textbook of path.textbooks ?? []) {
      for (const semester of textbook.semesters ?? []) {
        for (const chapter of semester.chapters ?? []) {
          for (const item of chapter.knowledge ?? []) {
            const word = (item.word ?? '').trim().toLowerCase();
            if (word && /^[a-z][a-z\-' ]*$/.test(word)) vocab.push({ word, item });
          }
        }
      }
    }
  }

  // ---------- 词族：词根 + 常见后缀（严格派生，不要巧合前缀） ----------
  const byWord = new Map(vocab.map((v) => [v.word, v]));
  for (const { word, item } of vocab) {
    if (word.length < 3) continue;
    // 找出所有「由这个词 + 后缀」构成的派生词
    // 同一个词可能在多个册次出现，必须去重（不然会画出「friendly, friendly, friendly」）
    const derived = [
      ...new Set(vocab.filter((v) => isDerivedFrom(v.word, word)).map((v) => v.word)),
    ];
    if (derived.length === 0) continue;
    // 派生词自己也该在库里（否则图画出来孩子点不到）
    const known = derived.filter((w) => byWord.has(w));
    if (known.length === 0) continue;
    if (!item.quiz || item.quiz.length === 0) continue;
    if (item.quiz[0].visual) {
      skipped += 1;
      continue;
    }
    item.quiz[0].visual = {
      type: 'word-family',
      props: { root: word, members: known.slice(0, 5) },
    };
    family += 1;
  }

  // ---------- 时态 / 介词 ----------
  for (const path of tree.learningPaths ?? []) {
    for (const textbook of path.textbooks ?? []) {
      for (const semester of textbook.semesters ?? []) {
        for (const chapter of semester.chapters ?? []) {
          for (const item of chapter.knowledge ?? []) {
            const word = (item.word ?? '').trim();
            const lower = word.toLowerCase();
            if (!item.quiz || item.quiz.length === 0) continue;
            const first = item.quiz[0];
            if (first.visual) {
              skipped += 1;
              continue;
            }

            // 时态：语法点名形如「一般过去时 / 现在进行时 / 现在完成时」
            if (isTensePoint(word) && /过去|现在|将来|未来/.test(word)) {
              first.visual = { type: 'tense', props: { tense: word } };
              tense += 1;
              continue;
            }

            // 介词方位
            if (PREPOSITIONS.includes(lower)) {
              first.visual = { type: 'preposition', props: { position: lower } };
              prep += 1;
              continue;
            }
          }
        }
      }
    }
  }

  console.log(
    `英语示意图挂载：时态 ${tense} / 介词 ${prep} / 词族 ${family}，已有图跳过 ${skipped}`,
  );
  if (tense + prep + family === 0) {
    console.error('❌ 一道都没挂上，检查筛选条件');
    process.exit(1);
  }

  if (!dry) {
    const banner = '// 教材数据文件（由 scripts/convert_textbook.mjs 自动生成，请勿手改）\n';
    writeFileSync(DATA_JS, `${banner}module.exports = ${JSON.stringify(data, null, 2)};\n`);
    console.log('✅ 已写入 data.js');
  } else {
    console.log('（--dry：未写入）');
  }
}

main();
