// 专题册次解析（含 L4 提速用的缓存）。
//
// 为什么要测缓存：resolveSemesterIdByPath 一次要串行查 4 次云，而结果是**不变的**。
// 学习页每次 onShow 都调它，不缓存就等于每次切回学习 tab 都白等 4 轮云调用。
import { describe, expect, it } from 'vitest';
import { createGrammarPackService } from '../miniprogram/services/grammarPackService';

interface Counters {
  subjects: number;
  paths: number;
  textbooks: number;
  semesters: number;
}

function makeService(overrides: { textbookName?: string } = {}) {
  const counters: Counters = { subjects: 0, paths: 0, textbooks: 0, semesters: 0 };
  const service = createGrammarPackService({
    subjectRepository: {
      async listAll() {
        counters.subjects += 1;
        return [{ _id: 'subj-1', name: '英语', open: true, order: 1 }] as never;
      },
    },
    learningPathRepository: {
      async listBySubject() {
        counters.paths += 1;
        return [{ _id: 'path-1', subjectId: 'subj-1', name: '语法', order: 1 }] as never;
      },
      async getById() {
        throw new Error('本用例不该调 getById');
      },
    },
    textbookRepository: {
      async findById() {
        throw new Error('本用例不该调 findById');
      },
      async listByLearningPath() {
        counters.textbooks += 1;
        return [
          {
            _id: 'tb-1',
            learningPathId: 'path-1',
            name: overrides.textbookName ?? '初中语法专题',
            order: 1,
          },
        ] as never;
      },
    },
    semesterRepository: {
      async getById() {
        throw new Error('本用例不该调 getById');
      },
      async listByTextbook() {
        counters.semesters += 1;
        return [{ _id: 'sem-1', textbookId: 'tb-1', name: '全册', order: 1 }] as never;
      },
    },
  });
  return { service, counters };
}

describe('resolveSemesterIdByPath', () => {
  it('第一次解析：走完整链路拿到册次 id', async () => {
    const { service, counters } = makeService();
    const id = await service.resolveSemesterIdByPath('subj-1', '语法', 'junior');
    expect(id).toBe('sem-1');
    expect(counters.paths).toBe(1);
    expect(counters.semesters).toBe(1);
  });

  it('⚠️ 同样的参数再问一次 → 不再查云（缓存命中）', async () => {
    const { service, counters } = makeService();
    await service.resolveSemesterIdByPath('subj-1', '语法', 'junior');
    const before = { ...counters };
    const id = await service.resolveSemesterIdByPath('subj-1', '语法', 'junior');
    expect(id).toBe('sem-1');
    expect(counters).toEqual(before); // 一次云调用都没多发
  });

  it('换学段 → 各自缓存，互不影响', async () => {
    const { service, counters } = makeService({ textbookName: '小学语法专题' });
    await service.resolveSemesterIdByPath('subj-1', '语法', 'junior');
    const pathsAfterJunior = counters.paths;
    // 小学教材不存在时命中不到，但不应拿到初中的缓存结果
    const id = await service.resolveSemesterIdByPath('subj-1', '语法', 'primary');
    expect(counters.paths).toBe(pathsAfterJunior + 1); // 确实重新查了
    expect(id).toBe('sem-1'); // 替身返回的是同一册次，这里只断言没走初中缓存
  });

  it('专题教材不存在 → 返回 null，并且**不重复查云**（负结果也缓存）', async () => {
    const { service, counters } = makeService({ textbookName: '别的教材' });
    const first = await service.resolveSemesterIdByPath('subj-1', '语法', 'junior');
    const afterFirst = { ...counters };
    const second = await service.resolveSemesterIdByPath('subj-1', '语法', 'junior');
    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(counters).toEqual(afterFirst);
  });

  it('不同实例各有各的缓存（单测之间不互相污染）', async () => {
    const a = makeService();
    const b = makeService();
    await a.service.resolveSemesterIdByPath('subj-1', '语法', 'junior');
    await b.service.resolveSemesterIdByPath('subj-1', '语法', 'junior');
    expect(b.counters.paths).toBe(1); // b 没拿到 a 的缓存
  });
});
