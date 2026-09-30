#!/usr/bin/env node
/**
 * 校验数学习题 CSV（`scripts/assets/math-concept-quiz-draft.csv`
 * 与 `math-formula-quiz-draft.csv`）。
 *
 * 为什么需要它：题目也是**无引号的简单切分**，而且比讲解更容易写废 ——
 * 一个半角逗号会把题面劈成两半，一个半角引号会原样显示给学生，
 * 更隐蔽的是 **point 定位不到**：合并器对概念点定位失败时**只是静默跳过**
 * （只有公式点才会报 missing），白写的题不会有任何提示。
 *
 * 检查七件事：
 *   1. 字段数 == 表头列数（混进半角逗号会当场暴露）
 *   2. 不允许半角引号 `"` 和 `'`
 *   3. answer 必须是 A/B/C/D
 *   4. 同一题的四个选项不能重复（复制粘贴最容易犯）
 *   5. visual 类型合法、负号必须是半角 `-`（全角 `−` 会被 Number() 转成 NaN）
 *   6. **point + chapter 必须能在 data.js 里唯一定位**（防白写，本脚本的核心）
 *   7. 每个 point 的题数提示（建议 2~3 题），以及答案分布是否全是 A
 *
 * 用法：
 *   node scripts/check_quiz_csv.mjs            # 校验两个默认文件
 *   node scripts/check_quiz_csv.mjs <文件...>   # 校验指定文件
 *
 * 退出码：0 = 全部合格，1 = 有问题（可接进 CI）。
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const DATA_JS = join(HERE, '../cloud/functions/resetAndImport/data.js');

const DEFAULT_CSVS = [
  'math-concept-quiz-draft.csv',
  'math-formula-quiz-draft.csv',
  'math-formula-quiz-g2.csv',
];
const VISUAL_TYPES = ['number-line', 'fraction', 'coordinate-plane'];
const REQUIRED_PROPS = {
  'number-line': ['min', 'max'],
  fraction: ['numerator', 'denominator'],
  'coordinate-plane': [],
};

/** 从 data.js 建「知识点名 → 所在章节列表」索引，供定位校验使用 */
function buildIndex(data) {
  const map = new Map();
  for (const [subject, tree] of Object.entries(data.trees)) {
    for (const learningPath of tree.learningPaths ?? []) {
      for (const textbook of learningPath.textbooks ?? []) {
        for (const semester of textbook.semesters ?? []) {
          for (const chapter of semester.chapters ?? []) {
            for (const knowledge of chapter.knowledge ?? []) {
              if (!map.has(knowledge.word)) map.set(knowledge.word, []);
              map.get(knowledge.word).push({
                chapter: chapter.title,
                semester: semester.name,
                path: learningPath.name,
                subject,
              });
            }
          }
        }
      }
    }
  }
  return map;
}

function checkVisual(raw, label, problems) {
  if (!raw) return;
  const parts = raw
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);
  const [type, ...rest] = parts;
  if (!VISUAL_TYPES.includes(type)) {
    console.error(`  ❌ ${label} 未知可视化类型「${type}」（可选：${VISUAL_TYPES.join(' / ')}）`);
    problems.push(label);
    return;
  }
  const props = {};
  for (const part of rest) {
    const at = part.indexOf('=');
    if (at > 0) props[part.slice(0, at).trim()] = part.slice(at + 1).trim();
  }
  for (const key of REQUIRED_PROPS[type]) {
    if (props[key] === undefined || Number.isNaN(Number(props[key]))) {
      console.error(`  ❌ ${label} ${type} 缺少或非法属性 ${key}`);
      problems.push(label);
    }
  }
  // 全角负号会被 Number() 转成 NaN，画面直接崩
  if (/−/.test(raw)) {
    console.error(`  ❌ ${label} visual 里用了全角负号「−」，必须改半角「-」：${raw}`);
    problems.push(label);
  }
}

