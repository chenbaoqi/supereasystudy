// stage 工具单测（B-1 数据模型升级）。
// 重点：锁住 2026-09-08 修掉的回归 bug——旧实现把「一年级/二年级」误判为 junior（初中）。
import { describe, expect, it } from 'vitest';
import {
  curriculumVersionOfTextbook,
  GRADE_OPTIONS,
  gradeLabel,
  gradeOfSemester,
  stageLabel,
  stageOfGrade,
  stageOfSemester,
  stageOfSemesterWith,
  stageOfTextbook,
} from '../miniprogram/utils/stage';

// 设置页年级选择器（2026-09-14）用的展示名与可选范围
describe('gradeLabel / GRADE_OPTIONS', () => {
  it('1-9 年级的中文名与 gradeOfSemester 的解析口径一致', () => {
    expect(gradeLabel(1)).toBe('一年级');
    expect(gradeLabel(6)).toBe('六年级');
    expect(gradeLabel(7)).toBe('七年级');
    expect(gradeLabel(9)).toBe('九年级');
  });

  it('10-12 走高中写法（高一/高二/高三）', () => {
    expect(gradeLabel(10)).toBe('高一');
    expect(gradeLabel(12)).toBe('高三');
  });

  it('越界年级不抛错，退回「N年级」', () => {
    expect(gradeLabel(0)).toBe('0年级');
    expect(gradeLabel(13)).toBe('13年级');
  });

  it('可选项 1~12（含高中），年级系统已升级到高中', () => {
    expect(GRADE_OPTIONS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe('gradeOfSemester', () => {
  it('小学一年级 ~ 六年级解析正确', () => {
    expect(gradeOfSemester('一年级上册')).toBe(1);
    expect(gradeOfSemester('二年级下册')).toBe(2);
    expect(gradeOfSemester('三年级上册')).toBe(3);
    expect(gradeOfSemester('六年级下册')).toBe(6);
  });

  it('初中七年级 ~ 九年级解析正确', () => {
    expect(gradeOfSemester('七年级上册')).toBe(7);
    expect(gradeOfSemester('八年级下册')).toBe(8);
    expect(gradeOfSemester('九年级上册')).toBe(9);
  });

  it('高中高一 ~ 高三解析为 10 ~ 12', () => {
    expect(gradeOfSemester('高一上册')).toBe(10);
    expect(gradeOfSemester('高二下册')).toBe(11);
    expect(gradeOfSemester('高三上册')).toBe(12);
  });

  it('解析不出时返回 null，不抛错也不猜', () => {
    expect(gradeOfSemester('全册')).toBeNull();
    expect(gradeOfSemester('')).toBeNull();
  });
});

describe('stageOfGrade', () => {
  it('1-6 小学 / 7-9 初中 / 10-12 高中', () => {
    for (let g = 1; g <= 6; g += 1) expect(stageOfGrade(g), `grade=${g}`).toBe('primary');
    for (let g = 7; g <= 9; g += 1) expect(stageOfGrade(g), `grade=${g}`).toBe('junior');
    for (let g = 10; g <= 12; g += 1) expect(stageOfGrade(g), `grade=${g}`).toBe('senior');
  });
});

describe('stageOfSemester（含回归用例）', () => {
  it('回归：一、二年级必须判为小学（旧实现误判为初中）', () => {
    expect(stageOfSemester('一年级上册')).toBe('primary');
    expect(stageOfSemester('二年级下册')).toBe('primary');
  });

  it('三 ~ 六年级为小学', () => {
    expect(stageOfSemester('三年级上册')).toBe('primary');
    expect(stageOfSemester('六年级下册')).toBe('primary');
  });

  it('七 ~ 九年级为初中', () => {
    expect(stageOfSemester('七年级上册')).toBe('junior');
    expect(stageOfSemester('九年级下册')).toBe('junior');
  });

  it('高中为 senior（旧实现无此学段）', () => {
    expect(stageOfSemester('高一上册')).toBe('senior');
    expect(stageOfSemester('高三下册')).toBe('senior');
  });
});

describe('stageLabel', () => {
  it('三个学段都有中文标签', () => {
    expect(stageLabel('primary')).toBe('小学');
    expect(stageLabel('junior')).toBe('初中');
    expect(stageLabel('senior')).toBe('高中');
  });
});

describe('stageOfTextbook（专题教材）', () => {
  it('从教材名判定学段', () => {
    expect(stageOfTextbook('小学公式专题')).toBe('primary');
    expect(stageOfTextbook('初中语法专题')).toBe('junior');
    expect(stageOfTextbook('高中数学专题')).toBe('senior');
  });

  it('非专题教材返回 null', () => {
    expect(stageOfTextbook('人教版')).toBeNull();
    expect(stageOfTextbook('')).toBeNull();
  });
});

describe('curriculumVersionOfTextbook', () => {
  it('从教材名识别版本', () => {
    expect(curriculumVersionOfTextbook('人教版')).toBe('人教版');
    expect(curriculumVersionOfTextbook('北师大版')).toBe('北师大版');
    expect(curriculumVersionOfTextbook('苏教版')).toBe('苏教版');
  });

  it('专题教材无版本时返回 null', () => {
    expect(curriculumVersionOfTextbook('小学公式专题')).toBeNull();
    expect(curriculumVersionOfTextbook('')).toBeNull();
  });
});

// 2026-09-19 事故：公式专题的册次一律叫「全册」，stageOfSemester 兜底成 junior，
// 于是学习页的公式分区永远指向「初中公式专题」，小学生看到的也是初中公式。
describe('stageOfSemesterWith（教材名优先）', () => {
  it('⚠️ 单独用 stageOfSemester 时，「全册」会被误判成初中（这是 bug 的根）', () => {
    expect(stageOfSemester('全册')).toBe('junior');
  });

  it('教材名带学段词时，以教材名为准', () => {
    expect(stageOfSemesterWith('全册', '小学公式专题')).toBe('primary');
    expect(stageOfSemesterWith('全册', '初中公式专题')).toBe('junior');
    expect(stageOfSemesterWith('全册', '高中公式专题')).toBe('senior');
  });

  it('普通教材不含学段词 → 回落册次名解析（现有场景零回归）', () => {
    expect(stageOfSemesterWith('三年级上册', '人教版')).toBe('primary');
    expect(stageOfSemesterWith('七年级下册', '人教版')).toBe('junior');
    expect(stageOfSemesterWith('一年级上册', '人教版')).toBe('primary');
  });

  it('两者都解析不出时，保持历史兜底行为（不是抛错）', () => {
    expect(stageOfSemesterWith('全册', '人教版')).toBe('junior');
  });
});
