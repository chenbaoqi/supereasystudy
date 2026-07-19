import type { BaseEntity } from './base';

// 知识点（knowledge 集合）。字段依据 Chapter 04 §5 Study Detail 显式列出项（RULES §7 的字段依据）。
// 隐藏项（AI、图片、记忆法）按 §5 不建模；收藏是「用户×知识点」关系，不存本集合（见 pending D）。
export interface Knowledge extends BaseEntity {
  readonly chapterId: string; // 所属章节（§3 层级：Chapter → Knowledge）
  readonly word: string; // §5 Word
  readonly ipa?: string; // §5 音标
  readonly pronunciation?: string; // §5 发音音频 URL；无则隐藏（§8）
  readonly meaning: string; // §5 中文释义
  readonly partOfSpeech?: string; // §5 词性
  readonly example?: string; // §5 英文例句；无则隐藏（§8）
  readonly translation?: string; // §5 例句中文翻译
  readonly order: number; // 章节内排序（§5 Previous/Next 遍历的依据）
}
