// AI 辅导上下文的「交接区」（内存级，不落库）。
//
// 为什么需要它，而不是全塞进 URL：
//   答错后要把「题干 + 4 个选项 + 学生答案 + 正确答案 + 3 级提示」一起交给 AI 页。
//   中文走 encodeURIComponent 后每个字 9 个字符（%E4%B8%AD），这一坨轻松上千字符，
//   既逼近 navigateTo 的 URL 长度上限，也会在真机调试里变成一串没法读的地址。
//   更重要的是：选项是数组，塞 URL 得自己定分隔符再拆回来，纯属给自己埋坑。
//
// 为什么不用全局存储 / storage：
//   这是一次性的导航交接，用完即焚。落 storage 会留下脏数据（下次直接进 AI 页会读到上次的题）。
//   内存单例的代价只有一个：小程序被系统回收后交接丢失——那时 URL 参数仍在，页面照旧可用。
//
// 因此它是**增强**而非依赖：ai-tutor 页优先取 handoff，取不到就退回 URL 参数。
import type { AiTutorContext } from '../core/ai';

export interface AiTutorHandoff {
  readonly context: AiTutorContext;
  // 题目自带的程序化提示（轻→分步→完整），AI 不可用时的兜底来源
  readonly hints: readonly string[];
}

export interface AiTutorHandoffStore {
  set(value: AiTutorHandoff): void;
  // 取走即清空：同一次交接不该被两个页面消费
  take(): AiTutorHandoff | null;
  clear(): void;
}

export function createAiTutorHandoff(): AiTutorHandoffStore {
  let pending: AiTutorHandoff | null = null;
  return {
    set(value) {
      pending = value;
    },
    take() {
      const value = pending;
      pending = null;
      return value;
    },
    clear() {
      pending = null;
    },
  };
}

export const aiTutorHandoff: AiTutorHandoffStore = createAiTutorHandoff();
