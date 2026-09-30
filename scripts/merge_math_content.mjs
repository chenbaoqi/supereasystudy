#!/usr/bin/env node
/**
 * 数学知识点「讲解 + 例题」合并器。
 *
 * 为什么需要它：`math-concept-*.csv` 只生成了 meaning（平均 11 字）和 example（平均 9 字）
 * 两列短字段，**没有 explanation**。于是学习详情页上，数学知识点看起来「只有标题」——
 * 学生打开「代入消元法」只看到「用一个未知数表示另一个代入」和「由x=5−y代入」。
 * 对比英语语法点每条有约 109 字的 explanation，那个才叫能读的内容。
 *
 * 页面侧不用改：`pages/study-detail` 早就有 `current.explanation` 的展示分支，
 * 缺的只是数据。
 *
 * 用法（在 merge_math_quiz 之后、inject_pronunciation 之前）：
 *   node scripts/convert_textbook.mjs <csv...>
 *   node scripts/merge_math_quiz.mjs
 *   node scripts/merge_math_content.mjs   ← 本脚本
 *   node scripts/inject_pronunciation.js
 *
 * CSV 列：word,chapter,explanation,example
 *   - word 必填；chapter 可选，用于同名知识点消歧（如「平行线性质」在教材知识点与
 *     公式专题里都存在，不写 chapter 会命中两个而报错）。
 *   - explanation 必填；example 可留空（留空表示不改动原有例句）。
 *   - ⚠️ 与其它数学 CSV 同规矩：**字段里禁止出现半角逗号**，停顿一律用全角「，」。
 *     这里是极容易踩的坑 —— 讲解里写「x = 3, y = 2」会把一行切成 5 个字段。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const CSV = join(HERE, 'assets/math-concept-content-draft.csv');
const DATA_JS = join(HERE, '../cloud/functions/resetAndImport/data.js');

// 讲解写得比这个还短，等于没写 —— 学习页要的是「能读的一段话」
const MIN_EXPLANATION = 40;

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function main() {
  const lines = stripBom(readFileSync(CSV, 'utf8'))
    .split('\n')
    .filter((line) => line.trim());
  const [header, ...records] = lines;
  const columns = (header ?? '').split(',').map((c) => c.trim());
  for (const required of ['word', 'explanation']) {
    if (!columns.includes(required)) {
      console.error(`${CSV} 缺少列：${required}`);
      process.exit(1);
    }
  }

  const rows = [];
  for (const line of records) {
    const record = line.split(',').map((f) => f.trim());
    if (record.length !== columns.length) {
      console.warn(
        `⚠️ 行字段数 ${record.length} ≠ ${columns.length}（多半是讲解里混进了半角逗号）：${line.slice(0, 50)}…`,
      );
      continue;
    }
    const row = Object.fromEntries(columns.map((col, index) => [col, record[index] ?? '']));
    if (!row.word || !row.explanation) {
      console.warn(`⚠️ 跳过缺 word 或 explanation 的行：${line.slice(0, 50)}…`);
      continue;
    }
    if (row.explanation.length < MIN_EXPLANATION) {
      console.warn(
        `⚠️ 「${row.word}」的讲解只有 ${row.explanation.length} 字，可能还是提纲不是讲解`,
      );
    }
    rows.push(row);
  }

  const byWord = new Map();
  for (const row of rows) {
    if (!byWord.has(row.word)) byWord.set(row.word, []);
    byWord.get(row.word).push(row);
  }

  const data = require(DATA_JS);

  let filled = 0;
  const usedWords = new Set();
  const notFound = [];
  const ambiguous = [];
  // 数学「知识点」路径里仍然没有讲解的条目 —— 这个数字直接反映学习页有多空
  const stillEmpty = [];

  for (const [treeId, tree] of Object.entries(data.trees)) {
    for (const learningPath of tree.learningPaths) {
      for (const textbook of learningPath.textbooks ?? []) {
        for (const semester of textbook.semesters ?? []) {
          for (const chapter of semester.chapters ?? []) {
            for (const knowledge of chapter.knowledge ?? []) {
              const isMathConcept = treeId === '数学' && learningPath.name === '知识点';
              const candidates = byWord.get(knowledge.word);
              if (candidates) {
                // row.chapter 写了就是「这条讲解只喂给这个章」，没写就是「喂给所有同名点」。
                // 所以「某条 row 与当前章不匹配」是正常跳过，不是定位失败 ——
                // 「平移」在三年级 / 五年级 / 七年级下册都存在，讲解是七年级下册那一版，
                // 另外两处应该安静跳过，而不是把整次合并判失败。
                const matched = candidates.filter(
                  (row) => !row.chapter || row.chapter === chapter.title,
                );
                if (matched.length === 1) {
                  const row = matched[0];
                  knowledge.explanation = row.explanation;
                  if (row.example) knowledge.example = row.example;
                  usedWords.add(knowledge.word);
                  filled += 1;
                } else if (matched.length > 1) {
                  // 两条 row 都指向同一个「章 + 知识点」，真歧义，必须停下来让人改 CSV
                  ambiguous.push(
                    `${semester.name}/${chapter.title}/${knowledge.word}（命中 ${matched.length} 行）`,
                  );
                }
              }
              if (isMathConcept && !knowledge.explanation) {
                stillEmpty.push(`${semester.name} · ${knowledge.word}`);
              }
            }
          }
        }
      }
    }
  }

  for (const row of rows) {
    if (!usedWords.has(row.word)) notFound.push(row.word);
  }

  if (ambiguous.length > 0) {
    console.error(
      `❌ 有讲解但定位不到唯一知识点（补 chapter 列消歧）：\n  - ${ambiguous.join('\n  - ')}`,
    );
    process.exit(1);
  }
  if (notFound.length > 0) {
    console.error(`❌ 这些讲解在数据里找不到对应知识点：${notFound.join('、')}`);
    process.exit(1);
  }

  const banner = '// 教材数据文件（由 scripts/convert_textbook.mjs 自动生成，请勿手改）\n';
  writeFileSync(DATA_JS, `${banner}module.exports = ${JSON.stringify(data, null, 2)};\n`);
  console.log(`✅ 讲解挂载完成：${filled} 个知识点已写入 explanation / example`);
  console.log(
    stillEmpty.length === 0
      ? '✅ 数学知识点已全部有讲解'
      : `📋 数学知识点还有 ${stillEmpty.length} 条没有讲解：${stillEmpty.slice(0, 12).join('、')}` +
          (stillEmpty.length > 12 ? ` …（共 ${stillEmpty.length} 条）` : ''),
  );
}

main();
