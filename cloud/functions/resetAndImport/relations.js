// 知识图谱关系源（knowledge_relations 集合）。
//
// ⚠️ 与同目录的 data.js 不同：data.js 由 scripts/convert_textbook.mjs **自动生成、禁止手改**，
//    本文件是**手写**的关系声明，是 knowledge_relations 的唯一数据源。
//    导入时由 index.js 把「知识点名」解析成真实 _id 再入库 ——
//    知识点 _id 是 upsert 时由数据库分配的，静态文件里写不出，只能运行时解析。
//
// 端点写法（from / to 通用）：
//   字符串                —— 只在全库按名字找。**必须全局唯一**，重名会被拒绝并告警。
//   { chapter, word }     —— 限定章节标题后再按名字找，用于重名或跨册的关系。
//   注意 chapter 是**逐端点**指定的：跨章节关系（如公式点 → 教材知识点）两端在不同章节，
//   共用同一个 chapter 会查不到。
//
// type：prerequisite 前置（学 from 之前要先会 to）
//       related      相关（易混淆 / 常一起考）
//       next         后继（学完 from 接着学 to）
//
// 当前覆盖：七年级「平面直角坐标系」簇 + 「有理数/数轴」簇（方案 C 最小闭环）。
const RELATIONS = [
  // —— 平面直角坐标系（七年级下册）—— 三级前置链 A → B → C
  { from: '用坐标表示位置', to: '平面直角坐标系', type: 'prerequisite' },
  { from: '用坐标表示平移', to: '用坐标表示位置', type: 'prerequisite' },
  { from: '用坐标表示平移', to: '平面直角坐标系', type: 'prerequisite' },
  { from: '平面直角坐标系', to: '用坐标表示位置', type: 'next' },
  { from: '用坐标表示位置', to: '用坐标表示平移', type: 'next' },

  // —— 相关：公式专题里依赖坐标系的点（跨章节，故 from 侧限定章节）——
  {
    from: { chapter: '图形与几何', word: '两点间距离' },
    to: '平面直角坐标系',
    type: 'prerequisite',
  },
  { from: { chapter: '图形与几何', word: '中点坐标' }, to: '用坐标表示位置', type: 'prerequisite' },
  { from: { chapter: '数与代数', word: '一次函数' }, to: '平面直角坐标系', type: 'prerequisite' },

  // —— 数轴（七年级上册「有理数」）—— 数轴 → 相反数 → 绝对值 → 大小比较
  { from: '相反数', to: '数轴', type: 'prerequisite' },
  { from: '绝对值', to: '数轴', type: 'prerequisite' },
  { from: '有理数大小比较', to: '数轴', type: 'prerequisite' },
  { from: '有理数大小比较', to: '相反数', type: 'prerequisite' },
  { from: '数轴', to: '相反数', type: 'next' },
  { from: '相反数', to: '绝对值', type: 'next' },
  { from: '绝对值', to: '有理数大小比较', type: 'next' },
  { from: '相反数', to: '绝对值', type: 'related' },
];

module.exports = RELATIONS;
