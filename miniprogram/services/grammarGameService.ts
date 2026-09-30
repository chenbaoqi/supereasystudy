import { loadUnfixedKnowledgeIds } from './wrongQuestionService';
import { pickQuizPool } from '../core/quizPool';
// 语法闯关服务（二期）：复用极速选择引擎（计时/连击/速度奖励/结果登记），
// 但题源为「对应学段语法专题包」内 type='grammar' 知识点的内嵌 quiz（见 core/knowledge.ts）。
//
// 关键：语法点按学段组织于独立册次（小学语法专题 / 初中语法专题），与游戏入口所在的
// 「单词册次」不同。故先由转发的单词册次 id 反查册次名 → 推断学段 → 经 grammarPackService
// 解析语法册次 id（与 study.ts 课程视图的语法分区逻辑一致），再取其下所有章节的语法点。
import type { Knowledge } from '../core/knowledge';
import { knowledgeRepository, type KnowledgeRepository } from '../repositories/knowledgeRepository';
import { chapterRepository, type ChapterRepository } from '../repositories/chapterRepository';
import { semesterRepository, type SemesterRepository } from '../repositories/semesterRepository';
import { grammarPackService, createGrammarPackService } from './grammarPackService';
import {
  memoryGameRepository,
  type MemoryGameRepository,
} from '../repositories/memoryGameRepository';
import { reviewService } from './reviewService';
import { withinGrade } from './gradeScope';
import { gameResultStore, type GameResultDetail } from './gameResultStore';
import { buildGrammarQuestions, type ChoiceQuestion } from './quizLogic';
import { gameRewardService, walletViewOf, type RunRewarder } from './gameRewardService';
import { stageOfSemester, type SemesterStage } from '../utils/stage';

export interface GrammarGameStart {
  readonly eligible: boolean; // false = 无可用语法题（§13：提示暂无语法题）
  readonly questions: ChoiceQuestion[];
  readonly reason?: 'empty' | 'no-grammar-semester';
}

export interface GrammarFinishInput {
  readonly userId: string;
  readonly chapterId: string; // 游戏入口所在单词章节（记录归并与结果页回跳用）
  readonly questions: ChoiceQuestion[];
  readonly correctIds: string[];
  readonly wrongIds: string[]; // 答错 + 超时（§8 薄弱口径）
  readonly score: number;
  readonly responseTimes: number[]; // 每题反应毫秒（超时按满分限时计入）
}

const GRAMMAR_POOL_CAP = 20; // 单局限时题量上限（语法题干偏长，避免一局过长）

export interface GrammarGameServiceDeps {
  knowledgeRepository: KnowledgeRepository;
  chapterRepository: ChapterRepository;
  semesterRepository: SemesterRepository;
  grammarPackService: ReturnType<typeof createGrammarPackService>;
  memoryGameRepository: MemoryGameRepository;
  reviewResultApplier: {
    applyGameResults(
      userId: string,
      chapterId: string,
      wrongIds: string[],
      correctIds: string[],
    ): Promise<void>;
  };
  // 全站钱包入账（缺省 = 真实服务；单测可注入替身）
  rewarder?: RunRewarder;
  random?: () => number;
}

const shuffle = <T>(list: readonly T[], random: () => number): T[] =>
  [...list].sort(() => random() - 0.5);

