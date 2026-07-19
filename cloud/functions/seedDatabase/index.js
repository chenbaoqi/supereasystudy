// 示例种子数据导入云函数（Owner 授权 A1）。
// 幂等策略：按逻辑键（name/title/word + 父引用）查重，存在则复用其 _id，不重复插入。
// 嵌套遍历 data.js：插入父级后把生成的 _id 作为子级外键（层级关系 §3）。
const cloud = require('wx-server-sdk');
const seed = require('./data');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 按逻辑键查重：存在返回已有 _id，不存在插入。返回 { id, created }
async function ensureDoc(collection, where, data) {
  const found = await db.collection(collection).where(where).limit(1).get();
  if (found.data.length > 0) return { id: found.data[0]._id, created: false };
  const res = await db.collection(collection).add({
    data: { ...where, ...data, createdAt: db.serverDate(), updatedAt: db.serverDate() },
  });
  return { id: res._id, created: true };
}

exports.main = async () => {
  const summary = { created: 0, skipped: 0 };
  const track = (result) => {
    summary[result.created ? 'created' : 'skipped'] += 1;
    return result.id;
  };

  for (const subject of seed.subjects) {
    const subjectId = track(await ensureDoc('subjects', { name: subject.name }, subject));

    // 仅英语挂载学习路径及下级内容（其余学科为 Coming Soon 占位）
    if (subject.name !== '英语') continue;

    for (const path of seed.english.learningPaths) {
      const pathId = track(
        await ensureDoc('learning_paths', { subjectId, name: path.name }, { ...path, subjectId }),
      );
      if (path.name !== '词汇') continue;

      for (const textbook of seed.english.vocabulary.textbooks) {
        const textbookId = track(
          await ensureDoc(
            'textbooks',
            { learningPathId: pathId, name: textbook.name },
            { ...textbook, learningPathId: pathId },
          ),
        );

        for (const semester of seed.english.vocabulary.semesters) {
          const semesterId = track(
            await ensureDoc(
              'semesters',
              { textbookId, name: semester.name },
              { ...semester, textbookId },
            ),
          );

          for (const chapter of seed.english.vocabulary.chapters) {
            const chapterId = track(
              await ensureDoc(
                'chapters',
                { semesterId, title: chapter.title },
                { semesterId, title: chapter.title, order: chapter.order },
              ),
            );

            for (const item of chapter.knowledge) {
              track(
                await ensureDoc(
                  'knowledge',
                  { chapterId, word: item.word },
                  { ...item, chapterId },
                ),
              );
            }
          }
        }
      }
    }
  }

  return summary;
};
