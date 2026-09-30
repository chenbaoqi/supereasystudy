#!/usr/bin/env node
/**
 * 数学练习题合并器：把题目 CSV 按「知识点名」挂载到
 * cloud/functions/resetAndImport/data.js 中对应 Knowledge 的 quiz 字段。
 *
 * 用法：node scripts/convert_textbook.mjs <教材csv...> 之后执行
 *        node scripts/merge_math_quiz.mjs
 *
 * 三个 CSV 源（列不一致也能读，缺的列按「未指定」处理）：
 *   - math-formula-quiz-draft.csv   公式专题题（point 为公式名）
 *   - math-concept-quiz-draft.csv   教材知识点题（point 为知识点名，带 chapter / visual）
 *   - math-formula-quiz-g2.csv      公式专题第二批（2026-09-18 补齐的 47 个点）
 *
 * ⚠️ 为什么第二批要单独一个文件、且必须带 path 列：
 *   47 个点里有 9 个（平均数 / 平行四边形面积 / 乘方 / 科学记数法 / 反比例函数 /
 *   二次函数 / 勾股定理逆定理 / 平行线性质 / 方差）与「知识点」路径**同名**。
 *   row 不写 path 时，匹配阶段会把同一批题挂到两个路径的同名点上，
 *   于是「知识点」那边原本好好的题被公式题**整体替换**掉（挂载是覆盖不是追加）。
 *   给第二批统一写上 path=公式，同名问题就消掉了。
 *   另：不能在老 CSV 里加 path 列 —— 老文件的行还是 8 列，加列会让它们因
 *   「字段数不符」被整行跳过。
 *
 * 数据性质：AI 骨架待校对（见 CSV 头部与 scripts/README.md）。
 *
 * 两个踩过的坑（别改回去）：
 *   1. data.js 是 **CommonJS 模块**，且被 prettier 格式化过（单引号、键不带引号），
 *      所以**不能**用 JSON.parse 去解析 —— 必须 require。
 *   2. CSV 用「逗号简单切分」，因此**所有字段禁止出现半角逗号**；
 *      题面里的停顿请用全角「，」。可视化字段同理（见 parseVisual 的分隔符约定）。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const ANSWER_INDEX = { A: 0, B: 1, C: 2, D: 3 };
const CSV_FILES = [
  'math-formula-quiz-draft.csv',
  'math-concept-quiz-draft.csv',
  'math-formula-quiz-g2.csv',
];
const DATA_JS = join(HERE, '../cloud/functions/resetAndImport/data.js');
const RELATIONS_JS = join(HERE, '../cloud/functions/resetAndImport/relations.js');

// visual 字段里需要转成数字的键（其余按字符串处理）
const NUMERIC_KEYS = new Set([
  'min',
  'max',
  'step',
  'value',
  'rangeFrom',
  'rangeTo',
  'numerator',
  'denominator',
  'whole',
  'xMin',
  'xMax',
  'yMin',
  'yMax',
  'lineK',
  'lineB',
]);
const BOOLEAN_KEYS = new Set(['showLabels', 'showLabel']);

// 与 miniprogram/core/visual.ts 的 REQUIRED_PROPS 保持一致：
// 缺了这些属性画出来是错的，宁可不画。
const REQUIRED_PROPS = {
  'number-line': ['min', 'max'],
  fraction: ['numerator', 'denominator'],
  'coordinate-plane': [],
  geometry: ['base', 'height'],
};
const VISUAL_TYPES = Object.keys(REQUIRED_PROPS);

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseCsvLine(line) {
  // 本 CSV 无引号字段（已约束：所有字段不得含半角逗号），按逗号简单切分
  return line.split(',').map((field) => field.trim());
}

function coerceValue(key, raw) {
  if (key === 'points') {
    // points=3~-2~P;5~3~A' → [{x:3,y:-2,label:'P'}, {x:5,y:3,label:"A'"}]
    return raw
      .split(';')
      .map((group) => {
        const [x, y, label] = group.split('~');
        return { x: Number(x), y: Number(y), label };
      })
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      .map((p) => (p.label ? { x: p.x, y: p.y, label: p.label } : { x: p.x, y: p.y }));
  }
  if (NUMERIC_KEYS.has(key)) return Number(raw);
  if (BOOLEAN_KEYS.has(key)) return raw === 'true';
  return raw;
}

/**
 * 解析可视化字段。格式（刻意不含半角逗号）：
 *   <类型>|<键>=<值>|<键>=<值>
 *   coordinate-plane|points=3~-2~P;5~3~A'|xMin=-5|xMax=5
 *   number-line|min=-5|max=5|value=-3
 *   fraction|numerator=3|denominator=4|compare=2/3
 * 分隔符：`|` 分段、`~` 分坐标、`;` 分多个点。
 * 注意：数值里的负号必须用**半角** `-`，全角 `−` 会被 Number() 转成 NaN。
 */
