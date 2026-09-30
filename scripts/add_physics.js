// 把物理学科数据（physics.js）合并进 data.js。
// 用法：node scripts/add_physics.js
//
// ⚠️ 与 inject_pronunciation.js 同款「eval 解析 + util.inspect 写回」：
//    data.js 是 prettier 格式化过的 CommonJS（module.exports = {...};），
//    直接 require 会缓存、直接字符串拼接会破坏结构，所以解析后改对象再整段写回。
const fs = require('fs');
const path = require('path');
const util = require('util');

const DATA_JS = path.join(__dirname, '..', 'cloud', 'functions', 'resetAndImport', 'data.js');
const PHYSICS_JS = path.join(__dirname, '..', 'cloud', 'functions', 'resetAndImport', 'physics.js');

const raw = fs.readFileSync(DATA_JS, 'utf-8');
const match = raw.match(/module\.exports\s*=\s*/);
if (!match) throw new Error('data.js 格式异常');
const jsonStart = match.index + match[0].length;
const data = eval(`(${raw.slice(jsonStart).replace(/;\s*$/, '')})`);

const physics = require(PHYSICS_JS);
if (!physics || !Array.isArray(physics.learningPaths)) {
  throw new Error('physics.js 结构异常：缺少 learningPaths');
}

// 注入物理树（幂等：重复跑不报错、不重复）
data.trees = data.trees || {};
data.trees['物理'] = physics;

// subjects 加物理（缺省 open=true, order=3，排在英语/数学之后）
if (!data.subjects.some((s) => s.name === '物理')) {
  data.subjects.push({ name: '物理', open: true, order: 3 });
}

// 写回（保持 JS 字面量格式）
const jsStr = util.inspect(data, {
  depth: null,
  maxArrayLength: null,
  compact: false,
  breakLength: 120,
});
fs.writeFileSync(DATA_JS, raw.slice(0, jsonStart) + jsStr + ';\n', 'utf-8');

console.log('物理已注入 data.js');
console.log('subjects:', data.subjects.map((s) => s.name).join(', '));
console.log('trees:', Object.keys(data.trees).join(', '));

// 统计物理知识点/题量
let kCount = 0;
let qCount = 0;
for (const lp of physics.learningPaths) {
  for (const tb of lp.textbooks || []) {
    for (const sm of tb.semesters || []) {
      for (const ch of sm.chapters || []) {
        for (const k of ch.knowledge || []) {
          kCount += 1;
          qCount += (k.quiz || []).length;
        }
      }
    }
  }
}
console.log(`物理知识点 ${kCount} 个，选择题 ${qCount} 道`);
