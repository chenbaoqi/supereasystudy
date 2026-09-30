// 年级作用域单元测试（ADR-012：跨年级专题包按当前年级过滤）。
// 覆盖三条核心规则：未标 grade 恒显示 / 已标 grade 只显示「当前年级及以前」/ 年级解析不出不过滤。
import { describe, expect, it } from 'vitest';
import type { UserPreferences } from '../miniprogram/core/user';
import {
  createGradeScope,
  withinGrade,
  type GradeScopeDeps,
} from '../miniprogram/services/gradeScope';

interface Item {
  readonly id: string;
  readonly grade?: number;
}

const item = (id: string, grade?: number): Item => ({
  id,
  ...(grade === undefined ? {} : { grade }),
});

const preferences = (semesterName: string): UserPreferences => ({
  textbookId: 'tb1',
  textbookName: '人教版',
  semesterId: 's1',
  semesterName,
});

function fakeUserService(options: {
  bySubject?: UserPreferences | null;
  legacy?: UserPreferences | null;
  subjectId?: string;
  manualGrade?: number | null;
}): GradeScopeDeps {
  return {
    getCurrentSubjectId() {
      return options.subjectId ?? '';
    },
    getPreferences(subjectId?: string) {
      if (subjectId) return options.bySubject ?? null;
      return options.legacy ?? null;
    },
    ...(options.manualGrade === undefined
      ? {}
      : { getManualGrade: () => options.manualGrade ?? null }),
  };
}

describe('withinGrade（纯过滤）', () => {
  const list = [item('a', 1), item('b', 3), item('c')]; // c 未标年级

  it('grade=null（年级未知）→ 不过滤，原样返回', () => {
    expect(withinGrade(list, null).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('保留「当前年级及以前」的知识点，过滤掉超纲的', () => {
    // 累积式：三年级要能看到一年级学过的，但看不到五年级的
    const all = [item('a', 1), item('b', 3), item('c', 5), item('d')];
    expect(withinGrade(all, 3).map((i) => i.id)).toEqual(['a', 'b', 'd']);
  });

  it('未标 grade 的知识点恒显示（旧数据零回归）', () => {
    expect(withinGrade([item('x'), item('y')], 1).map((i) => i.id)).toEqual(['x', 'y']);
  });

  it('一年/七年级这类低年级会把整包清空（学习页据此隐藏分类）', () => {
    const primary = [item('a', 3), item('b', 5)];
    expect(withinGrade(primary, 1)).toEqual([]);
    const junior = [item('a', 7), item('b', 9)];
    expect(withinGrade(junior, 7).map((i) => i.id)).toEqual(['a']);
  });

  it('返回新数组，不改动入参', () => {
    const source = [item('a', 1)];
    const out = withinGrade(source, 3);
    out.pop();
    expect(source).toHaveLength(1);
  });
});

describe('createGradeScope.currentGrade', () => {
  it('优先取「当前学科」的分科偏好', () => {
    const scope = createGradeScope(
      fakeUserService({
        subjectId: 'math',
        bySubject: preferences('五年级上册'),
        legacy: preferences('三年级上册'),
      }),
    );
    expect(scope.currentGrade()).toBe(5);
  });

  it('该学科没有偏好时回退旧字段', () => {
    const scope = createGradeScope(
      fakeUserService({ subjectId: 'math', bySubject: null, legacy: preferences('六年级下册') }),
    );
    expect(scope.currentGrade()).toBe(6);
  });

  it('没设偏好 → null（调用方按「不过滤」处理，不能把内容藏掉）', () => {
    const scope = createGradeScope(fakeUserService({}));
    expect(scope.currentGrade()).toBe(null);
  });

  it('册次名解析不出年级（如「全册」）→ null', () => {
    const scope = createGradeScope(
      fakeUserService({ subjectId: 'math', bySubject: preferences('全册') }),
    );
    expect(scope.currentGrade()).toBe(null);
  });

  it('初中册次按 7/8/9 解析，与小学 1-6 连续可比', () => {
    const scope = createGradeScope(
      fakeUserService({ subjectId: 'math', bySubject: preferences('九年级上册') }),
    );
    expect(scope.currentGrade()).toBe(9);
  });
});

// 设置页（2026-09-14）新增：册次名解析不出年级时（专题册次叫「全册」），
// 由用户手动指定年级。这是之前「超纲分类没被隐藏」那条反馈的根治手段。
describe('手动年级（设置页指定，优先级最高）', () => {
  it('手动年级覆盖册次推导', () => {
    const scope = createGradeScope(
      fakeUserService({ subjectId: 'math', bySubject: preferences('六年级上册'), manualGrade: 3 }),
    );
    expect(scope.currentGrade()).toBe(3);
  });

  it('册次解析不出年级（「全册」）时，手动值仍然生效', () => {
    const scope = createGradeScope(
      fakeUserService({ subjectId: 'math', bySubject: preferences('全册'), manualGrade: 2 }),
    );
    expect(scope.currentGrade()).toBe(2);
  });

  it('没手动指定（null / 未传）→ 回落到册次推导', () => {
    const withNull = createGradeScope(
      fakeUserService({
        subjectId: 'math',
        bySubject: preferences('四年级上册'),
        manualGrade: null,
      }),
    );
    expect(withNull.currentGrade()).toBe(4);

    const withoutDep = createGradeScope(
      fakeUserService({ subjectId: 'math', bySubject: preferences('四年级上册') }),
    );
    expect(withoutDep.currentGrade()).toBe(4);
  });

  it('脏值（0 / 负数 / NaN）一律当没设，不能把内容整片清掉', () => {
    for (const dirty of [0, -1, Number.NaN]) {
      const scope = createGradeScope(
        fakeUserService({
          subjectId: 'math',
          bySubject: preferences('五年级上册'),
          manualGrade: dirty,
        }),
      );
      expect(scope.currentGrade()).toBe(5);
    }
  });
});
