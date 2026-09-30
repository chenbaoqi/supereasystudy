// 把高中数学（人教 A 版 2019）挂到数学「知识点」路径下，作为教材「人教版数学 2019」。
// 用法：node scripts/add_math_high.js（幂等：已存在同名 textbook 不重复添加）。
const fs = require('fs');
const path = require('path');
const util = require('util');

const DATA_JS = path.join(__dirname, '..', 'cloud', 'functions', 'resetAndImport', 'data.js');
const HIGH_JS = path.join(__dirname, '..', 'cloud', 'functions', 'resetAndImport', 'math_high.js');

const raw = fs.readFileSync(DATA_JS, 'utf-8');
const match = raw.match(/module\.exports\s*=\s*/);
if (!match) throw new Error('data.js 格式异常');
const jsonStart = match.index + match[0].length;
const data = eval(`(${raw.slice(jsonStart).replace(/;\s*$/, '')})`);

const high = require(HIGH_JS);
if (!high.textbook || !Array.isArray(high.textbook.semesters)) {
  throw new Error('math_high.js 结构异常');
}

const knowledgePath = (data.trees['数学'].learningPaths || []).find((lp) => lp.name === '知识点');
if (!knowledgePath) throw new Error('数学「知识点」路径不存在');
knowledgePath.textbooks = knowledgePath.textbooks || [];

const idx = knowledgePath.textbooks.findIndex((tb) => tb.name === high.textbook.name);
if (idx >= 0) {
  knowledgePath.textbooks[idx] = high.textbook;
  console.log('已更新教材:', high.textbook.name);
} else {
  knowledgePath.textbooks.push(high.textbook);
  console.log('已添加教材:', high.textbook.name);
}

const jsStr = util.inspect(data, {
  depth: null,
  maxArrayLength: null,
  compact: false,
  breakLength: 120,
});
fs.writeFileSync(DATA_JS, raw.slice(0, jsonStart) + jsStr + ';\n', 'utf-8');

let k = 0;
let q = 0;
for (const tb of knowledgePath.textbooks) {
  for (const sm of tb.semesters || []) {
    for (const ch of sm.chapters || []) {
      for (const it of ch.knowledge || []) {
        k += 1;
        q += (it.quiz || []).length;
      }
    }
  }
}
console.log(
  `数学「知识点」路径现有教材 ${knowledgePath.textbooks.length} 个，共 ${k} 个知识点 ${q} 题`,
);
