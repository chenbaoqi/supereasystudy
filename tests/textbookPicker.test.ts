// 教材选择单测（2026-09-13 IA 调整：教材是最顶层选择项）。
// 核心命题：一级入口只给「真正的教材」，专题包（小学公式专题等）不给学生挑。
import { describe, expect, it } from 'vitest';
import type { Textbook } from '../miniprogram/core/textbook';
import type { LearningPath } from '../miniprogram/core/learningPath';
import { createTextbookPicker, isTopicPack } from '../miniprogram/services/textbookPicker';

const makeTextbook = (
  id: string,
  name: string,
  order: number,
  learningPathId: string,
  curriculumVersion?: string,
): Textbook => ({
  _id: id,
  name,
  order,
  learningPathId,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...(curriculumVersion ? { curriculumVersion } : {}),
});

const makePath = (id: string, name: string, order = 1): LearningPath => ({
  _id: id,
  name,
  subjectId: 'subj-math',
  open: true,
  order,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

// 数学真实结构：人教版挂在「知识点」路径，两个专题包挂在「公式」路径
function mathDeps() {
  return {
    learningPathRepository: {
      async listBySubject() {
        return [makePath('p-concept', '知识点'), makePath('p-formula', '公式')];
      },
      async getById(id: string) {
        return id === 'p-concept' ? makePath('p-concept', '知识点') : null;
      },
    },
    textbookRepository: {
      async listByLearningPath(pathId: string) {
        if (pathId === 'p-concept') {
          return [makeTextbook('tb-rj', '人教版', 1, 'p-concept', '人教版')];
        }
        return [
          makeTextbook('tb-f1', '小学公式专题', 1, 'p-formula'),
          makeTextbook('tb-f2', '初中公式专题', 2, 'p-formula'),
        ];
      },
      async findById() {
        return null;
      },
    },
  };
}

describe('textbookPicker.listTextbooks（教材为顶层）', () => {
  it('只返回真正的教材，专题包不进一级入口', async () => {
    const picker = createTextbookPicker(mathDeps());
    const list = await picker.listTextbooks('subj-math');
    expect(list.map((item) => item.name)).toEqual(['人教版']);
  });

  it('汇总了多条学习路径下的教材（不漏掉跨路径的教材）', async () => {
    const deps = mathDeps();
    deps.learningPathRepository.listBySubject = async () => [
      makePath('p-concept', '知识点'),
      makePath('p-formula', '公式'),
    ];
    deps.textbookRepository.listByLearningPath = async (pathId: string) =>
      pathId === 'p-concept'
        ? [
            makeTextbook('tb-rj', '人教版', 2, 'p-concept', '人教版'),
            makeTextbook('tb-bsd', '北师大版', 1, 'p-concept', '北师大版'),
          ]
        : [makeTextbook('tb-f1', '小学公式专题', 1, 'p-formula')];
    const picker = createTextbookPicker(deps);
    const list = await picker.listTextbooks('subj-math');
    expect(list.map((item) => item.name)).toEqual(['北师大版', '人教版']);
  });

  it('排序：先按 order，再按名称（跨路径合并后 order 会重复）', async () => {
    const deps = mathDeps();
    deps.learningPathRepository.listBySubject = async () => [makePath('p1', '知识点')];
    deps.textbookRepository.listByLearningPath = async () => [
      makeTextbook('tb-b', 'B版', 1, 'p1', 'B'),
      makeTextbook('tb-a', 'A版', 1, 'p1', 'A'),
    ];
    const picker = createTextbookPicker(deps);
    const list = await picker.listTextbooks('subj-math');
    expect(list.map((item) => item.name)).toEqual(['A版', 'B版']);
  });

  it('兜底：学科下只有专题包时不过滤成空页', async () => {
    const deps = mathDeps();
    deps.learningPathRepository.listBySubject = async () => [makePath('p-formula', '公式')];
    deps.textbookRepository.listByLearningPath = async () => [
      makeTextbook('tb-f1', '小学公式专题', 1, 'p-formula'),
      makeTextbook('tb-f2', '初中公式专题', 2, 'p-formula'),
    ];
    const picker = createTextbookPicker(deps);
    const list = await picker.listTextbooks('subj-math');
    expect(list.map((item) => item.name)).toEqual(['小学公式专题', '初中公式专题']);
  });

  it('学科没有任何教材 → 空数组（页面走空态）', async () => {
    const deps = mathDeps();
    deps.learningPathRepository.listBySubject = async () => [];
    const picker = createTextbookPicker(deps);
    await expect(picker.listTextbooks('subj-none')).resolves.toEqual([]);
  });

  // Owner 2026-09-13：「后面会上很多教材」——多版本并存是预期场景，不能被判据误伤
  it('多版本教材并存时全部列出且按 order 排序（不因跨路径合并而漏/乱）', async () => {
    const deps = mathDeps();
    deps.textbookRepository.listByLearningPath = async (pathId: string) =>
      pathId === 'p-concept'
        ? [
            makeTextbook('tb-rj', '人教版', 1, 'p-concept', '人教版'),
            makeTextbook('tb-bsd', '北师大版', 2, 'p-concept', '北师大版'),
            makeTextbook('tb-sj', '苏教版', 3, 'p-concept', '苏教版'),
          ]
        : [makeTextbook('tb-f1', '小学公式专题', 1, 'p-formula')];
    const picker = createTextbookPicker(deps);
    const list = await picker.listTextbooks('subj-math');
    expect(list.map((item) => item.name)).toEqual(['人教版', '北师大版', '苏教版']);
  });
});

describe('isTopicPack（教材 / 专题包判据）', () => {
  it('无 curriculumVersion → 专题包', () => {
    expect(isTopicPack(makeTextbook('t1', '小学公式专题', 1, 'p1'))).toBe(true);
  });

  it('有 curriculumVersion 的正规教材 → 不是专题包', () => {
    expect(isTopicPack(makeTextbook('t2', '人教版', 1, 'p1', '人教版'))).toBe(false);
    expect(isTopicPack(makeTextbook('t3', '北师大版', 2, 'p1', '北师大版'))).toBe(false);
  });

  // 双保险：将来数据录入不规范（给专题包也填了 curriculumVersion）时不混进教材层
  it('双保险：名字带「专题」的一律算专题包，即使误填了 curriculumVersion', () => {
    expect(isTopicPack(makeTextbook('t4', '初中语法专题', 1, 'p1', '人教版'))).toBe(true);
  });
});
