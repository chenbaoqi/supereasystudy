// 年级服务（Owner 2026-07-31 教材选择模型：版本→年级→学期）。
// 年级从册次名派生（数据不动，展示层拆分）：「三年级上册」→ 年级「三年级」。
import { semesterRepository, type SemesterRepository } from '../repositories/semesterRepository';
import { parseSemesterName } from '../utils/stage';

export interface GradeServiceDeps {
  semesterRepository: SemesterRepository;
}

export function createGradeService(deps: GradeServiceDeps) {
  return {
    // 某教材下的年级列表（按册次顺序去重派生，如：三年级/四年级/…/九年级）
    async listGrades(textbookId: string): Promise<string[]> {
      const semesters = await deps.semesterRepository.listByTextbook(textbookId);
      const grades: string[] = [];
      for (const semester of semesters) {
        const { grade } = parseSemesterName(semester.name);
        if (grade && !grades.includes(grade)) grades.push(grade);
      }
      return grades;
    },

    // 某教材某年级下的学期列表（如：三年级 → 三年级上册/三年级下册）
    async listSemestersByGrade(textbookId: string, grade: string) {
      const semesters = await deps.semesterRepository.listByTextbook(textbookId);
      return semesters.filter((semester) => parseSemesterName(semester.name).grade === grade);
    },
  };
}

export const gradeService = createGradeService({ semesterRepository });
