import type { BaseEntity } from './base';
import type { QuestionVisual } from './visual';

// 知识类型（Chapter 12 §3：Everything is Knowledge，单集合多形态）。
// 历史单词数据无 type 字段，缺省按 'word' 理解（字段只增不改，RULES §7）。
// 英语：word=单词 / grammar=语法点；数学（模型分层）：concept=概念 / formula=公式定理（带 quiz 逻辑题）。
export type KnowledgeType = 'word' | 'grammar' | 'concept' | 'formula';

// 语法专项练习题（Chapter 13 Q2：内嵌于 type='grammar' 的 Knowledge）。
// 内容为 AI 骨架待校对（scripts/assets/grammar-quiz-draft.csv）。
export interface GrammarQuizItem {
  readonly stem: string; // 题干（如 "He ___ to school every day."）
  readonly options: string[]; // 4 个选项
  readonly answerIndex: number; // 正确选项下标（0-3）
  // 可选的题目配图（B-7 可视化闭环）：声明这道题要画什么。
  // 类型是弱校验的 JSON，渲染前必须过 `visualOf()` —— 不认识的类型不画，也不报错。
  readonly visual?: QuestionVisual;
}

// 知识点（knowledge 集合）。字段依据 Chapter 04 §5 Study Detail 显式列出项（RULES §7 的字段依据）。
// 隐藏项（AI、图片、记忆法）按 §5 不建模；收藏是「用户×知识点」关系，不存本集合（见 pending D）。
export interface Knowledge extends BaseEntity {
  readonly type?: KnowledgeType; // 知识类型（Chapter 12：word=单词，grammar=语法点）
  readonly chapterId: string; // 所属章节（§3 层级：Chapter → Knowledge）
  readonly word: string; // §5 Word；type=grammar 时为语法点名称（如「一般现在时」）
  readonly ipa?: string; // §5 音标
  readonly pronunciation?: string; // §5 发音音频 URL；无则隐藏（§8）
  readonly meaning: string; // §5 中文释义；type=grammar 时为一句话简述
  readonly explanation?: string; // 详细讲解（Chapter 12：type=grammar 时的结构公式+用法说明）
  readonly quiz?: GrammarQuizItem[]; // 专项练习题（Chapter 13 Q2：type=grammar 时挂载）
  readonly partOfSpeech?: string; // §5 词性
  readonly example?: string; // §5 英文例句；无则隐藏（§8）
  readonly translation?: string; // §5 例句中文翻译
  readonly order: number; // 章节内排序（§5 Previous/Next 遍历的依据）
  // 适用年级（1-12，2026-09-13 ADR-012）。仅「跨年级专题包」的知识点需要写：
  // 如数学公式专题、语法专题这类整学段词典，靠它按当前年级过滤超纲内容。
  // 按册次组织的常规知识点（如「一年级上册 / 5以内数的认识」）本身已限定年级，无需此字段。
  // 缺省（undefined）= 不限年级，任何年级都展示 —— 保证旧数据零回归。
  readonly grade?: number;
}
