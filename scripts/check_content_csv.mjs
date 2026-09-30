#!/usr/bin/env node
/**
 * 校验数学知识点内容 CSV（`scripts/assets/math-concept-content-draft.csv`）。
 *
 * 为什么需要它：这些 CSV 是**无引号的简单切分**（`line.split(',')`），
 * 写内容时踩过两次同样的坑 —— 给 example 字段加上半角引号想「保护」它，
 * 结果引号成了内容的一部分，会原样写进数据库显示给学生：
 *   示例文字  ← 学生看到的就是这个，带着一对引号
 *
 * 检查四件事：
 *   1. 每行字段数必须等于表头（讲解里混进半角逗号会当场暴露）
 *   2. 不允许出现半角引号 `"` 和 `'`
 *   3. 讲解短于 40 字告警（提纲 ≠ 讲解），超过 200 字提示
 *   4. `word + chapter` 不能重复（重复会让合并器判定歧义并 exit 1）
 *
 * 用法：
 *   node scripts/check_content_csv.mjs            # 校验默认文件
 *   node scripts/check_content_csv.mjs <文件...>   # 校验指定文件
 *
 * 退出码：0 = 全部合格，1 = 有问题（可接进 CI）。
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CSV = join(HERE, 'assets/math-concept-content-draft.csv');

const MIN_EXPLANATION = 40;
const MAX_EXPLANATION = 200;

function main() {
  const files = process.argv.slice(2);
  const targets = files.length > 0 ? files : [DEFAULT_CSV];

  let totalRows = 0;
  let problems = 0;

  for (const file of targets) {
    const lines = readFileSync(file, 'utf8')
      .replace(/^\uFEFF/, '')
      .split('\n')
      .filter((line) => line.trim());

    const [header, ...rows] = lines;
    const columns = (header ?? '').split(',').map((c) => c.trim());
    console.log(`${file}：表头 ${columns.length} 列，数据 ${rows.length} 行`);

    for (const required of ['word', 'explanation']) {
      if (!columns.includes(required)) {
        console.error(`  ❌ 缺少列：${required}`);
        problems++;
      }
    }

    let bad = 0;
    rows.forEach((line, i) => {
      const field = line.split(',');
      const label = `第 ${i + 2} 行`;
      if (field.length !== columns.length) {
        console.error(
          `  ❌ ${label} 字段数 ${field.length} ≠ ${columns.length}（多半混进了半角逗号）：${line.slice(0, 40)}…`,
        );
        bad++;
      }
      if (/["']/.test(line)) {
        console.error(`  ❌ ${label} 含半角引号（会原样显示给学生）：${line.slice(0, 40)}…`);
        bad++;
      }
      const word = field[0] ?? '';
      const explanation = field[columns.indexOf('explanation')] ?? '';
      if (explanation && explanation.length < MIN_EXPLANATION) {
        console.warn(`  ⚠️ ${label}「${word}」讲解仅 ${explanation.length} 字（提纲 ≠ 讲解）`);
        bad++;
      }
      if (explanation && explanation.length > MAX_EXPLANATION) {
        console.warn(`  ⚠️ ${label}「${word}」讲解 ${explanation.length} 字，偏长`);
      }
    });

    const chapterIndex = columns.indexOf('chapter');
    const keys = rows.map((line) => {
      const field = line.split(',');
      return `${field[0]}@${chapterIndex >= 0 ? field[chapterIndex] : ''}`;
    });
    const count = {};
    keys.forEach((k) => (count[k] = (count[k] || 0) + 1));
    Object.entries(count)
      .filter(([, n]) => n > 1)
      .forEach(([k]) => {
        console.error(`  ❌ 重复 word+chapter（合并器会判歧义）：${k}`);
        bad++;
      });

    console.log(bad === 0 ? '  → 合格' : `  → ${bad} 个问题`);
    totalRows += rows.length;
    problems += bad;
  }

  console.log(
    problems === 0
      ? `✅ 合计 ${totalRows} 行，全部合格`
      : `❌ 合计 ${totalRows} 行，${problems} 个问题`,
  );
  process.exit(problems === 0 ? 0 : 1);
}

main();
