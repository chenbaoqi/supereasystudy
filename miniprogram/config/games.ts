// 游戏中心游戏清单（配置化：新增/调整游戏只改这里，不碰 WXML）。
// 与项目范式一致（参考 config/features.ts 集中配置）。
// type 含 'grammar'（二期语法闯关，题源为语法专题包内嵌 quiz，已上线）。
// 注：'drill'（数学速算）2026-09-16 下线归档（与口算冒险岛重复），见 _archive-math-drill/RESTORE.md。
// subjects 为「适用学科」允许名单；缺省=全学科。例：听音找词仅英语（数学无发音），
// 小蜜蜂仅英语（英文拼字），口算冒险岛仅数学。
import type { MemoryGameType } from '../core/memoryGame';

export type GameType =
  'memory' | 'speed' | 'listening' | 'shooter' | 'grammar' | 'island' | 'scene';

export interface GameDef {
  id: string;
  name: string;
  desc: string;
  url: string;
  type: GameType;
  // 列表页左侧圆形图标（emoji，UI v1.1 起必填：纯文字列表扫读慢）
  icon: string;
  // 适用学科名称（与 subjects 集合的 name 字段一致）；缺省表示全学科通用
  subjects?: readonly string[];
  // ⚠️ 战绩记录里写的 gameType（memory_game_records.gameType）**不总等于 id**：
  //    消消乐 id 是 'memory'，但记录里写的是 'match'（Chapter 07 先定的字段名）。
  //    缺省 = 与 id 同名，只有不一致的游戏才需要显式写。
  recordType?: MemoryGameType;
}

// gameType → 游戏定义。**这是全项目唯一一处做这层对齐的地方**，别在别处再写一遍。
export function gameByRecordType(type: MemoryGameType): GameDef | undefined {
  return GAMES.find((g) => (g.recordType ?? g.id) === type);
}

export const GAMES: readonly GameDef[] = [
  {
    id: 'memory',
    name: '消消乐',
    desc: '点选「单词 + 释义」配对消除，60 秒全部清空',
    url: '/pages/memory-game/memory-game',
    type: 'memory',
    icon: '🧩',
    recordType: 'match', // 记录里写的是 'match'（Chapter 07 定的字段名），与 id 不同
  },
  {
    id: 'speed',
    name: '极速选择',
    desc: '每题 5 秒快答，速度就是分数',
    url: '/pages/speed-choice/speed-choice',
    type: 'speed',
    icon: '⚡',
  },
  {
    id: 'listen',
    name: '听音找词',
    desc: '听发音选单词，训练听力辨识',
    url: '/pages/listen-find/listen-find',
    type: 'listening',
    icon: '🎧',
    subjects: ['英语'],
  },
  {
    id: 'shooter',
    name: '小蜜蜂',
    desc: '键盘敲英文，射击中文方块',
    url: '/pages/space-shooter/space-shooter',
    type: 'shooter',
    icon: '🐝',
    subjects: ['英语'],
  },
  {
    id: 'grammar',
    name: '语法闯关',
    desc: '语法点专项四选一，限时快答巩固语法',
    url: '/pages/grammar-game/grammar-game',
    type: 'grammar',
    icon: '🔤',
    subjects: ['英语'],
  },
  {
    id: 'island',
    name: '口算冒险岛',
    desc: '闯 7 关拿星星，收集胡萝卜、战巨龙',
    url: '/pages/math-island/math-island',
    type: 'island',
    icon: '🗺️',
    subjects: ['数学'],
  },
  {
    id: 'scene',
    name: '情景闯关',
    desc: '超市、分东西、问路……一关一个生活故事',
    url: '/pages/scene-quest/scene-quest',
    type: 'scene',
    icon: '🎬',
    // 数学与英语都有情景题；页面里再按当前学科过滤（学科由 userService 决定）。
    subjects: ['数学', '英语'],
  },
];
