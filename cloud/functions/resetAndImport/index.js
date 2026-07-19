// 清库 + 教材导入云函数（Owner 确认清库方案 A，2026-07-19）。
// ⚠️ 危险操作，仅用于开发期/数据替换窗口：
//   1) 清空 6 个内容集合 + 4 个测试期用户数据集合
//   2) 按 data.js（由 scripts/convert_textbook.mjs 从 CSV 生成）导入教材树
// 支持多版本教材：trees[学科名] → learningPaths[] → textbooks[] → semesters[] → chapters[] → knowledge[]
const cloud = require('wx-server-sdk');
const data = require('./data');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const command = db.command;

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

async function clearCollection(name) {
  const res = await db
    .collection(name)
    .where({ _id: command.exists(true) })
    .remove();
  return { name, removed: res.stats.removed };
}

exports.main = async () => {
  // 第 1 步：清库
  const cleared = [];
  for (const name of [...CONTENT_COLLECTIONS, ...USER_DATA_COLLECTIONS]) {
    cleared.push(await clearCollection(name));
  }

  // 第 2 步：导入（清库后无重复，直接插入）
  const stats = {
    subjects: 0,
    learning_paths: 0,
    textbooks: 0,
    semesters: 0,
    chapters: 0,
    knowledge: 0,
  };
  const insert = async (collection, doc) => {
    const res = await db.collection(collection).add({
      data: { ...doc, createdAt: db.serverDate(), updatedAt: db.serverDate() },
    });
    stats[collection] += 1;
    return res._id;
  };

  for (const subject of data.subjects) {
    const subjectId = await insert('subjects', subject);
    const tree = data.trees[subject.name];
    if (!tree) continue;
    for (const path of tree.learningPaths) {
      const pathId = await insert('learning_paths', {
        subjectId,
        name: path.name,
        open: path.open,
        order: path.order,
      });
      for (const textbook of path.textbooks ?? []) {
        const textbookId = await insert('textbooks', {
          learningPathId: pathId,
          name: textbook.name,
          order: textbook.order,
        });
        for (const semester of textbook.semesters ?? []) {
          const semesterId = await insert('semesters', {
            textbookId,
            name: semester.name,
            order: semester.order,
          });
          for (const chapter of semester.chapters ?? []) {
            const chapterId = await insert('chapters', {
              semesterId,
              title: chapter.title,
              order: chapter.order,
            });
            for (const item of chapter.knowledge ?? []) {
              await insert('knowledge', { ...item, chapterId });
            }
          }
        }
      }
    }
  }

  return { cleared, imported: stats };
};
