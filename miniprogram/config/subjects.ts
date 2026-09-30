// 学科 UI 配置（数据驱动：新增学科只改这里 + 数据侧 learning_paths）。
// 学习 tab「我的课程」与游戏中心据此渲染分区标题/图标/专题路径名，不写死任何学科名。
export interface SubjectUiConfig {
  readonly mainLabel: string; // 主分区标题（英语=单词，数学=概念）
  readonly mainIcon: string; // 主分区图标字（英语=词，数学=概）
  readonly mainIconClass: string; // 主分区图标样式类（对应 study.wxss）
  readonly mainUnit: string; // 主分区计数单位（单元/专题…）
  readonly topicLabel: string; // 专题分区标题（英语=语法，数学=公式）
  readonly topicIcon: string; // 专题分区图标字（英语=法，数学=式）
  readonly topicIconClass: string; // 专题分区图标样式类
  readonly topicUnit: string; // 专题分区计数单位
  readonly topicPathName: string; // 专题学习路径名（解析专题册次用，须与数据一致）
  // 是否启用语音能力（发音按钮 / 听力题 / TTS）。
  // 仅语言类学科需要：英语单词靠听、靠读；数学等学科的概念/公式朗读无意义
  // （而且 TTS 固定 en_US，念中文数字只会念出一串乱码）。关闭后：
  // 学习详情不显示「🔊 发音」，测试卷不生成听力 Section（题量补给普通题，总题量不变）。
  readonly supportsSpeech: boolean;
}

const SUBJECT_UI: Record<string, SubjectUiConfig> = {
  英语: {
    mainLabel: '单词',
    mainIcon: '词',
    mainIconClass: 'word',
    mainUnit: '单元',
    topicLabel: '语法',
    topicIcon: '法',
    topicIconClass: 'grammar',
    topicUnit: '专题',
    topicPathName: '语法',
    supportsSpeech: true,
  },
  数学: {
    mainLabel: '概念',
    mainIcon: '概',
    mainIconClass: 'concept',
    mainUnit: '单元',
    topicLabel: '公式',
    topicIcon: '式',
    topicIconClass: 'formula',
    topicUnit: '专题',
    topicPathName: '公式',
    supportsSpeech: false,
  },
  物理: {
    mainLabel: '知识',
    mainIcon: '物',
    mainIconClass: 'concept',
    mainUnit: '单元',
    // 物理暂不做专题分区（按教材册次线性组织）；topicPathName 指向不存在的路径，
    // 学习页 resolveSemesterIdByPath 会返回 null → 不渲染专题分区，零报错。
    topicLabel: '实验',
    topicIcon: '验',
    topicIconClass: 'formula',
    topicUnit: '专题',
    topicPathName: '实验',
    supportsSpeech: false,
  },
};

// 缺省回退到英语配置（未知学科不致崩，但应同步在数据中命名一致）
const DEFAULT_UI: SubjectUiConfig = SUBJECT_UI['英语'] as SubjectUiConfig;

export function getSubjectUiConfig(subjectName: string): SubjectUiConfig {
  const found = SUBJECT_UI[subjectName];
  return found ?? DEFAULT_UI;
}

// 学科配色主题（UI v1「清爽蓝」）：返回 tokens.wxss 中 --subject-* 的键名，
// 页面据此拼 class（如 u-subject-en），色值仍统一由令牌文件维护。
// 与 SubjectUiConfig 分开是刻意为之：配色属于视觉层，新增学科只改这张表即可，
// 不触碰学习/专题分区的业务配置。
export type SubjectThemeKey = 'en' | 'math' | 'cn' | 'default';

const SUBJECT_THEME: Record<string, SubjectThemeKey> = {
  英语: 'en',
  数学: 'math',
  语文: 'cn',
};

export function getSubjectTheme(subjectName: string): SubjectThemeKey {
  return SUBJECT_THEME[subjectName] ?? 'default';
}
