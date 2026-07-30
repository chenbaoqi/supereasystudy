#!/usr/bin/env node
/**
 * 教材 CSV → resetAndImport 云函数 data.js 转换器。
 * 用法：node scripts/convert_textbook.mjs <csv路径>
 * 输入：扁平 CSV（表头见 scripts/assets/textbook-template.csv），一行一个单词。
 * 输出：cloud/functions/resetAndImport/data.js（嵌套教材树）。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_COLUMNS = ['subject', 'path', 'textbook', 'semester', 'chapter', 'word', 'meaning'];

function parseCsv(text) {
  // 带引号 CSV 解析（字段内可含逗号/引号/换行）
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

function main() {
  const csvPaths = process.argv.slice(2);
  if (csvPaths.length === 0) {
    console.error('用法：node scripts/convert_textbook.mjs <csv路径> [更多csv...]');
    console.error('多文件按传入顺序合并（册次 order 由文件顺序决定）');
    process.exit(1);
  }
  // 多文件合并：每个文件按【各自表头】映射为行对象后再合并
  // （修复：语法 CSV 比词汇 CSV 多 type/explanation 列，曾被首文件表头静默丢弃）
  const rowObjects = [];
  for (const csvPath of csvPaths) {
    const rows = parseCsv(readFileSync(csvPath, 'utf8'));
    const [header, ...fileRecords] = rows;
    const fileColumns = header.map((item) => item.trim());
    for (const required of REQUIRED_COLUMNS) {
      if (!fileColumns.includes(required)) {
        console.error(`${csvPath} 缺少必需列：${required}（必需：${REQUIRED_COLUMNS.join('/')}）`);
        process.exit(1);
      }
    }
    for (const [recordIndex, record] of fileRecords.entries()) {
      // 列数不一致 = 字段内出现未加引号的逗号（防静默错列，见 grammar 教训）
      if (record.length !== fileColumns.length) {
        console.warn(
          `⚠️ ${csvPath} 第 ${recordIndex + 2} 行列数 ${record.length} ≠ 表头 ${fileColumns.length}（字段内可能有未加引号的逗号）`,
        );
      }
      rowObjects.push(
        Object.fromEntries(fileColumns.map((col, index) => [col, (record[index] ?? '').trim()])),
      );
    }
  }

  const subjects = new Map(); // name → { name, open, order }
  const trees = new Map(); // subject → path → textbook → semester → chapter → knowledge[]
  const get = (map, key, factory) => {
    if (!map.has(key)) map.set(key, factory());
    return map.get(key);
  };

  let skipped = 0;
  for (const [lineIndex, row] of rowObjects.entries()) {
    if (!row.word || !row.meaning) {
      skipped += 1;
      console.warn(`第 ${lineIndex + 2} 行缺 word/meaning，已跳过`);
      continue;
    }
    if (!subjects.has(row.subject)) {
      subjects.set(row.subject, { name: row.subject, open: true, order: subjects.size + 1 });
    }
    const pathMap = get(trees, row.subject, () => new Map());
    const path = get(pathMap, row.path, () => ({
      name: row.path,
      open: true,
      order: pathMap.size + 1,
      textbooks: new Map(),
    }));
    const textbook = get(path.textbooks, row.textbook, () => ({
      name: row.textbook,
      order: path.textbooks.size + 1,
      semesters: new Map(),
    }));
    const semester = get(textbook.semesters, row.semester, () => ({
      name: row.semester,
      order: textbook.semesters.size + 1,
      chapters: new Map(),
    }));
    const chapter = get(semester.chapters, row.chapter, () => ({
      title: row.chapter,
      order: semester.chapters.size + 1,
      knowledge: [],
    }));
    const knowledge = {
      word: row.word,
      meaning: row.meaning,
      order: Number(row.order) || chapter.knowledge.length + 1,
    };
    if (row.type) knowledge.type = row.type; // Chapter 12：word/grammar 双形态
    if (row.ipa) knowledge.ipa = row.ipa;
    if (row.explanation) knowledge.explanation = row.explanation; // Chapter 12：语法讲解
    if (row.partOfSpeech) knowledge.partOfSpeech = row.partOfSpeech;
    if (row.example) knowledge.example = row.example;
    if (row.translation) knowledge.translation = row.translation;
    chapter.knowledge.push(knowledge);
  }

  // Map → 嵌套对象
  const toArray = (map) => [...map.values()].sort((a, b) => a.order - b.order);
  const output = {
    subjects: toArray(subjects),
    trees: Object.fromEntries(
      [...trees.entries()].map(([subject, pathMap]) => [
        subject,
        {
          learningPaths: toArray(pathMap).map((path) => ({
            ...path,
            textbooks: toArray(path.textbooks).map((textbook) => ({
              ...textbook,
              semesters: toArray(textbook.semesters).map((semester) => ({
                ...semester,
                chapters: toArray(semester.chapters),
              })),
            })),
          })),
        },
      ]),
    ),
  };

  const target = join(
    dirname(fileURLToPath(import.meta.url)),
    '../cloud/functions/resetAndImport/data.js',
  );
  const banner = '// 教材数据文件（由 scripts/convert_textbook.mjs 自动生成，请勿手改）\n';
  writeFileSync(target, `${banner}module.exports = ${JSON.stringify(output, null, 2)};\n`);

  const chapters = Object.values(output.trees).reduce(
    (sum, tree) =>
      sum +
      tree.learningPaths.reduce(
        (s, p) =>
          s +
          p.textbooks.reduce(
            (x, t) => x + t.semesters.reduce((y, se) => y + se.chapters.length, 0),
            0,
          ),
        0,
      ),
    0,
  );
  console.log(
    `✅ 转换完成：${output.subjects.length} 学科 / ${chapters} 章节 / ${rowObjects.length - skipped} 词条（跳过 ${skipped} 行）→ ${target}`,
  );
}

main();
