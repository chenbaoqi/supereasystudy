#!/usr/bin/env node
/**
 * 词汇 CSV 例句列逗号修复器（一次性数据修复）。
 * 问题：example 列（第 11 列）内含未加引号的逗号（如 "Close the door, please."），
 * 导致行被多切出字段、translation 列被污染（例句尾巴错位成翻译）。
 * 修复：把 example 列的多余逗号合并回去并加双引号。
 * 用法：node scripts/repair_csv_example_commas.mjs <csv路径> [更多csv...]
 */

import { readFileSync, writeFileSync } from 'node:fs';

const HEADER_PREFIX = 'subject,';
const EXAMPLE_INDEX = 10; // example 是第 11 列（0 基 10）

function repairFile(path) {
  const lines = readFileSync(path, 'utf8').split('\n');
  const header = lines[0];
  const columnCount = header.split(',').length;
  let repaired = 0;
  const problems = [];

  const output = lines.map((line, lineIndex) => {
    if (!line.trim() || line.startsWith(HEADER_PREFIX)) return line;
    const fields = line.split(',');
    if (fields.length <= columnCount) return line; // 无多余逗号，原样保留
    const excess = fields.length - columnCount;
    // 假设多余逗号在 example 列（词汇数据其余列均不含英文逗号，已抽样验证）
    const mergedExample = fields.slice(EXAMPLE_INDEX, EXAMPLE_INDEX + excess + 1).join(',');
    const rebuilt = [
      ...fields.slice(0, EXAMPLE_INDEX),
      `"${mergedExample.replace(/"/g, '""')}"`, // 加引号并转义内部引号
      ...fields.slice(EXAMPLE_INDEX + excess + 1),
    ];
    if (rebuilt.length !== columnCount) {
      problems.push(lineIndex + 1);
      return line; // 仍不一致：不擅自改，留人工
    }
    repaired += 1;
    return rebuilt.join(',');
  });

  writeFileSync(path, output.join('\n'));
  console.log(
    `${path}: 修复 ${repaired} 行${problems.length ? `，${problems.length} 行待人工（行号 ${problems.join('/')}）` : ''}`,
  );
}

for (const path of process.argv.slice(2)) repairFile(path);
