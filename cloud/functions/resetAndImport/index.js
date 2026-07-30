// 教材导入云函数（2026-07-31 重构：全清重导 → 按逻辑键 upsert）。
// 为什么重构：全清重导会重新生成所有 id，杀死 偏好/学习记录/复习/收藏 的引用
// （Owner 反馈「选了册次章节空白」的根因）。upsert 后 id 稳定，用户数据跨导入存活。
//
// 语义：
// - 已存在（按逻辑键）：更新可变字段，保留 _id
// - 不存在：插入新记录
// - 源中消失：删除多余记录（content 集合以 data.js 为唯一源）
// - 用户数据集合默认保留；event.wipeUserData=true 可显式重置（开发期用）
//
// 逻辑键：subjects=name；learning_paths=subjectId+name；textbooks=learningPathId+name；
// semesters=textbookId+name；chapters=semesterId+title；knowledge=chapterId+word
const cloud = require('wx-server-sdk');
const data = require('./data');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

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

const LEARNING_PATHS_BASELINE = [{ name: '语法', open: false, order: 2 }];

const USER_DATA_COLLECTIONS = [
  'learning_records',
  'review_records',
  'favorites',
  'memory_game_records',
];

async function readAll(collection) {
  const res = await db.collection(collection).limit(1000).get();
  return res.data;
}

// 集合级 upsert：keyOf 生成逻辑键；mutableFields 为可更新字段
async function upsertCollection(collection, sourceDocs, keyOf, mutableFields) {
  const existing = await readAll(collection);
  const existingByKey = new Map(existing.map((doc) => [keyOf(doc), doc]));
  const sourceKeys = new Set();
  const summary = { kept: 0, inserted: 0, updated: 0, deleted: 0 };

  for (const sourceDoc of sourceDocs) {
    const key = keyOf(sourceDoc);
    sourceKeys.add(key);
    const found = existingByKey.get(key);
    if (!found) {
      await db.collection(collection).add({
        data: { ...sourceDoc, createdAt: db.serverDate(), updatedAt: db.serverDate() },
      });
      summary.inserted += 1;
      continue;
    }
    sourceDoc._id = found._id; // 关键：保留旧 id（引用不死）
    const patch = {};
    for (const field of mutableFields) {
      if (JSON.stringify(sourceDoc[field]) !== JSON.stringify(found[field])) {
        patch[field] = sourceDoc[field];
      }
    }
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = db.serverDate();
      await db.collection(collection).doc(found._id).update({ data: patch });
      summary.updated += 1;
    } else {
      summary.kept += 1;
    }
  }

  for (const doc of existing) {
    if (!sourceKeys.has(keyOf(doc))) {
      await db.collection(collection).doc(doc._id).remove();
      summary.deleted += 1;
    }
  }
  return summary;
}