function parseVisual(raw, where) {
  if (!raw) return undefined;
  const parts = raw
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  const [type, ...rest] = parts;
  if (!VISUAL_TYPES.includes(type)) {
    console.warn(`⚠️ ${where}：未知可视化类型「${type}」（可选：${VISUAL_TYPES.join(' / ')}）`);
    return undefined;
  }
  const props = {};
  for (const part of rest) {
    const at = part.indexOf('=');
    if (at <= 0) {
      console.warn(`⚠️ ${where}：visual 片段「${part}」不是 键=值 形式，已跳过`);
      continue;
    }
    const key = part.slice(0, at).trim();
    props[key] = coerceValue(key, part.slice(at + 1).trim());
  }
  const missing = REQUIRED_PROPS[type].filter(
    (key) =>
      props[key] === undefined ||
      props[key] === null ||
      props[key] === '' ||
      Number.isNaN(props[key]),
  );
  if (missing.length > 0) {
    console.warn(`⚠️ ${where}：${type} 缺少 ${missing.join('、')}，已丢弃该图`);
    return undefined;
  }
  return { type, props };
}

function readCsv(file) {
  const lines = stripBom(readFileSync(join(HERE, 'assets', file), 'utf8'))
    .split('\n')
    .filter((line) => line.trim());
  const [header, ...records] = lines;
  const columns = parseCsvLine(header ?? '');
  for (const required of ['point', 'stem', 'optionA', 'optionB', 'optionC', 'optionD', 'answer']) {
    if (!columns.includes(required)) {
      console.error(`${file} 缺少列：${required}`);
      process.exit(1);
    }
  }
  const rows = [];
  for (const line of records) {
    const record = parseCsvLine(line);
    if (record.length !== columns.length) {
      console.warn(
        `⚠️ ${file}：行字段数 ${record.length} ≠ ${columns.length}：${line.slice(0, 40)}…`,
      );
      continue;
    }
    const row = Object.fromEntries(columns.map((col, index) => [col, record[index] ?? '']));
    const visual = parseVisual(row.visual, `${file}/${row.point}/${row.stem}`);
    const item = {
      stem: row.stem,
      options: [row.optionA, row.optionB, row.optionC, row.optionD],
      answerIndex: ANSWER_INDEX[row.answer?.toUpperCase()] ?? 0,
    };
    if (visual) item.visual = visual;
    rows.push({
      point: row.point,
      path: row.path ?? '',
      chapter: row.chapter ?? '',
      item,
      file,
    });
  }
  return rows;
}

/**
 * 顺带校验 relations.js：里面写的「章节/知识点名」必须在当前数据里能唯一定位。
 * 为什么放在这里：关系表靠名字解析成 _id，改名/改章节标题会让关系**静默失效**
 * （导入时只是跳过并告警）。本脚本每次重建数据都会跑，能把失效挡在上库之前。
 */
