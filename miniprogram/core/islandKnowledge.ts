// 冒险岛口算题 ↔ 教材知识点的匹配（2026-09-19）。
//
// 为什么需要：冒险岛的题目是**动态生成**的算术（{a, op, b}），不属于任何教材知识点，
// 所以答错了也没法回流错题本——L3 那条管道对数学唯一的游戏一直是断的。
//
// 教材里其实有明确的口算类知识点（一年级「10以内加减法」「9加几」、二年级「5的乘法口诀」
// 「用2~6口诀求商」…），所以可以按「运算类型 + 数值范围」把它们对上。
//
// ⚠️ 一条硬规矩：**匹配不到就返回 null，绝不硬猜、绝不拿第一个凑数**。
//    挂错知识点比不挂更糟——错题本里会出现「孩子其实没错、只是我们猜错了」的假错题，
//    那种数据会一直污染补弱流程（需求第三十七章最怕这个）。
//    匹配不到 = 这一局不回流，孩子照样能玩，只是不进错题本。
import type { IslandOp } from './mathIsland';

export interface IslandKnowledge {
  readonly _id: string;
  readonly word: string;
}

/**
 * 运算类型 → 知识点名关键词。**顺序 = 优先级**：越靠前越具体。
 * 具体优先的意义：二年级有「5的乘法口诀」也有「乘法的初步认识」，
 * 口算题该挂在「口诀」上（练的是算得快），不是「初步认识」（那是概念）。
 */
const OP_KEYWORDS: Readonly<Record<IslandOp, readonly string[]>> = {
  add: ['加减法', '加几', '进位加', '两位数加', '整十数加', '加法', '加'],
  sub: ['加减法', '减几', '退位减', '两位数减', '整十数减', '减法', '减'],
  mul: ['乘法口诀', '乘法', '乘'],
  div: ['求商', '除法', '除'],
};

// 数值范围 → 限定词：避免把「10以内」的题挂到「100以内」的知识点上。
// 例：range=10 的加法，应命中「10以内加减法」而不是「两位数加一位数」。
function rangeHint(range: number): readonly string[] {
  if (range <= 10) return ['10以内', '十以内'];
  if (range <= 20) return ['20以内', '十几', '10加几', '整十数'];
  if (range <= 100) return ['两位数', '整十数', '100以内'];
  return ['万以内', '多位数', '三位数'];
}

// 知识点名里自带的范围标记 → 它管到多大。
// 为什么要这张表：放宽匹配（只看运算类型）时，会把 20 以内的加法挂到「10以内加减法」上——
// 名字里写着「10以内」，那就是明确的边界，range 超了就不能算它（2026-09-19 单测抓出来的）。
const RANGE_MARKERS: readonly { readonly text: string; readonly max: number }[] = [
  { text: '10以内', max: 10 },
  { text: '十以内', max: 10 },
  { text: '20以内', max: 20 },
  { text: '100以内', max: 100 },
  { text: '两位数', max: 100 },
  { text: '三位数', max: 1000 },
];

function exceedsRange(word: string, range: number): boolean {
  return RANGE_MARKERS.some((marker) => word.includes(marker.text) && range > marker.max);
}

// 加减题**不能**挂到带乘除的知识点上（真实数据里踩到过：二年级上册没有纯加减知识点，
// 于是「加」命中了「乘加乘减」——那是混合运算，不是口算加减）。
// 这种情况返回 null 更对：这一局不回流，也不造出错的错题。
const MIXED_MARKERS = ['乘', '除'] as const;

function isMixedOp(word: string, op: IslandOp): boolean {
  if (op !== 'add' && op !== 'sub') return false;
  return MIXED_MARKERS.some((marker) => word.includes(marker));
}

/**
 * 从当前章节的知识点里挑一个与「运算类型 + 数值范围」对应的口算知识点。
 * @returns 知识点 id；没有把握时返回 null（调用方据此决定不回流）
 */
export function pickIslandKnowledge(
  knowledgeList: readonly IslandKnowledge[],
  op: IslandOp,
  range: number,
): string | null {
  if (knowledgeList.length === 0) return null;

  const keywords = OP_KEYWORDS[op] ?? [];
  const hints = rangeHint(range);

  // 1) 最严格：运算关键词 + 范围限定词同时命中
  for (const keyword of keywords) {
    const hit = knowledgeList.find(
      (item) =>
        (item.word ?? '').includes(keyword) &&
        hints.some((hint) => (item.word ?? '').includes(hint)) &&
        !isMixedOp(item.word ?? '', op),
    );
    if (hit) return hit._id;
  }

  // 2) 放宽：只要命中运算关键词（具体关键词优先，靠数组顺序保证）
  //    但知识点名里若写死了范围（如「10以内加减法」），range 超了就不能算它
  for (const keyword of keywords) {
    const hit = knowledgeList.find(
      (item) =>
        (item.word ?? '').includes(keyword) &&
        !exceedsRange(item.word ?? '', range) &&
        !isMixedOp(item.word ?? '', op),
    );
    if (hit) return hit._id;
  }

  // 3) 还是没有 → 认了，返回 null（不猜）
  return null;
}
