#!/usr/bin/env node
/**
 * 修正册次的 order 字段（2026-09-21）。
 *
 * 背景：数据里英语「七年级上册」的 order 是 13，排在「九年级全册」后面——
 * 册次列表照搬数据顺序就会把七年级上册甩到最后（Owner 反馈「排序乱糟糟」）。
 *
 * 展示层已经自己按册次名排序了（`utils/stage.ts` 的 compareSemesterNames），
 * 不依赖这个字段；这里把数据本身也理正，免得其它地方再踩。
 *
 * 用法：node scripts/fix_semester_order.mjs [--dry]
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const DATA_JS = join(HERE, '../cloud/functions/resetAndImport/data.js');

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function sortKey(name) {
  const m = /^([一二三四五六七八九])年级/.exec(name ?? '');
  if (!m) return Number.MAX_SAFE_INTEGER; // 「全册」这类排最后
  const grade = CN[m[1]] ?? 99;
  const term = name.includes('上') ? 1 : name.includes('下') ? 2 : 3;
  return grade * 10 + term;
}

function main() {
  const dry = process.argv.includes('--dry');
  const data = require(DATA_JS);
  let fixed = 0;

  for (const tree of Object.values(data.trees ?? {})) {
    for (const path of tree.learningPaths ?? []) {
      for (const textbook of path.textbooks ?? []) {
        const semesters = textbook.semesters ?? [];
        const ordered = [...semesters].sort((a, b) => sortKey(a.name) - sortKey(b.name));
        ordered.forEach((semester, index) => {
          if (semester.order !== index + 1) fixed += 1;
          semester.order = index + 1;
        });
        // 顺带把数组顺序也理正（有些地方直接读数组）
        if (semesters.length > 0) textbook.semesters = ordered;
      }
    }
  }

  console.log(`册次 order 修正：${fixed} 处`);
  if (!dry) {
    const banner = '// 教材数据文件（由 scripts/convert_textbook.mjs 自动生成，请勿手改）\n';
    writeFileSync(DATA_JS, `${banner}module.exports = ${JSON.stringify(data, null, 2)};\n`);
    console.log('✅ 已写入 data.js');
  }
}

main();
