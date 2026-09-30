// 试卷规则预设（需求第三十二章 测试系统）。
//
// 重要：本文件是**加法**，不改动 config/testPaper.ts 的 TEST_PAPER_CONFIG。
// 英语现有组卷逻辑（testService.ts）继续走原配置，零回归风险。
// 待数学/新测试类型接入后，再决定是否把 testService 迁移到本规则引擎。

import type { Difficulty } from '../core/question';

// 测试类型（需求第三十二章列举的 11 种）
export type TestPaperType =
  | 'after_lesson' // 课后小测
  | 'knowledge' // 知识点测试
  | 'unit' // 单元测试
  | 'stage' // 阶段测试
  | 'midterm' // 期中
  | 'final' // 期末
  | 'special' // 专项测试
  | 'smart' // 智能测试
  | 'wrong_retest' // 错题重测
  | 'zhongkao' // 中考模拟
  | 'gaokao'; // 高考模拟（B 范围不含高中，仅预留）

export const TEST_PAPER_TYPE_LABEL: Record<TestPaperType, string> = {
  after_lesson: '课后小测',
  knowledge: '知识点测试',
  unit: '单元测试',
  stage: '阶段测试',
  midterm: '期中',
  final: '期末',
  special: '专项测试',
  smart: '智能测试',
  wrong_retest: '错题重测',
  zhongkao: '中考模拟',
  gaokao: '高考模拟',
};

export interface PaperRule {
  readonly type: TestPaperType;
  readonly total: number; // 题量
  readonly difficultyRange?: readonly [Difficulty, Difficulty]; // 允许难度区间，缺省不限制
  // 单个知识点最多出几题——保证覆盖广度，避免整卷都砸在一个点上
  readonly maxPerKnowledgePoint?: number;
  // 错题占比 0-1：1 表示全部取自错题（错题重测）
  readonly wrongRatio?: number;
  // 是否按掌握度自适应选题（需求第三十三章）
  readonly adaptive?: boolean;
}

// 预设：题量与配比均为经验值，后续按实测调整
export const PAPER_RULES: Record<TestPaperType, PaperRule> = {
  after_lesson: { type: 'after_lesson', total: 5, adaptive: true, maxPerKnowledgePoint: 2 },
  knowledge: { type: 'knowledge', total: 8, adaptive: true, maxPerKnowledgePoint: 3 },
  // 与英语现状（TEST_PAPER_CONFIG.total = 10）保持一致，便于将来对齐
  unit: { type: 'unit', total: 10, adaptive: false, maxPerKnowledgePoint: 2 },
  stage: { type: 'stage', total: 20, adaptive: true, maxPerKnowledgePoint: 3 },
  midterm: { type: 'midterm', total: 25, adaptive: false, maxPerKnowledgePoint: 3 },
  final: { type: 'final', total: 30, adaptive: false, maxPerKnowledgePoint: 3 },
  special: { type: 'special', total: 10, adaptive: true, maxPerKnowledgePoint: 5 },
  smart: { type: 'smart', total: 10, adaptive: true, wrongRatio: 0.3, maxPerKnowledgePoint: 2 },
  wrong_retest: { type: 'wrong_retest', total: 10, wrongRatio: 1, adaptive: true },
  zhongkao: { type: 'zhongkao', total: 25, adaptive: false, maxPerKnowledgePoint: 3 },
  // B 范围不含高中，仅占位，不投喂高中题目
  gaokao: { type: 'gaokao', total: 25, adaptive: false, maxPerKnowledgePoint: 3 },
};

// 自适应权重（需求第三十三章：掌握度 / 历史错误 / 题目难度 / 近期表现）。
// 固定权重、可解释；不用黑箱模型，便于按实测数据回归调参。
export const ADAPTIVE_WEIGHTS = {
  need: 0.4, // 掌握度越低越该练
  wrong: 0.25, // 错过的优先重考
  recency: 0.15, // 久未练的优先
  difficultyFit: 0.2, // 难度贴合当前水平
} as const;
