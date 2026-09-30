// 选题池（L4）：让「错过的知识点」在下一局游戏里优先再出现一次。
//
// 为什么需要它：L3 把游戏结果写进了错题本，但错题只是**记下来**，并不会主动再练。
// 错题本不是收藏夹——补弱要让它再出现、再被做对一次，这条链才闭环。
//
// ⚠️ 刻意只做「同章优先」：游戏是从「某一章 → 挑战」进入的，池子本来就是这一章的知识点。
//    跨章把别的章的错题塞进来，会让孩子学着第三章时突然跳回第一章的题——
//    「错题要复习」和「这一局属于这一章」冲突时，后者优先。
//    跨章复习由错题本页负责（另行引导），不在这里做。
//
// 纯函数 + 注入 random：可单测，不碰云。
export interface QuizPoolInput<T> {
  /** 本局可用的知识点（已按年级过滤过） */
  readonly pool: readonly T[];
  /** 未修复错题的知识点 id（来自 user_wrong_questions） */
  readonly wrongIds: readonly string[];
  /** 本局要几题 */
  readonly size: number;
  readonly idOf: (item: T) => string;
  readonly random: () => number;
}

export function pickQuizPool<T>(input: QuizPoolInput<T>): T[] {
  const { pool, wrongIds, size, idOf, random } = input;
  if (size <= 0 || pool.length === 0) return [];

  const wrongSet = new Set(wrongIds);
  const wrong: T[] = [];
  const rest: T[] = [];
  for (const item of pool) {
    // 池子里**确实存在**的错题才算：错题可能属于别的章，这里取交集
    if (wrongSet.has(idOf(item))) wrong.push(item);
    else rest.push(item);
  }

  const shuffledWrong = shuffle(wrong, random);
  const shuffledRest = shuffle(rest, random);

  // 错题优先：先把错题排满，不够再用其它知识点补
  const picked = [...shuffledWrong, ...shuffledRest];
  return picked.slice(0, size);
}

// 洗牌放在这里而不是各游戏各写一份：memoryGame 等已经有一份 shuffle，
// 但那份在 service 层；core 层要能单测，所以自带一份（Fisher-Yates）。
export function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    if (j < 0 || j > i) continue;
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}
