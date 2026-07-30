// 学段推断（Chapter 14 课程视图，V1 启发式：按册次名判断；
// 后续 semesters 增加 stage 字段后改为数据驱动）。
// 年级/册次合并（Owner 2026-07-31 修订：版本→册次两步，不拆年级）。
export type SemesterStage = 'primary' | 'junior';

export function stageOfSemester(semesterName: string): SemesterStage {
  // 小学：三/四/五/六年级；初中：七/八/九年级
  return /[三四五六]年级/.test(semesterName) ? 'primary' : 'junior';
}