function checkRelations(data) {
  const relations = require(RELATIONS_JS);
  const chapterIdsByTitle = new Map();
  const knowledgeDocs = [];
  let seq = 0;
  for (const tree of Object.values(data.trees)) {
    for (const learningPath of tree.learningPaths) {
      for (const textbook of learningPath.textbooks ?? []) {
        for (const semester of textbook.semesters ?? []) {
          for (const chapter of semester.chapters ?? []) {
            const chapterId = `c${seq++}`;
            if (!chapterIdsByTitle.has(chapter.title)) chapterIdsByTitle.set(chapter.title, []);
            chapterIdsByTitle.get(chapter.title).push(chapterId);
            for (const knowledge of chapter.knowledge ?? []) {
              knowledgeDocs.push({ word: knowledge.word, chapterId });
            }
          }
        }
      }
    }
  }
  const docsByWord = new Map();
  for (const doc of knowledgeDocs) {
    if (!docsByWord.has(doc.word)) docsByWord.set(doc.word, []);
    docsByWord.get(doc.word).push(doc);
  }

  const errors = [];
  for (const rel of relations) {
    for (const spec of [rel.from, rel.to]) {
      const { word, chapter } =
        typeof spec === 'string'
          ? { word: spec, chapter: '' }
          : { word: spec.word, chapter: spec.chapter ?? '' };
      const pool = chapter ? (chapterIdsByTitle.get(chapter) ?? []) : null;
      const label = chapter ? `${chapter}/${word}` : word;
      if (chapter && pool.length === 0) errors.push(`章节未找到：${chapter}`);
      else {
        const hits = (docsByWord.get(word) ?? []).filter(
          (doc) => !pool || pool.includes(doc.chapterId),
        );
        if (hits.length === 0) errors.push(`知识点未找到：${label}`);
        else if (hits.length > 1)
          errors.push(`知识点重名（${hits.length} 处，请补 chapter）：${label}`);
      }
    }
  }
  if (errors.length > 0) {
    console.error(`❌ relations.js 有 ${errors.length} 处无法定位：\n  - ${errors.join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`✅ relations.js 校验通过：${relations.length} 条关系全部可唯一定位`);
}

function main() {
  const rows = CSV_FILES.flatMap(readCsv);
  const rowsByPoint = new Map();
  for (const row of rows) {
    if (!rowsByPoint.has(row.point)) rowsByPoint.set(row.point, []);
    rowsByPoint.get(row.point).push(row);
  }

  const data = require(DATA_JS);
  checkRelations(data);

  let attached = 0;
  let questionCount = 0;
  const missing = [];
  const ambiguous = [];
  for (const [treeId, tree] of Object.entries(data.trees)) {
    for (const learningPath of tree.learningPaths) {
      for (const textbook of learningPath.textbooks ?? []) {
        for (const semester of textbook.semesters ?? []) {
          for (const chapter of semester.chapters ?? []) {
            for (const knowledge of chapter.knowledge ?? []) {
              const candidates = rowsByPoint.get(knowledge.word);
              if (!candidates) {
                if (knowledge.type === 'formula') missing.push(knowledge.word);
                continue;
              }
              const matched = candidates.filter(
                (row) =>
                  (!row.path || row.path === learningPath.name) &&
                  (!row.chapter || row.chapter === chapter.title),
              );
              if (matched.length !== candidates.length && matched.length === 0) {
                ambiguous.push(`${knowledge.word}（${treeId}/${learningPath.name}）`);
                continue;
              }
              knowledge.quiz = matched.map((row) => row.item);
              attached += 1;
              questionCount += matched.length;
            }
          }
        }
      }
    }
  }

  const banner = '// 教材数据文件（由 scripts/convert_textbook.mjs 自动生成，请勿手改）\n';
  writeFileSync(DATA_JS, `${banner}module.exports = ${JSON.stringify(data, null, 2)};\n`);
  console.log(`✅ 题目挂载完成：${attached} 个知识点已挂 quiz（共 ${questionCount} 题）`);
  if (missing.length) console.log(`ℹ️  ${missing.length} 个公式点缺题：${missing.join('、')}`);
  if (ambiguous.length) console.warn(`⚠️ 有题目但路径/章节对不上：${ambiguous.join('、')}`);
}

main();
