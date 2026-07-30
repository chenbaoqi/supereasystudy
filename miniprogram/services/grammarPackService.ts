// 语法专题包解析服务（Chapter 14 §4 课程视图）：
// 按学段（小学/初中）解析对应语法专题包的册次 id，供学习 tab 展示语法分区。
import {
  learningPathRepository,
  type LearningPathRepository,
} from '../repositories/learningPathRepository';
import { semesterRepository, type SemesterRepository } from '../repositories/semesterRepository';
import { subjectRepository, type SubjectRepository } from '../repositories/subjectRepository';
import { textbookRepository, type TextbookRepository } from '../repositories/textbookRepository';
import type { SemesterStage } from '../utils/stage';

// 学段 → 语法专题包教材名（数据内容键，来自 grammar CSV 的教材命名）
const GRAMMAR_TEXTBOOK_BY_STAGE: Record<SemesterStage, string> = {
  primary: '小学语法专题',
  junior: '初中语法专题',
};

export interface GrammarPackServiceDeps {
  subjectRepository: SubjectRepository;
  learningPathRepository: LearningPathRepository;
  textbookRepository: TextbookRepository;
  semesterRepository: SemesterRepository;
}

export function createGrammarPackService(deps: GrammarPackServiceDeps) {
  return {
    // 学段 → 语法专题包册次 id（找不到返回 null，页面按「无语法分区」处理）
    async resolveSemesterId(stage: SemesterStage): Promise<string | null> {
      const subjects = await deps.subjectRepository.listAll();
      const english = subjects.find((item) => item.open); // V1 唯一开放学科
      if (!english) return null;
      const paths = await deps.learningPathRepository.listBySubject(english._id);
      const grammarPath = paths.find((item) => item.name === '语法');
      if (!grammarPath) return null;
      const textbooks = await deps.textbookRepository.listByLearningPath(grammarPath._id);
      const target = textbooks.find((item) => item.name === GRAMMAR_TEXTBOOK_BY_STAGE[stage]);
      if (!target) return null;
      const semesters = await deps.semesterRepository.listByTextbook(target._id);
      return semesters[0]?._id ?? null;
    },
  };
}

export const grammarPackService = createGrammarPackService({
  subjectRepository,
  learningPathRepository,
  textbookRepository,
  semesterRepository,
});
