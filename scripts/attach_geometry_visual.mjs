#!/usr/bin/env node
/**
 * 给面积推导类题目挂上可视化（B-7 之四的最后一环）。
 *
 * 为什么单独一个脚本：组件做完了，但题目和组件之间靠 `visual` 字段连接，
 * 没有这个连接孩子根本看不到图。而题库题是 CSV 合并进来的，直接改 CSV 会触发
 * 「挂载是整体替换」的老坑（加一列就得把旧题全抄回来）。这里只做「补一个字段」。
 *
 * ⚠️ 三种图形用**两种不同的推导**，别挂错：
 *   - 平行四边形：割补（沿高剪开、平移）→ 一个长方形
 *   - 三角形 / 梯形：拼接（两个全等图形凑一起）→ 平行四边形
 * 几何上不是一回事，挂反了会把推导讲错。
 *
 * 参数从题面提取（不是写死）：`底 8 厘米、高 5 厘米` → base=8, height=5。
 * 提取不到就用一组能讲清事的默认值——宁可图与题的数字对不上，也不能没有图
 * （教学场景里「有图能懂」优先于「数字完全一致」）。
 *
 * 用法：node scripts/attach_geometry_visual.mjs        # 写入 data.js
 *      node scripts/attach_geometry_visual.mjs --dry   # 只看统计
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const DATA_JS = join(HERE, '../cloud/functions/resetAndImport/data.js');

// 知识点 → 图形与推导方式
const TARGETS = [
  { match: '平行四边形面积', shape: 'parallelogram' },
  { match: '三角形面积', shape: 'triangle' },
  { match: '梯形面积', shape: 'trapezoid' },
];

const FALLBACK = { base: 10, height: 5, offset: 3, top: 6 };

function num(stem, ...patterns) {
  for (const pattern of patterns) {
    const m = pattern.exec(stem ?? '');
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

// 梯形题面是「上底 3、下底 7、高 4」：下底当底，上底单独给
function propsOf(shape, stem) {
  const height = num(stem, /高\s*(\d+(?:\.\d+)?)/);
  const top = num(stem, /上底\s*(\d+(?:\.\d+)?)/);
  const base = num(stem, /下底\s*(\d+(?:\.\d+)?)/, /底\s*(\d+(?:\.\d+)?)/);
  if (!height || !base) return null;
  const props = { base, height };
  if (shape === 'trapezoid') {
    props.top = top ?? Math.max(1, Math.round(base / 2));
    props.offset = Math.max(0, (base - props.top) / 2);
  } else {
    props.offset = Math.max(1, Math.round(base / 3));
  }
  return props;
}

function main() {
  const dry = process.argv.includes('--dry');
  const data = require(DATA_JS);
  let touched = 0;
  let already = 0;
  let fellBack = 0;
  let removed = 0;
  let fixed = 0;
  const byShape = {};

  for (const tree of Object.values(data.trees)) {
    for (const path of tree.learningPaths ?? []) {
      for (const textbook of path.textbooks ?? []) {
        for (const semester of textbook.semesters ?? []) {
          for (const chapter of semester.chapters ?? []) {
            for (const knowledge of chapter.knowledge ?? []) {
              const word = knowledge.word ?? '';
              const target = TARGETS.find((item) => word.includes(item.match));
              // 反向清理：不在目标里的知识点若被误挂过，撤掉
              if (!target) {
                for (const item of knowledge.quiz ?? []) {
                  if (item.visual && item.visual.type === 'geometry') {
                    delete item.visual;
                    removed += 1;
                  }
                }
                continue;
              }
              for (const item of knowledge.quiz ?? []) {
                // 幂等：已经有图的不动——但**第一版只挂平行四边形、没写 shape**，这里顺手补上
                if (item.visual) {
                  if (item.visual.type === 'geometry' && !item.visual.props.shape) {
                    item.visual.props.shape = target.shape;
                    fixed += 1;
                  } else {
                    already += 1;
                  }
                  continue;
                }
                const parsed = propsOf(target.shape, item.stem);
                if (!parsed) fellBack += 1;
                item.visual = {
                  type: 'geometry',
                  props: { shape: target.shape, ...(parsed ?? FALLBACK) },
                };
                byShape[target.shape] = (byShape[target.shape] ?? 0) + 1;
                touched += 1;
              }
            }
          }
        }
      }
    }
  }

  console.log(
    `面积图挂载：${touched} 道题（按题面数字 ${touched - fellBack} 道，兜底参数 ${fellBack} 道），` +
      `已有图跳过 ${already} 道（其中补全 shape ${fixed} 道），误挂撤除 ${removed} 道`,
  );
  console.log(`  按形态：${JSON.stringify(byShape)}`);
  if (touched === 0 && already === 0) {
    console.error('❌ 一道都没挂上：目标知识点可能改名了，检查 TARGETS');
    process.exit(1);
  }

  if (!dry) {
    const banner = '// 教材数据文件（由 scripts/convert_textbook.mjs 自动生成，请勿手改）\n';
    writeFileSync(DATA_JS, `${banner}module.exports = ${JSON.stringify(data, null, 2)};\n`);
    console.log('✅ 已写入 data.js');
  } else {
    console.log('（--dry：未写入）');
  }
}

main();