exports.main = async (event) => {
  const startedAt = Date.now();

  // 可选：显式重置用户数据（默认保留——upsert 后内容 id 稳定，用户数据天然存活）
  const wiped = [];
  if (event && event.wipeUserData === true) {
    for (const name of USER_DATA_COLLECTIONS) {
      const res = await db
        .collection(name)
        .where({ _id: db.command.exists(true) })
        .remove();
      wiped.push({ name, removed: res.stats.removed });
    }
  }

  // 1) subjects：9 学科基线（含英语）
  const subjectsSummary = await upsertCollection('subjects', SUBJECTS_BASELINE, (doc) => doc.name, [
    'open',
    'order',
  ]);
  const englishId = (await readAll('subjects')).find((doc) => doc.name === '英语')._id;

  // 2) learning_paths：词汇/语法（语法基线仅当源中没有时补充）
  const tree = (data.trees && data.trees['英语']) || { learningPaths: [] };
  const pathDocs = tree.learningPaths.map((path) => ({
    subjectId: englishId,
    name: path.name,
    open: path.open,
    order: path.order,
  }));
  for (const base of LEARNING_PATHS_BASELINE) {
    if (!pathDocs.some((doc) => doc.name === base.name)) {
      pathDocs.push({ ...base, subjectId: englishId });
    }
  }
  const pathsSummary = await upsertCollection(
    'learning_paths',
    pathDocs,
    (doc) => `${doc.subjectId}:${doc.name}`,
    ['open', 'order'],
  );

  // 3) textbooks：按学习路径挂载
  const pathDocsWithIds = await readAll('learning_paths');
  const pathIdByName = new Map(pathDocsWithIds.map((doc) => [doc.name, doc._id]));
  const textbookSource = [];
  for (const path of tree.learningPaths) {
    for (const textbook of path.textbooks ?? []) {
      textbookSource.push({
        learningPathId: pathIdByName.get(path.name),
        name: textbook.name,
        order: textbook.order,
        semesters: textbook.semesters ?? [],
      });
    }
  }
  const textbooksSummary = await upsertCollection(
    'textbooks',
    textbookSource.map(({ semesters: _omit, ...doc }) => doc),
    (doc) => doc.name, // 教材名在当前数据下唯一（人教版 PEP / 小学语法专题 / 初中语法专题）
    ['name', 'order', 'learningPathId'],
  );

  // 4) semesters：按教材挂载
  const textbookAll = await readAll('textbooks');
  const textbookIdByName = new Map(textbookAll.map((doc) => [doc.name, doc._id]));
  const semesterSource = [];
  for (const textbook of textbookSource) {
    for (const semester of textbook.semesters) {
      semesterSource.push({
        textbookId: textbookIdByName.get(textbook.name),
        name: semester.name,
        order: semester.order,
        chapters: semester.chapters ?? [],
      });
    }
  }
  const semestersSummary = await upsertCollection(
    'semesters',
    semesterSource.map(({ chapters: _omit, ...doc }) => doc),
    (doc) => `${doc.textbookId}:${doc.name}`,
    ['name', 'order', 'textbookId'],
  );

  // 5) chapters：按册次挂载
  const semesterAll = await readAll('semesters');
  const semesterIdByKey = new Map(
    semesterAll.map((doc) => [`${doc.textbookId}:${doc.name}`, doc._id]),
  );
  const chapterSource = [];
  for (const semester of semesterSource) {
    const semesterId = semesterIdByKey.get(`${semester.textbookId}:${semester.name}`);
    for (const chapter of semester.chapters) {
      chapterSource.push({
        semesterId,
        title: chapter.title,
        order: chapter.order,
        knowledge: chapter.knowledge ?? [],
      });
    }
  }
  const chaptersSummary = await upsertCollection(
    'chapters',
    chapterSource.map(({ knowledge: _omit, ...doc }) => doc),
    (doc) => `${doc.semesterId}:${doc.title}`,
    ['title', 'order', 'semesterId'],
  );

  // 6) knowledge：按章节挂载
  const chapterAll = await readAll('chapters');
  const chapterIdByKey = new Map(
    chapterAll.map((doc) => [`${doc.semesterId}:${doc.title}`, doc._id]),
  );
  const knowledgeSource = [];
  for (const chapter of chapterSource) {
    const chapterId = chapterIdByKey.get(`${chapter.semesterId}:${chapter.title}`);
    for (const item of chapter.knowledge) {
      knowledgeSource.push({ ...item, chapterId });
    }
  }
  const knowledgeSummary = await upsertCollection(
    'knowledge',
    knowledgeSource,
    (doc) => `${doc.chapterId}:${doc.word}`,
    [
      'meaning',
      'ipa',
      'pronunciation',
      'partOfSpeech',
      'example',
      'translation',
      'order',
      'type',
      'explanation',
      'quiz',
    ],
  );

  return {
    mode: event && event.wipeUserData === true ? 'upsert+wipeUserData' : 'upsert(keep user data)',
    wiped,
    summary: {
      subjects: subjectsSummary,
      learning_paths: pathsSummary,
      textbooks: textbooksSummary,
      semesters: semestersSummary,
      chapters: chaptersSummary,
      knowledge: knowledgeSummary,
    },
    durationMs: Date.now() - startedAt,
  };
};
