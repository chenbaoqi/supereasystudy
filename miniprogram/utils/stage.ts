// 学段推断（Chapter 14 课程视图，V1 启发式：按册次名判断；
// 后续 semesters 增加 stage 字段后改为数据驱动）。
export type SemesterStage = 'primary' | 'junior';

export function stageOfSemester(semesterName: string): SemesterStage {
  // 小学：三/四/五/六年级；初中：七/八/九年级
  return /[三四五六]年级/.test(semesterName) ? 'primary' : 'junior';
}

// 册次名拆解（Owner 2026-07-31 教材选择模型：版本→年级→学期，数据不动展示层拆分）
// 「三年级上册」→ { grade: '三年级', term: '上册' }；「九年级全册」→ { grade: '九年级', term: '全册' }
export interface SemesterNameParts {
  readonly grade: string;
  readonly term: string;
}

export function parseSemesterName(semesterName: string): SemesterNameParts {
  const match = semesterName.match(/^(.+?年级)(.+)$/);
  if (!match || !match[1] || !match[2]) return { grade: semesterName, term: '' };
  return { grade: match[1], term: match[2] };
}
