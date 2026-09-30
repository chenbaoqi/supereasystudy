// 教材导入云函数（2026-08-28 重构：支持多学科并行导入）。
// 为什么重构：原版只读取 data.trees['英语']，数学等其它学科永远不会入库；
// 且 subject 的 open 写死在 SUBJECTS_BASELINE，与 data.subjects 不一致。
// 现改为遍历 data.trees 的全部学科，open/order 以 data.subjects 为准，
// 每个集合（textbooks/semesters/chapters/knowledge）先跨所有学科收集源，
// 再各自 upsert 一次（避免 per-subject 调用时删除步骤误删其他学科）。
//
// 语义（保留原 upsert 模式，用户数据跨导入存活）：
// - 已存在（按逻辑键）：更新可变字段，保留 _id
// - 不存在：插入新记录
// - 源中消失：删除多余记录（content 集合以 data.js 为唯一源）
// - 用户数据集合默认保留；event.wipeUserData=true 可显式重置（开发期用）
//
// 逻辑键：subjects=name；learning_paths=subjectId+name；textbooks=name（全库唯一）；
// semesters=textbookId+name；chapters=semesterId+title；knowledge=chapterId+word
//
// ---------------------------------------------------------------- 分科导入（2026-09-19）
// 全库一次导入会撞云函数 60s 上限（1581 个知识点要逐条 upsert），返回 ret:-3（system error，
// 即被平台掐断）。用 event.subjects 分科跑，单次工作量减半：
//
//   { "subjects": ["数学"] }    只导数学
//   { "subjects": ["英语"] }    只导英语
//   {}                          全量（老行为，可能超时）
//
// ⚠️ 分科导入时**不会删除孤儿文档**：这一轮没带的文档属于「另一科」，不是「多余的」。
//    想清脏数据就跑一次全量（若能跑完）。返回值里 deleteOrphans 会说明这一轮删没删。
const cloud = require('wx-server-sdk');
const data = require('./data');
// 知识图谱关系源（手写，非自动生成 —— 见 relations.js 头部说明）
const RELATIONS = require('./relations');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 预留的全部学科占位（即使 data 暂未提供数据也保留九宫格条目）
const ALL_SUBJECT_NAMES = ['英语', '数学', '语文', '物理', '化学', '生物', '历史', '地理', '政治'];

const USER_DATA_COLLECTIONS = [
  'learning_records',
  'review_records',
  'favorites',
  'memory_game_records',
];

// 以 data.subjects 为权威：open/order 取自 data.js；缺省关闭、排在最后
function subjectMeta(name) {
  const from = (data.subjects || []).find((s) => s.name === name);
  return {
    name,
    open: from ? !!from.open : false,
    order: from ? from.order : 99,
  };
}

// 分页读取全集合。
// ⚠️ 原实现为 limit(1000) 单次读取：集合超过 1000 条时会**静默截断**，
//    导致 upsert 判重失效（重复插入）、删除阶段误删。knowledge 现有 1581 条，已踩线。
// 2026-09-21：100 → 500。集合膨胀到几千条后，readAll 要跑几十次分页，
// 光读就能吃掉一半的 60s 预算。云函数端单次上限 1000，取 500 稳妥。
const PAGE_SIZE = 500;
const MAX_DOCS = 20000; // 安全阀，防止异常数据把函数拖死

async function readAll(collection) {
  const out = [];
  let skip = 0;
  for (;;) {
    const res = await db.collection(collection).skip(skip).limit(PAGE_SIZE).get();
    const page = res.data || [];
    out.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += page.length;
    if (out.length >= MAX_DOCS) break;
  }
  return out;
}

// 分批并发执行（解决超时：串行 await 1800 次数据库往返远超 60 秒）。
// 并发过高会触发限流，20 是实测折中。
// 2026-09-21：从 20 提到 40。清理重复记录时删除量可能上千条，
// 20 并发要跑上百批，会撞云函数 60s 上限（返回 -3 system error）。
const CONCURRENCY = 40;

// 单次最多删这么多条。超出的部分下次再跑——导入是幂等的，多跑几次没风险，
// 但一次删爆就会被平台掐断，什么都拿不到（返回里会用 remainingDeletes 告诉你还剩多少）。
const MAX_DELETE_PER_RUN = 1500;

