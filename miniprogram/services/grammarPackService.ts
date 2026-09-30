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

// 学段 → 学习路径名映射（数据内容键）：专题教材命名约定 `${学段标签}${路径名}专题`。
// 例：小学+语法→小学语法专题；小学+公式→小学公式专题（英语/数学同构）。

// 学段 → 教材名前缀（与数据侧命名约定一致；高中此前映射为空串，属潜在 bug）
const STAGE_LABEL: Record<SemesterStage, string> = {
  primary: '小学',
  junior: '初中',
  senior: '高中',
};

export interface GrammarPackServiceDeps {
  subjectRepository: SubjectRepository;
  learningPathRepository: LearningPathRepository;
  textbookRepository: TextbookRepository;
  semesterRepository: SemesterRepository;
}

// 专题册次 id 的**内存缓存**（key = 学科|路径|学段）。
//
// 为什么必须缓存：`resolveSemesterIdByPath` 一次要串行查 4 次云
// （listAll → listBySubject → listByLearningPath → listByTextbook → listBySemester），
// 而「英语+语法+初中」这种组合的结果是**永远不变**的。
// 学习页每次 onShow 都调它一次，等于每次切回学习 tab 都要白等 4 轮云调用——
// 这就是「打开页面很慢」的最大一块。
//
// ⚠️ 刻意只做内存缓存、**不落本机存储**：resetAndImport 重建数据后册次 id 会变，
//    落盘会拿到失效 id（页面显示空白）。内存缓存随小程序重启失效，最坏情况只是第一次慢，
//    绝不会读到陈旧数据。
export function createGrammarPackService(deps: GrammarPackServiceDeps) {
  // 缓存挂在**实例**上而不是模块级：挂在模块级会让不同单测共用一个缓存互相污染
  const cache = new Map<string, string | null>();
  return {
    // 学段 → 语法专题包册次 id（找不到返回 null，页面按「无语法分区」处理）
    async resolveSemesterId(stage: SemesterStage): Promise<string | null> {
      const subjects = await deps.subjectRepository.listAll();
      const english = subjects.find((item) => item.open); // V1 唯一开放学科（向后兼容）
      if (!english) return null;
      return this.resolveSemesterIdByPath(english._id, '语法', stage);
    },

    // 通用：按学科 + 学习路径名 + 学段解析专题册次 id。
    // 英语「语法」/ 数学「公式」等专题路径复用，消除 subjects.find(open) 单科假设。
    // textbook 命名约定：`${学段标签}${路径名}专题`（小学语法专题 / 小学公式专题…）。
    async resolveSemesterIdByPath(
      subjectId: string,
      pathName: string,
      stage: SemesterStage,
    ): Promise<string | null> {
      const cacheKey = `${subjectId}|${pathName}|${stage}`;
      const cached = cache.get(cacheKey);
      if (cached !== undefined) return cached;

      const paths = await deps.learningPathRepository.listBySubject(subjectId);
      const path = paths.find((item) => item.name === pathName);
      if (!path) {
        cache.set(cacheKey, null);
        return null;
      }
      const textbooks = await deps.textbookRepository.listByLearningPath(path._id);
      const stageLabel = STAGE_LABEL[stage]; // 高中必须拼「高中公式专题」，空串会永远匹配不上
      const textbookName = `${stageLabel}${pathName}专题`;
      const target = textbooks.find((item) => item.name === textbookName);
      if (!target) {
        cache.set(cacheKey, null);
        return null;
      }
      const semesters = await deps.semesterRepository.listByTextbook(target._id);
      const id = semesters[0]?._id ?? null;
      cache.set(cacheKey, id);
      return id;
    },
  };
}

export const grammarPackService = createGrammarPackService({
  subjectRepository,
  learningPathRepository,
  textbookRepository,
  semesterRepository,
});
