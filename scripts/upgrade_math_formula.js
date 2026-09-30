// 把数学公式「讲透」升级内容合并进 data.js。
// 用法：node scripts/upgrade_math_formula.js
//
// 与 add_physics.js 同款「eval 解析 + util.inspect 写回」：
// 遍历数学公式点（type=formula），按公式名匹配升级内容，替换 explanation。
const fs = require('fs');
const path = require('path');
const util = require('util');

const DATA_JS = path.join(__dirname, '..', 'cloud', 'functions', 'resetAndImport', 'data.js');
const UPGRADE_JS = path.join(
  __dirname,
  '..',
  'cloud',
  'functions',
  'resetAndImport',
  'math_formula_explanations.js',
);

const raw = fs.readFileSync(DATA_JS, 'utf-8');
const match = raw.match(/module\.exports\s*=\s*/);
if (!match) throw new Error('data.js 格式异常');
const jsonStart = match.index + match[0].length;
const data = eval(`(${raw.slice(jsonStart).replace(/;\s*$/, '')})`);

const upgrade = require(UPGRADE_JS);
let upgraded = 0;
let missing = [];
for (const lp of data.trees['数学'].learningPaths || []) {
  for (const tb of lp.textbooks || []) {
    for (const sm of tb.semesters || []) {
      for (const ch of sm.chapters || []) {
        for (const it of ch.knowledge || []) {
          if (it.type !== 'formula') continue;
          const next = upgrade[it.word];
          if (next) {
            it.explanation = next;
            upgraded += 1;
          } else {
            missing.push(it.word);
          }
        }
      }
    }
  }
}

const jsStr = util.inspect(data, {
  depth: null,
  maxArrayLength: null,
  compact: false,
  breakLength: 120,
});
fs.writeFileSync(DATA_JS, raw.slice(0, jsonStart) + jsStr + ';\n', 'utf-8');

console.log(`数学公式已升级 ${upgraded} 个`);
if (missing.length > 0)
  console.log('未匹配（待下一批）:', missing.length, '个 →', missing.join('、'));