async function runInBatches(items, worker) {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    await Promise.all(items.slice(i, i + CONCURRENCY).map(worker));
  }
}

// 集合级 upsert：keyOf 生成逻辑键；mutableFields 为可更新字段
async function upsertCollection(collection, sourceDocs, keyOf, mutableFields, allowDelete = true) {
  const existing = await readAll(collection);
  // ⚠️ 同 key 重复必须清理（2026-09-21 查「章节里出现 20 条同名知识点」时发现）：
  //    原来 `existingByKey = new Map(existing.map(...))` —— 重复 key 时后面的覆盖前面的，
  //    而删除判定是「key 不在源里才删」，于是同 key 的多条**同时满足"在源里"**
  //    ⇒ 既不会被更新、也不会被删除，**永久赖在库里**。
  //    这里保留先出现的那条（与 existingByKey 指向的一致），其余记为重复待删。
  const existingByKey = new Map();
  const duplicateIds = [];
  for (const doc of existing) {
    const key = keyOf(doc);
    if (existingByKey.has(key)) {
      duplicateIds.push(doc._id);
      continue;
    }
    existingByKey.set(key, doc);
  }
  const sourceKeys = new Set();
  const summary = { kept: 0, inserted: 0, updated: 0, deleted: 0 };

  // 先全量「决策」，再批量「执行」——避免在循环里串行 await 数据库
  const toInsert = [];
  const toUpdate = [];

  for (const sourceDoc of sourceDocs) {
    const key = keyOf(sourceDoc);
    sourceKeys.add(key);
    const found = existingByKey.get(key);
    if (!found) {
      toInsert.push(sourceDoc);
      continue;
    }
    sourceDoc._id = found._id; // 关键：保留旧 id（引用不死）
    const patch = {};
    for (const field of mutableFields) {
      // 源数据没带的字段一律不动：既避免把已有值写成 undefined（云函数 update 会报错），
      // 也符合 RULES §7「不得删除已有字段」——清字段要显式改动，不能被静默抹掉。
      if (sourceDoc[field] === undefined) continue;
      if (JSON.stringify(sourceDoc[field]) !== JSON.stringify(found[field])) {
        patch[field] = sourceDoc[field];
      }
    }
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = db.serverDate();
      toUpdate.push({ id: found._id, patch });
    } else {
      summary.kept += 1;
    }
  }

  // ⚠️ 分科导入时**必须关掉删除**：本次没带的文档是「另一个学科的」，不是「多余的」。
  //    开着删除会把没导入的那一科整个清掉（2026-09-19 加 subjects 参数时踩坑点）。
  // 重复记录**任何时候都删**（它与 allowDelete 无关：那是为了保护「另一科的文档」，
  // 而重复记录是同一份内容的冗余，删掉它在任何场景下都是对的）
  const orphanIds = allowDelete
    ? existing.filter((doc) => !sourceKeys.has(keyOf(doc))).map((doc) => doc._id)
    : [];
  const toDelete = [...new Set([...duplicateIds, ...orphanIds])];

  await runInBatches(toInsert, async (doc) => {
    await db.collection(collection).add({
      data: { ...doc, createdAt: db.serverDate(), updatedAt: db.serverDate() },
    });
    summary.inserted += 1;
  });

  await runInBatches(toUpdate, async ({ id, patch }) => {
    await db.collection(collection).doc(id).update({ data: patch });
    summary.updated += 1;
  });

  // ⚠️ 分批限量删除：一次全删会超时（-3），拆成多次跑反而更快拿到结果
  const deleteBatch = toDelete.slice(0, MAX_DELETE_PER_RUN);
  await runInBatches(deleteBatch, async (id) => {
    await db.collection(collection).doc(id).remove();
    summary.deleted += 1;
  });
  if (toDelete.length > deleteBatch.length) {
    summary.remainingDeletes = toDelete.length - deleteBatch.length;
  }
  if (duplicateIds.length > 0) summary.duplicatesRemoved = duplicateIds.length;

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

  // 1) subjects：全部预留学科，open/order 以 data.subjects 为准
  const subjectsSource = ALL_SUBJECT_NAMES.map(subjectMeta);
  const subjectsSummary = await upsertCollection('subjects', subjectsSource, (doc) => doc.name, [
    'open',
    'order',
  ]);
  const subjectIdByName = new Map((await readAll('subjects')).map((doc) => [doc.name, doc._id]));

  // ---- 跨所有学科收集源 ----
  const allPathDocs = [];
  const textbooksRaw = []; // { subjectName, pathName, textbook }
  const semestersRaw = []; // { textbookName, semester }
  const chaptersRaw = []; // { semesterKey, chapter }
  const knowledgeRaw = []; // { chapterKey, item }

  // 分科导入：event.subjects = ['数学'] 只导这一科（用于避开云函数 60s 上限）。
  // 不传 = 全量（老行为）。注意 subjects 集合本身始终全量 upsert（见上），
  // 否则学科文档会被当成「多余」删掉。
  const wanted = event && Array.isArray(event.subjects) && event.subjects.length > 0 ? event.subjects : null;
  const importedSubjects = [];
  for (const subjectName of Object.keys(data.trees || {})) {
    if (wanted && !wanted.includes(subjectName)) continue;
    const subjectId = subjectIdByName.get(subjectName);
    if (!subjectId) continue;
    importedSubjects.push(subjectName);
    const tree = data.trees[subjectName];

    // learning_paths
    for (const path of tree.learningPaths || []) {
      allPathDocs.push({
        subjectId,
        name: path.name,
        open: path.open,
        order: path.order,
      });
    }

    // textbooks（暂存原始结构，等 learning_paths upsert 后解析 learningPathId）
    for (const path of tree.learningPaths || []) {
      for (const textbook of path.textbooks ?? []) {
        textbooksRaw.push({ subjectName, pathName: path.name, textbook });
      }
    }
  }

  // 2) learning_paths：一次性 upsert 全部学科
  const pathsSummary = await upsertCollection(
    'learning_paths',
    allPathDocs,
    (doc) => `${doc.subjectId}:${doc.name}`,
    ['open', 'order'],
    // 分科导入时不删除（另一科的文档不是「多余的」）
    !wanted,
  );
  const pathIdByKey = new Map(
    (await readAll('learning_paths')).map((doc) => [`${doc.subjectId}:${doc.name}`, doc._id]),
  );

  // 解析 textbook 源
  const textbookSource = [];
  for (const { subjectName, pathName, textbook } of textbooksRaw) {
    const subjectId = subjectIdByName.get(subjectName);
    const learningPathId = pathIdByKey.get(`${subjectId}:${pathName}`);
    textbookSource.push({
      learningPathId,
      name: textbook.name,
      order: textbook.order,
      semesters: textbook.semesters ?? [],
    });
    for (const semester of textbook.semesters ?? []) {
      semestersRaw.push({ textbookName: textbook.name, semester });
    }
  }

  // 3) textbooks：一次性 upsert（逻辑键=name，全库唯一）
  const textbooksSummary = await upsertCollection(
    'textbooks',
    textbookSource.map(({ semesters: _omit, ...doc }) => doc),
    (doc) => doc.name,
    ['name', 'order', 'learningPathId', 'curriculumVersion'],
    // 分科导入时不删除（另一科的文档不是「多余的」）
    !wanted,
  );
  const textbookIdByName = new Map((await readAll('textbooks')).map((doc) => [doc.name, doc._id]));

  // 解析 semester 源
  const semesterSource = [];
  for (const { textbookName, semester } of semestersRaw) {
    semesterSource.push({
      textbookId: textbookIdByName.get(textbookName),
      name: semester.name,
      order: semester.order,
      chapters: semester.chapters ?? [],
    });
    for (const chapter of semester.chapters ?? []) {
      chaptersRaw.push({
        semesterKey: `${textbookIdByName.get(textbookName)}:${semester.name}`,
        chapter,
      });
    }
  }

  // 4) semesters：一次性 upsert
  const semestersSummary = await upsertCollection(
    'semesters',
    semesterSource.map(({ chapters: _omit, ...doc }) => doc),
    (doc) => `${doc.textbookId}:${doc.name}`,
    ['name', 'order', 'textbookId'],
    // 分科导入时不删除（另一科的文档不是「多余的」）
    !wanted,
  );
  const semesterIdByKey = new Map(
    (await readAll('semesters')).map((doc) => [`${doc.textbookId}:${doc.name}`, doc._id]),
  );

  // 解析 chapter 源
  const chapterSource = [];
  for (const { semesterKey, chapter } of chaptersRaw) {
    const semesterId = semesterIdByKey.get(semesterKey);
    chapterSource.push({
      semesterId,
      title: chapter.title,
      order: chapter.order,
      knowledge: chapter.knowledge ?? [],
    });
    for (const item of chapter.knowledge ?? []) {
      knowledgeRaw.push({ chapterKey: `${semesterId}:${chapter.title}`, item });
    }
  }

  // 5) chapters：一次性 upsert
  const chaptersSummary = await upsertCollection(
    'chapters',
    chapterSource.map(({ knowledge: _omit, ...doc }) => doc),
    (doc) => `${doc.semesterId}:${doc.title}`,
    ['title', 'order', 'semesterId'],
    // 分科导入时不删除（另一科的文档不是「多余的」）
    !wanted,
  );
  const chapterDocs = await readAll('chapters');
  const chapterIdByKey = new Map(
    chapterDocs.map((doc) => [`${doc.semesterId}:${doc.title}`, doc._id]),
  );
  // 章节标题 → [chapterId]：关系声明只用「章节标题 + 知识点名」定位，标题可能重名（如 图形与几何）
  const chapterIdsByTitle = new Map();
  for (const doc of chapterDocs) {
    if (!chapterIdsByTitle.has(doc.title)) chapterIdsByTitle.set(doc.title, []);
    chapterIdsByTitle.get(doc.title).push(doc._id);
  }

  // 解析 knowledge 源
  const knowledgeSource = [];
  for (const { chapterKey, item } of knowledgeRaw) {
    const chapterId = chapterIdByKey.get(chapterKey);
    knowledgeSource.push({ ...item, chapterId });
  }

  // 6) knowledge：一次性 upsert
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
      'grade', // 2026-09-13 B-7：公式/语法点的适用年级（低年级过滤超纲内容，见 ADR-012）
    ],
    // 分科导入时不删除（另一科的文档不是「多余的」）
    !wanted,
  );

  // 7) knowledge_relations：把 relations.js 里的「知识点名」解析成真实 _id 再入库。
  //    关系表以 relations.js 为唯一源（与 content 集合以 data.js 为唯一源同理）。
  const knowledgeDocs = await readAll('knowledge');
  const knowledgeIdByWord = new Map(knowledgeDocs.map((doc) => [doc.word, []]));
  for (const doc of knowledgeDocs) knowledgeIdByWord.get(doc.word).push(doc);

  // 端点可以是字符串（全库按名字找，须唯一）或 { chapter, word }（限定章节后再找）
  function endpointOf(spec) {
    return typeof spec === 'string'
      ? { word: spec, chapter: '' }
      : { word: spec.word, chapter: spec.chapter ?? '' };
  }

  // 定位一个端点：命中不唯一则拒绝 —— 挂错关系比漏挂关系更糟
  function resolveKnowledge(spec) {
    const { word, chapter } = endpointOf(spec);
    const pool = chapter ? (chapterIdsByTitle.get(chapter) ?? []) : null;
    if (chapter && pool.length === 0) return { error: `章节未找到：${chapter}`, label: word };
    const hits = (knowledgeIdByWord.get(word) ?? []).filter(
      (doc) => !pool || pool.includes(doc.chapterId),
    );
    const label = chapter ? `${chapter}/${word}` : word;
    if (hits.length === 0) return { error: `知识点未找到：${label}`, label };
    if (hits.length > 1) return { error: `知识点重名（${hits.length} 处）：${label}`, label };
    return { id: hits[0]._id, label };
  }

  const relationSource = [];
  const relationWarnings = [];
  for (const rel of RELATIONS) {
    const from = resolveKnowledge(rel.from);
    const to = resolveKnowledge(rel.to);
    if (from.error || to.error) {
      relationWarnings.push(`${from.label} -${rel.type}-> ${to.label}：${from.error ?? to.error}`);
      continue;
    }
    if (from.id === to.id) {
      relationWarnings.push(`${from.label}：自环关系已忽略`);
      continue;
    }
    relationSource.push({ knowledgeId: from.id, relatedId: to.id, type: rel.type });
  }
  const relationsSummary = await upsertCollection(
    'knowledge_relations',
    relationSource,
    (doc) => `${doc.knowledgeId}:${doc.relatedId}:${doc.type}`,
    [], // 关系三元组本身即全部内容，无可变字段；改关系 = 改 relations.js 后重跑
    // 分科导入时不删除（另一科的文档不是「多余的」）
    !wanted,
  );

  // ---- 级联删除旧教材树（2026-09-30 教材加年号改名用） ----
  // 教材改名后 name 逻辑键变化 → 产生新教材树，旧树成为孤儿。分科导入不删孤儿，
  // 这里用显式传入的 deleteTextbookNames 级联删除旧教材及其下挂 semester/chapter/knowledge。
  // ⚠️ 只删「明确点名」的教材，且在导入完成之后执行；不传参数一个字节都不会删。
  const deleteTextbookNames =
    event && Array.isArray(event.deleteTextbookNames) ? event.deleteTextbookNames : [];
  const deletedTextbooks = [];
  if (deleteTextbookNames.length > 0) {
    const allTextbooks = await readAll('textbooks');
    const allSemesters = await readAll('semesters');
    const allChapters = await readAll('chapters');
    const allKnowledge = await readAll('knowledge');
    for (const name of deleteTextbookNames) {
      const old = allTextbooks.find((t) => t.name === name);
      if (!old) continue;
      const oldSemesters = allSemesters.filter((s) => s.textbookId === old._id);
      const oldSemesterIds = new Set(oldSemesters.map((s) => s._id));
      const oldChapters = allChapters.filter((c) => oldSemesterIds.has(c.semesterId));
      const oldChapterIds = new Set(oldChapters.map((c) => c._id));
      const oldKnowledge = allKnowledge.filter((k) => oldChapterIds.has(k.chapterId));
      // 知识图谱关系里指向「将被删除的知识点」的文档也要一并清理，避免残留失效推荐
      const oldKnowledgeIds = new Set(oldKnowledge.map((k) => k._id));
      const oldRelations = (await readAll('knowledge_relations')).filter(
        (r) => oldKnowledgeIds.has(r.knowledgeId) || oldKnowledgeIds.has(r.relatedId),
      );
      await runInBatches(oldRelations, (r) => db.collection('knowledge_relations').doc(r._id).remove());
      await runInBatches(oldKnowledge, (k) => db.collection('knowledge').doc(k._id).remove());
      await runInBatches(oldChapters, (c) => db.collection('chapters').doc(c._id).remove());
      await runInBatches(oldSemesters, (s) => db.collection('semesters').doc(s._id).remove());
      await db.collection('textbooks').doc(old._id).remove();
      deletedTextbooks.push({
        name,
        semesters: oldSemesters.length,
        chapters: oldChapters.length,
        knowledge: oldKnowledge.length,
        relations: oldRelations.length,
      });
    }
  }

  return {
    mode: event && event.wipeUserData === true ? 'upsert+wipeUserData' : 'upsert(keep user data)',
    // 分科导入时告诉调用方「这一轮到底导了哪几科」，避免跑一半不知道跑到哪了
    importedSubjects,
    deleteOrphans: !wanted, // 分科导入 = 不删孤儿文档（另一科的文档不算孤儿）
    wiped,
    summary: {
      subjects: subjectsSummary,
      learning_paths: pathsSummary,
      textbooks: textbooksSummary,
      semesters: semestersSummary,
      chapters: chaptersSummary,
      knowledge: knowledgeSummary,
      knowledge_relations: relationsSummary,
    },
    relationWarnings,
    deletedTextbooks,
    durationMs: Date.now() - startedAt,
  };
};
