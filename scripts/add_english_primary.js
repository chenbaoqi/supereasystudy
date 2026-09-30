// 把 PEP 一起版 2024（一、二年级词汇）挂到英语「词汇」路径下，作为独立教材。
// 用法：node scripts/add_english_primary.js
// 幂等：已存在同名 textbook 时不重复添加。
const fs = require('fs');
const path = require('path');
const util = require('util');

const DATA_JS = path.join(__dirname, '..', 'cloud', 'functions', 'resetAndImport', 'data.js');
const PRIMARY_JS = path.join(
  __dirname,
  '..',
  'cloud',
  'functions',
  'resetAndImport',
  'english_primary.js',
);

const raw = fs.readFileSync(DATA_JS, 'utf-8');
const match = raw.match(/module\.exports\s*=\s*/);
if (!match) throw new Error('data.js 格式异常');
const jsonStart = match.index + match[0].length;
const data = eval(`(${raw.slice(jsonStart).replace(/;\s*$/, '')})`);

const primary = require(PRIMARY_JS);
if (!primary.textbook || !Array.isArray(primary.textbook.semesters)) {
  throw new Error('english_primary.js 结构异常');
}

const vocabPath = (data.trees['英语'].learningPaths || []).find((lp) => lp.name === '词汇');
if (!vocabPath) throw new Error('英语「词汇」路径不存在');
vocabPath.textbooks = vocabPath.textbooks || [];

const idx = vocabPath.textbooks.findIndex((tb) => tb.name === primary.textbook.name);
if (idx >= 0) {
  vocabPath.textbooks[idx] = primary.textbook;
  console.log('已更新教材:', primary.textbook.name);
} else {
  vocabPath.textbooks.push(primary.textbook);
  console.log('已添加教材:', primary.textbook.name);
}

const jsStr = util.inspect(data, {
  depth: null,
  maxArrayLength: null,
  compact: false,
  breakLength: 120,
});
fs.writeFileSync(DATA_JS, raw.slice(0, jsonStart) + jsStr + ';\n', 'utf-8');

// 统计
let k = 0;
let q = 0;
for (const tb of vocabPath.textbooks) {
  for (const sm of tb.semesters || []) {
    for (const ch of sm.chapters || []) {
      for (const it of ch.knowledge || []) {
        k += 1;
        q += (it.quiz || []).length;
      }
    }
  }
}
console.log(`英语词汇路径现有教材 ${vocabPath.textbooks.length} 个，共 ${k} 个词汇点 ${q} 题`);
