#!/usr/bin/env node
/**
 * 语法练习题合并器：把 grammar-quiz-draft.csv 的题目按语法点名称挂载到
 * cloud/functions/resetAndImport/data.js 中对应 Knowledge 的 quiz 字段。
 * 用法：node scripts/convert_textbook.mjs <词汇与语法csv...> 之后执行
 *        node scripts/merge_grammar_quiz.mjs
 * 数据性质：AI 骨架待校对（见 CSV 头部与 README）。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ANSWER_INDEX = { A: 0, B: 1, C: 2, D: 3 };
const QUIZ_CSV = join(dirname(fileURLToPath(import.meta.url)), 'assets/grammar-quiz-draft.csv');
const DATA_JS = join(
  dirname(fileURLToPath(import.meta.url)),
  '../cloud/functions/resetAndImport/data.js',
);

function parseCsvLine(line) {
  // 本 CSV 无引号字段（题目文本不含逗号，已约束），按逗号简单切分
  return line.split(',').map((field) => field.trim());
}

function main() {
  const lines = readFileSync(QUIZ_CSV, 'utf8')
    .split('\n')
    .filter((line) => line.trim());
  const [header, ...records] = lines;
  const columns = parseCsvLine(header);
  for (const required of ['point', 'stem', 'optionA', 'optionB', 'optionC', 'optionD', 'answer']) {
    if (!columns.includes(required)) {
      console.error(`grammar-quiz CSV 缺少列：${required}`);
      process.exit(1);
    }
  }

  // 按语法点聚合题目（record 必须先按逗号切分为字段，不能直接按字符下标取）
  const quizByPoint = new Map();
  for (const line of records) {
    const record = parseCsvLine(line);
    if (record.length !== columns.length) {
      console.warn(`⚠️ 题目行字段数 ${record.length} ≠ ${columns.length}：${line.slice(0, 40)}…`);
      continue;
    }
    const row = Object.fromEntries(columns.map((col, index) => [col, record[index] ?? '']));
    const item = {
      stem: row.stem,
      options: [row.optionA, row.optionB, row.optionC, row.optionD],
      answerIndex: ANSWER_INDEX[row.answer?.toUpperCase()] ?? 0,
    };
    if (!quizByPoint.has(row.point)) quizByPoint.set(row.point, []);
    quizByPoint.get(row.point).push(item);
  }

  // data.js 头部带「自动生成勿手改」注释行：从 module.exports 处开始截取再解析
  const raw = readFileSync(DATA_JS, 'utf8');
  const data = JSON.parse(
    raw
      .slice(raw.indexOf('module.exports = '))
      .replace('module.exports = ', '')
      .replace(/;\s*$/, ''),
  );

  let attached = 0;
  const missing = [];
  for (const path of Object.values(data.trees)) {
    for (const learningPath of path.learningPaths) {
      for (const textbook of learningPath.textbooks ?? []) {
        for (const semester of textbook.semesters ?? []) {
          for (const chapter of semester.chapters ?? []) {
            for (const knowledge of chapter.knowledge ?? []) {
              if (knowledge.type !== 'grammar') continue;
              const quiz = quizByPoint.get(knowledge.word);
              if (quiz) {
                knowledge.quiz = quiz;
                attached += 1;
              } else {
                missing.push(knowledge.word);
              }
            }
          }
        }
      }
    }
  }

  const banner = '// 教材数据文件（由 scripts/convert_textbook.mjs 自动生成，请勿手改）\n';
  writeFileSync(DATA_JS, `${banner}module.exports = ${JSON.stringify(data, null, 2)};\n`);
  console.log(
    `✅ 题目挂载完成：${attached} 个语法点已挂 quiz（共 ${[...quizByPoint.values()].flat().length} 题）` +
      (missing.length ? `；${missing.length} 个语法点缺题：${missing.join('、')}` : ''),
  );
}

main();
