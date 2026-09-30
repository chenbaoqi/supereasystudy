// 教材选择（2026-09-13 IA 调整：教材是最顶层选择项）。
//
// 为什么需要这一层：一个学科的教材**分散挂在多条 learning_path 下**——
// 「人教版」在知识点路径下，「小学公式专题」在公式路径下。
// 按学科汇总时不能把这些一股脑都给用户挑：学生的心智是「我上人教版、一年级上册」，
// 没人会说「我在上小学公式专题」。所以一级入口只列真正的教材。
//
// 判据用数据里现成的字段，不新增结构（Owner 2026-09-13 明确：后面会上很多教材，
// 教材层是长期的一级选择，所以判据必须扛得住数据变多、变杂）：
//   1) 专题包不带 curriculumVersion（真正的教材带：人教版 / 北师大版 …）
//   2) 双保险：名称形如「小学公式专题」的一律算专题包
//      —— 防止将来录入不规范（给专题包也填上 curriculumVersion）时混进教材层。
//
// 专题包不进一级入口 ≠ 用户拿不到：选完册次后，学习页会按学段
// 自动把对应专题包作为「公式 / 语法」分区带出来（见 grammarPackService.resolveSemesterIdByPath）。
import type { Textbook } from '../core/textbook';
import {
  learningPathRepository,
  type LearningPathRepository,
} from '../repositories/learningPathRepository';
import { textbookRepository, type TextbookRepository } from '../repositories/textbookRepository';

export interface TextbookPickerDeps {
  learningPathRepository: LearningPathRepository;
  textbookRepository: TextbookRepository;
}

// 是否专题包（跨册次的汇总本），而非按册次学的教材
export function isTopicPack(item: Textbook): boolean {
  if (!item.curriculumVersion) return true;
  return item.name.includes('专题');
}

export function createTextbookPicker(deps: TextbookPickerDeps) {
  return {
    // 该学科可选的教材（已排除专题包）。教材为空时兜底返回全部，避免学科下出现空页。
    async listTextbooks(subjectId: string): Promise<Textbook[]> {
      const paths = await deps.learningPathRepository.listBySubject(subjectId);
      const groups = await Promise.all(
        paths.map((path) => deps.textbookRepository.listByLearningPath(path._id)),
      );
      const all = groups.flat();
      const textbooks = all.filter((item) => !isTopicPack(item));
      const picked = textbooks.length > 0 ? textbooks : all;
      // 跨路径合并后 order 会重复，故再按名称稳定排序
      return [...picked].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'zh'));
    },
  };
}

export const textbookPicker = createTextbookPicker({
  learningPathRepository,
  textbookRepository,
});