function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args : DEFAULT_CSVS.map((f) => join(HERE, 'assets', f));

  const data = require(DATA_JS);
  const index = buildIndex(data);

  let totalRows = 0;
  const problems = [];

  for (const file of targets) {
    const lines = readFileSync(file, 'utf8')
      .replace(/^\uFEFF/, '')
      .split('\n')
      .filter((line) => line.trim());
    const [header, ...rows] = lines;
    const columns = (header ?? '').split(',').map((c) => c.trim());
    console.log(`${file}：表头 ${columns.length} 列，数据 ${rows.length} 行`);

    for (const required of [
      'point',
      'stem',
      'optionA',
      'optionB',
      'optionC',
      'optionD',
      'answer',
    ]) {
      if (!columns.includes(required)) {
        console.error(`  ❌ 缺少列：${required}`);
        problems.push(`${file} 缺列 ${required}`);
      }
    }

    const idx = (name) => columns.indexOf(name);
    const perPoint = new Map();
    const answers = { A: 0, B: 0, C: 0, D: 0 };

    rows.forEach((line, i) => {
      const f = line.split(',');
      const label = `第 ${i + 2} 行「${f[idx('point')] ?? ''}」`;
      if (f.length !== columns.length) {
        console.error(
          `  ❌ ${label} 字段数 ${f.length} ≠ ${columns.length}（多半混进半角逗号）：${line.slice(0, 40)}…`,
        );
        problems.push(label);
      }
      // 只查「会显示给学生」的列：visual 里 A' 这类撇号是合法坐标标签，不算问题
      const displayCols = ['point', 'chapter', 'stem', 'optionA', 'optionB', 'optionC', 'optionD'];
      if (idx('note') >= 0) displayCols.push('note');
      const displayText = displayCols.map((c) => f[idx(c)] ?? '').join('');
      if (/["']/.test(displayText)) {
        console.error(`  ❌ ${label} 含半角引号（会原样显示给学生）：${line.slice(0, 40)}…`);
        problems.push(label);
      }
      const answer = (f[idx('answer')] ?? '').trim().toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(answer)) {
        console.error(`  ❌ ${label} answer 非法：「${answer}」（应为 A/B/C/D）`);
        problems.push(label);
      } else {
        answers[answer] += 1;
      }
      const options = ['optionA', 'optionB', 'optionC', 'optionD'].map((c) =>
        (f[idx(c)] ?? '').trim(),
      );
      if (new Set(options.filter(Boolean)).size !== options.filter(Boolean).length) {
        console.error(`  ❌ ${label} 选项重复：${options.join(' / ')}`);
        problems.push(label);
      }
      checkVisual((f[idx('visual')] ?? '').trim(), label, problems);

      // 核心：point + chapter 必须能唯一定位，否则合并器静默跳过 = 白写
      const point = (f[idx('point')] ?? '').trim();
      const chapter = (f[idx('chapter')] ?? '').trim();
      const hits = (index.get(point) ?? []).filter((h) => !chapter || h.chapter === chapter);
      if (hits.length === 0) {
        console.error(
          `  ❌ ${label} 定位不到知识点（point=${point} chapter=${chapter || '未填'}）→ 这行会被静默跳过`,
        );
        problems.push(label);
      } else if (hits.length > 1) {
        const where = hits.map((h) => h.semester + '/' + h.chapter).join('、');
        if (chapter) {
          console.error(`  ❌ ${label} 命中 ${hits.length} 处（${where}）→ chapter 仍然不够精确`);
          problems.push(label);
        } else {
          // 公式题通常不写 chapter：同一名字在概念路径和公式路径各有一条时，
          // 题目会同时挂到两处（现状如此，属预期行为），只提示不报错
          console.warn(`  ℹ️ ${label} 未填 chapter，同时命中 ${hits.length} 处（${where}）`);
        }
      }

      const key = `${point}@${chapter}`;
      perPoint.set(key, (perPoint.get(key) ?? 0) + 1);
    });

    // 每个知识点题数提示（不是错误，只是提醒别漏点）
    const counts = [...perPoint.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'));
    const thin = counts.filter(([, n]) => n < 2);
    if (thin.length > 0)
      console.warn(
        `  ⚠️ 题数少于 2 的知识点 ${thin.length} 个：${thin.map(([k, n]) => k + '×' + n).join('、')}`,
      );
    const fat = counts.filter(([, n]) => n > 3);
    if (fat.length > 0)
      console.warn(`  ⚠️ 题数超过 3 的知识点：${fat.map(([k, n]) => k + '×' + n).join('、')}`);

    const total = Object.values(answers).reduce((a, b) => a + b, 0);
    console.log(
      `  → 覆盖 ${counts.length} 个知识点，答案分布 A${answers.A} / B${answers.B} / C${answers.C} / D${answers.D}`,
    );
    if (total > 0 && answers.A / total > 0.6) {
      console.warn('  ⚠️ 正确答案高度集中在 A，建议打散（学生一眼看穿选项位置）');
    }
    totalRows += rows.length;
  }

  console.log(
    problems.length === 0
      ? `✅ 合计 ${totalRows} 行，全部合格`
      : `❌ 合计 ${totalRows} 行，${problems.length} 个问题`,
  );
  process.exit(problems.length === 0 ? 0 : 1);
}

main();
