// 清库 + 教材导入云函数（Owner 确认清库方案 A，2026-07-19）。
// ⚠️ 危险操作，仅用于开发期/数据替换窗口：
//   1) 清空 6 个内容集合 + 4 个测试期用户数据集合
//   2) 重建 9 学科基线（英语 open + 8 Coming Soon，Bible 第二章/PRD 九宫格）
//   3) 按 data.js 导入教材树（分层并行插入，规避 60s 执行超时上限）
const cloud = require('wx-server-sdk');
const data = require('./data');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const command = db.command;

// 学科基线：不在教材 CSV 里（学科是产品配置而非教材内容），随导入重建
// 学习路径基线：CSV 只含「词汇」，其余 Coming Soon 路径在此补充（Chapter 04 §5）
const LEARNING_PATHS_BASELINE = [{ name: '语法', open: false, order: 2 }];

const SUBJECTS_BASELINE = [
  { name: '英语', open: true, order: 1 },
  { name: '数学', open: false, order: 2 },
  { name: '语文', open: false, order: 3 },
  { name: '物理', open: false, order: 4 },
  { name: '化学', open: false, order: 5 },
  { name: '生物', open: false, order: 6 },
  { name: '历史', open: false, order: 7 },
  { name: '地理', open: false, order: 8 },
  { name: '政治', open: false, order: 9 },
];

const CONTENT_COLLECTIONS = [
  'subjects',
  'learning_paths',
  'textbooks',
  'semesters',
  'chapters',
  'knowledge',
];
// 清库方案 A：记录里挂的是旧内容 ID，替换后成孤儿，一并清空（仅测试期数据）
const USER_DATA_COLLECTIONS = [
  'learning_records',
  'review_records',
  'favorites',
  'memory_game_records',
];

const CONCURRENCY = 25; // 并行块大小：兼顾速度与云端写入频率限制

async function clearCollection(name) {
  const res = await db
    .collection(name)
    .where({ _id: command.exists(true) })
    .remove();
  return { name, removed: res.stats.removed };
}

// 分块并行插入（同一集合内无父子依赖，可安全并行）；返回与 docs 同序的 _id 数组
async function insertMany(collection, docs) {
  const ids = [];
  for (let index = 0; index < docs.length; index += CONCURRENCY) {
    const chunk = docs.slice(index, index + CONCURRENCY);
    const results = await Promise.all(
      chunk.map((doc) =>
        db.collection(collection).add({
          data: { ...doc, createdAt: db.serverDate(), updatedAt: db.serverDate() },
        }),
      ),
    );
    ids.push(...results.map((res) => res._id));
  }
  return ids;
}

exports.main = async () => {
  // 第 1 步：清库
  const cleared = [];
  for (const name of [...CONTENT_COLLECTIONS, ...USER_DATA_COLLECTIONS]) {
    cleared.push(await clearCollection(name));
  }

  // 第 2 步：把教材树展平为层级任务（记录父级在上一层数组中的下标）
  const tree = (data.trees && data.trees['英语']) || { learningPaths: [] };
  const pathTasks = [];
  const textbookTasks = [];
  const semesterTasks = [];
  const chapterTasks = [];
  const knowledgeTasks = [];
  tree.learningPaths.forEach((path, pathIndex) => {
    pathTasks.push({ doc: { name: path.name, open: path.open, order: path.order } });
    (path.textbooks ?? []).forEach((textbook) => {
      const textbookIndex = textbookTasks.length;
      textbookTasks.push({ doc: { name: textbook.name, order: textbook.order }, pathIndex });
      (textbook.semesters ?? []).forEach((semester) => {
        const semesterIndex = semesterTasks.length;
        semesterTasks.push({ doc: { name: semester.name, order: semester.order }, textbookIndex });
        (semester.chapters ?? []).forEach((chapter) => {
          const chapterIndex = chapterTasks.length;
          chapterTasks.push({ doc: { title: chapter.title, order: chapter.order }, semesterIndex });
          (chapter.knowledge ?? []).forEach((item) => {
            knowledgeTasks.push({ doc: { ...item }, chapterIndex });
          });
        });
      });
    });
  });

  // 第 3 步：逐层并行插入（父级 _id 解析后注入下一层）
  const subjectIds = await insertMany('subjects', SUBJECTS_BASELINE);
  const englishSubjectId = subjectIds[SUBJECTS_BASELINE.findIndex((s) => s.name === '英语')];
  // 路径 = CSV 推导（词汇）+ 基线补充（语法等 Coming Soon），按名称去重
  const pathDocs = [
    ...pathTasks.map((t) => t.doc),
    ...LEARNING_PATHS_BASELINE.filter((b) => !pathTasks.some((t) => t.doc.name === b.name)),
  ];
  const pathIds = await insertMany(
    'learning_paths',
    pathDocs.map((doc) => ({ ...doc, subjectId: englishSubjectId })),
  );
  const textbookIds = await insertMany(
    'textbooks',
    textbookTasks.map((t) => ({ ...t.doc, learningPathId: pathIds[t.pathIndex] })),
  );
  const semesterIds = await insertMany(
    'semesters',
    semesterTasks.map((t) => ({ ...t.doc, textbookId: textbookIds[t.textbookIndex] })),
  );
  const chapterIds = await insertMany(
    'chapters',
    chapterTasks.map((t) => ({ ...t.doc, semesterId: semesterIds[t.semesterIndex] })),
  );
  await insertMany(
    'knowledge',
    knowledgeTasks.map((t) => ({ ...t.doc, chapterId: chapterIds[t.chapterIndex] })),
  );

  return {
    cleared,
    imported: {
      subjects: SUBJECTS_BASELINE.length,
      learning_paths: pathDocs.length,
      textbooks: textbookTasks.length,
      semesters: semesterTasks.length,
      chapters: chapterTasks.length,
      knowledge: knowledgeTasks.length,
    },
  };
};
