// 数学速算服务（二期·数学学科游戏）：生成四则运算题 + 结算登记。
// 题面与答案由纯函数 generateProblem 产出（可单测）；计时/计分在页面层复用极速选择引擎。
// 速算不绑定具体知识点（街机式心算训练），故结果 recorded knowledgeIds 为空。
import type { SemesterStage } from '../utils/stage';
import {
  memoryGameRepository,
  type MemoryGameRepository,
} from '../repositories/memoryGameRepository';
import { gameResultStore, type GameResultDetail } from './gameResultStore';
import { DRILL_TOTAL } from '../config/gameRules';

export type DrillOp = '+' | '-' | '×' | '÷';

export interface DrillProblem {
  readonly text: string; // 题面（如 "37 + 48"）
  readonly answer: number; // 正确答案（恒为非负整数）
  readonly op: DrillOp;
  readonly operands: readonly [number, number];
}

const PRIMARY_OPS: readonly DrillOp[] = ['+', '-', '×', '÷'];
const JUNIOR_OPS: readonly DrillOp[] = ['+', '-', '×', '÷'];

function randInt(min: number, max: number, random: () => number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)]!;
}

// 纯函数：按学段生成一道四则运算题。小学/初中在数值范围与难度上区分；
// 除法保证整除（先定商与除数再反推被除数），减法保证非负。
export function generateProblem(
  stage: SemesterStage,
  random: () => number = Math.random,
): DrillProblem {
  const op = stage === 'primary' ? pick(PRIMARY_OPS, random) : pick(JUNIOR_OPS, random);
  let a = 0;
  let b = 0;
  let answer = 0;
  if (stage === 'primary') {
    if (op === '+') {
      a = randInt(1, 50, random);
      b = randInt(1, 50, random);
      answer = a + b;
    } else if (op === '-') {
      a = randInt(1, 50, random);
      b = randInt(1, a, random);
      answer = a - b;
    } else if (op === '×') {
      a = randInt(2, 9, random);
      b = randInt(2, 9, random);
      answer = a * b;
    } else {
      b = randInt(2, 9, random);
      answer = randInt(2, 9, random);
      a = b * answer;
    }
  } else {
    if (op === '+') {
      a = randInt(10, 200, random);
      b = randInt(10, 200, random);
      answer = a + b;
    } else if (op === '-') {
      a = randInt(50, 300, random);
      b = randInt(10, a, random);
      answer = a - b;
    } else if (op === '×') {
      a = randInt(2, 20, random);
      b = randInt(2, 20, random);
      answer = a * b;
    } else {
      b = randInt(2, 15, random);
      answer = randInt(2, 20, random);
      a = b * answer;
    }
  }
  return { text: `${a} ${op} ${b}`, answer, op, operands: [a, b] };
}

export interface DrillStart {
  readonly problems: DrillProblem[];
}

export interface DrillFinishInput {
  readonly userId: string;
  readonly chapterId: string;
  readonly score: number;
  readonly correctCount: number;
  readonly wrongCount: number;
  readonly responseTimes: number[]; // 每题反应毫秒（超时按满分限时计入）
}

export interface MathDrillServiceDeps {
  memoryGameRepository: MemoryGameRepository;
}

export function createMathDrillService(deps: MathDrillServiceDeps) {
  return {
    // 开局生成一池题目（纯计算，无云依赖）
    startGame(
      stage: SemesterStage,
      total: number = DRILL_TOTAL,
      random: () => number = Math.random,
    ): DrillStart {
      const problems: DrillProblem[] = [];
      for (let i = 0; i < total; i += 1) problems.push(generateProblem(stage, random));
      return { problems };
    },

    async finishGame(input: DrillFinishInput): Promise<GameResultDetail> {
      const totalMs = input.responseTimes.reduce((sum, ms) => sum + ms, 0);
      const avgResponseMs =
        input.responseTimes.length > 0 ? Math.round(totalMs / input.responseTimes.length) : 0;
      const record = await deps.memoryGameRepository.save({
        userId: input.userId,
        chapterId: input.chapterId,
        knowledgeIds: [],
        score: input.score,
        correctCount: input.correctCount,
        wrongCount: input.wrongCount,
        duration: Math.round(totalMs / 1000),
        gameType: 'drill',
        avgResponseMs,
      });
      const detail: GameResultDetail = {
        gameType: 'drill',
        record,
        mastered: [],
        weak: [],
        correctIds: [],
        wrongIds: [],
        avgResponseMs,
        replayUrl: '/pages/math-drill/math-drill',
        integrateToReview: async () => {
          /* 速算不绑定知识点，无复习归并 */
        },
      };
      gameResultStore.set(detail);
      return detail;
    },
  };
}

export const mathDrillService = createMathDrillService({ memoryGameRepository });
