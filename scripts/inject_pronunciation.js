#!/usr/bin/env node
/**
 * 将已生成的 MP3 注入 data.js 的 knowledge.pronunciation 字段。
 * 用户需先把 scripts/assets/pronunciations/ 上传到云存储目录 pronunciations/。
 * 用法: node scripts/inject_pronunciation.js
 */

const fs = require('fs');
const path = require('path');

// ===== 配置 =====
const ENV_ID = 'cloud1-d8g6b7jctd1a3be1c';
const DATA_JS = path.join(__dirname, '..', 'cloud', 'functions', 'resetAndImport', 'data.js');
const PRON_DIR = path.join(__dirname, 'assets', 'pronunciations');

// 云存储 File ID 模板
const cloudPrefix = `cloud://${ENV_ID}.636c-${ENV_ID}-1455637430/pronunciations/`;


function sanitize(word) {
  return word.replace(/[ /\\]/g, '_');
}

// 构建「消毒后文件名 → 原始单词」的映射
function buildReverseMap(words) {
  const map = {};
  for (const w of words) {
    map[sanitize(w) + '.mp3'] = w;
  }
  return map;
}

// 从 data.js 中提取所有 knowledge → word 集合
function collectWords(data) {
  const words = [];
  for (const path of data.trees['英语']?.learningPaths || []) {
    for (const t of path.textbooks || []) {
      for (const s of t.semesters || []) {
        for (const c of s.chapters || []) {
          for (const k of c.knowledge || []) {
            if (k.word) words.push(k);
          }
        }
      }
    }
  }
  return words;
}

function main() {
  // 1. 列出已有 mp3
  if (!fs.existsSync(PRON_DIR)) {
    console.log('未找到 pronunciations/ 目录，跳过');
    return;
  }
  const mp3Files = fs.readdirSync(PRON_DIR).filter(f => f.endsWith('.mp3'));
  if (mp3Files.length === 0) {
    console.log('pronunciations/ 下没有 mp3 文件，跳过');
    return;
  }
  console.log(`找到 ${mp3Files.length} 个 mp3 文件`);

  // 2. 读取 data.js
  const raw = fs.readFileSync(DATA_JS, 'utf-8');
  const match = raw.match(/module\.exports\s*=\s*/);
  if (!match) throw new Error('data.js 格式异常');
  const jsonStart = match.index + match[0].length;
  let data;
  try {
    data = eval(`(${raw.slice(jsonStart).replace(/;\s*$/, '')})`);
  } catch (e) {
    throw new Error('data.js 解析失败: ' + e.message);
  }

  // 3. 收集所有 knowledge 引用
  const allKnowledge = collectWords(data);

  // 4. 构建反向映射
  const wordSet = [...new Set(allKnowledge.map(k => k.word))];
  // 结果当前未被后续步骤消费（下划线前缀 = 刻意保留，便于日后按文件反查单词）
  const _reverseMap = buildReverseMap(wordSet);

  // 5. 注入 pronunciation
  let injected = 0;
  for (const k of allKnowledge) {
    const filename = sanitize(k.word) + '.mp3';
    if (mp3Files.includes(filename)) {
      k.pronunciation = cloudPrefix + filename;
      injected++;
    }
  }
  console.log(`已注入 ${injected} 个 pronunciation 字段`);

  // 6. 写回 data.js（保持 JS 字面量格式 util.inspect）
  const util = require('util');
  const jsStr = util.inspect(data, { depth: null, maxArrayLength: null, compact: false, breakLength: 120 });
  // 去掉头尾括号以确保和原始格式一致
  const newContent = raw.slice(0, jsonStart) + jsStr + ';\n';
  fs.writeFileSync(DATA_JS, newContent, 'utf-8');
  console.log(`已更新 ${DATA_JS}`);
}

main();