export function createGrammarGameService(deps: GrammarGameServiceDeps) {
  const rewarder = deps.rewarder ?? gameRewardService;
  return {
    // ADR-012：末尾 grade 用于按当前年级过滤（语法/公式专题包是整学段词典），不传 = 不限年级
    async startGame(
      userId: string,
      wordSemesterId: string,
      grade: number | null = null,
    ): Promise<GrammarGameStart> {
      if (!wordSemesterId) return { eligible: false, questions: [], reason: 'empty' };
      // 1) 单词册次名 → 学段（小学/初中）
      const wordSemester = await deps.semesterRepository.getById(wordSemesterId);
      if (!wordSemester) return { eligible: false, questions: [], reason: 'empty' };
      // 学段：**优先读册次文档的 stage 显式字段**（core/semester.ts 里它就是权威来源），
      // 缺省才回落册次名解析。理由与 pages/study/study.ts 那次事故同源（2026-09-19）：
      // 册次名叫「全册」时 gradeOfSemester 解析不出年级，stageOfSemester 会兜底成 junior，
      // 于是专题包永远指到「初中」那一份。这里不查教材名——手上已经有册次文档，直接用它。
      const stage: SemesterStage = wordSemester.stage ?? stageOfSemester(wordSemester.name);
      // 2) 学段 → 语法专题包册次 id（找不到 → 该学段暂无语法分区）
      const grammarSemesterId = await deps.grammarPackService.resolveSemesterId(stage);
      if (!grammarSemesterId) {
        return { eligible: false, questions: [], reason: 'no-grammar-semester' };
      }
      // 3) 语法册次下全部章节 → 收集 type='grammar' 且带 quiz 的知识点
      // 与错题读取并行：错题只是锦上添花，串行等它会让开局多花一整轮云调用
      const [chapters, wrongIds] = await Promise.all([
        deps.chapterRepository.listBySemester(grammarSemesterId),
        loadUnfixedKnowledgeIds(userId),
      ]);
      const random = deps.random ?? Math.random;
      const grammarList: Knowledge[] = [];
      for (const chapter of chapters) {
        const list = withinGrade(await deps.knowledgeRepository.listByChapter(chapter._id), grade);
        for (const item of list) {
          if ((item.type ?? 'word') === 'grammar' && (item.quiz?.length ?? 0) > 0) {
            grammarList.push(item);
          }
        }
      }
      if (grammarList.length === 0) {
        return { eligible: false, questions: [], reason: 'empty' };
      }
      // 4) 展开每个语法点的 quiz[] → 四选一题目，超上限则随机抽题
      // L4：错过的语法点排到前面（语法专题是跨章的，这里就按「池子里的错题」优先）
      const ordered = pickQuizPool({
        pool: grammarList,
        wrongIds,
        size: grammarList.length,
        idOf: (item) => item._id,
        random,
      });
      const all = buildGrammarQuestions(ordered, random);
      const questions =
        all.length <= GRAMMAR_POOL_CAP ? all : shuffle(all, random).slice(0, GRAMMAR_POOL_CAP);
      return { eligible: true, questions };
    },

    async finishGame(input: GrammarFinishInput): Promise<GameResultDetail> {
      const totalMs = input.responseTimes.reduce((sum, ms) => sum + ms, 0);
      const avgResponseMs =
        input.responseTimes.length > 0 ? Math.round(totalMs / input.responseTimes.length) : 0;
      const record = await deps.memoryGameRepository.save({
        userId: input.userId,
        chapterId: input.chapterId,
        knowledgeIds: input.questions.map((q) => q.knowledgeId),
        score: input.score,
        correctCount: input.correctIds.length,
        wrongCount: input.wrongIds.length,
        duration: Math.round(totalMs / 1000),
        gameType: 'grammar',
        avgResponseMs,
      });
      const knowledgeList = await deps.knowledgeRepository.listByIds(
        input.questions.map((q) => q.knowledgeId),
      );
      const map = new Map(knowledgeList.map((item) => [item._id, item]));
      const pick = (ids: string[]): Knowledge[] =>
        ids.flatMap((id) => {
          const knowledge = map.get(id);
          return knowledge ? [knowledge] : [];
        });
      const detail: GameResultDetail = {
        gameType: 'grammar',
        record,
        mastered: pick(input.correctIds),
        weak: pick(input.wrongIds),
        correctIds: input.correctIds,
        wrongIds: input.wrongIds,
        avgResponseMs,
        replayUrl: '/pages/grammar-game/grammar-game',
        wallet: walletViewOf(
          await rewarder.reward({
            userId: input.userId,
            gameId: 'grammar',
            correct: input.correctIds.length,
            total: input.questions.length,
            attempts: { correctIds: input.correctIds, wrongIds: input.wrongIds },
          }),
        ),
        integrateToReview: async () => {
          // 注：语法点归属语法册次章节，此处 chapterId 仍用游戏入口的单词章节做记录归并
          // （复习功能 #5 仍在规划中，后续可改为按语法知识点单独建复习任务）。
          await deps.reviewResultApplier.applyGameResults(
            input.userId,
            input.chapterId,
            input.wrongIds,
            input.correctIds,
          );
        },
      };
      gameResultStore.set(detail);
      return detail;
    },
  };
}

export const grammarGameService = createGrammarGameService({
  knowledgeRepository,
  chapterRepository,
  semesterRepository,
  grammarPackService,
  memoryGameRepository,
  reviewResultApplier: reviewService,
});
