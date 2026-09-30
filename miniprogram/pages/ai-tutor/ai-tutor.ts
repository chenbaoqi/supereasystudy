// AI 辅导页（需求第三十八章「AI 学习助手」/ 第三十九章「AI 只解释、不判分」）。
//
// 分层：Page → Service(aiTutorService) → Repository → 云函数 aiTutor。
// **本页不读数据库**，理由有两条：
//   1. 上下文本来就在上游页面手里——学习详情页有当前知识点、测试页有题干与选项。
//      再查一次库既多余，又可能查错：用户在学习详情页按「上一条」回看时，
//      learning_records.currentKnowledgeId 已经不是眼前这张卡了。
//   2. 零 Repository 依赖 → AI 不可用时页面本身依然完整可用（只降级文案，不降级界面）。
//
// 降级：AI 未配置 / 超时 / 报错都不抛给用户，一律走 aiTutorService 的程序化兜底文案，
// 保证「按钮永远有反应」（第三十八章硬要求）。降级时气泡下方会标「程序化提示」，
// 不把兜底文案冒充成 AI 说的。
import type { AiTutorAction, AiTutorContext } from '../../core/ai';
import type { AiQuickAction } from '../../services/aiTutorActions';
import { buildQuickActions, greetingText, sceneOf } from '../../services/aiTutorActions';
import { aiTutorHandoff } from '../../services/aiTutorHandoff';
import { contextMetaLines, mergeContext } from '../../services/aiTutorQuestion';
import { aiTutorService } from '../../services/aiTutorService';
import { listSubjectNames } from '../../services/subjectResolver';
import { FEATURE_FLAGS } from '../../config/features';
import { stageOfGrade } from '../../utils/stage';

interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'ai';
  readonly text: string;
  readonly source?: 'ai' | 'fallback' | 'error';
  readonly pending?: boolean;
}

Page({
  data: {
    contextTitle: '',
    contextDesc: '',
    // 选项 / 你选了 / 正确答案——答错进来时这三条必须有，否则学生怀疑 AI 看不见题
    contextMeta: [] as string[],
    quickActions: [] as AiQuickAction[],
    messages: [] as ChatMessage[],
    inputText: '',
    sending: false,
    scrollTo: '',
    // 非空则顶部显示提示条（AI 未配置 / 连不上）
    statusText: '',
    // 学科切换（仅自由问答场景）：空串 = 不限。2026-09-13 Owner 反馈
    // 「进去默认数学，这个就不用默认了吧」——学科改成用户自己点，不预设
    showSubjectPicker: false,
    subjectChips: [] as string[],
    activeSubject: '',
  },

  context: {} as AiTutorContext,
  // 三级程序化提示：由上游页面（测试页）经 aiTutorHandoff 交过来，AI 不可用时兜底用
  hints: [] as readonly string[],
  // 已给过的提示（需求第三十八章：避免 AI 反复说同一句）
  hintsUsed: [] as string[],
  seq: 0,

  onLoad(query: Record<string, string>) {
    if (!FEATURE_FLAGS.aiTutor) {
      // 开关关掉时不留半残页面
      wx.showToast({ title: 'AI 辅导暂未开放', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    const decode = (value?: string): string => (value ? decodeURIComponent(value) : '');
    const subjectName = decode(query.subjectName);
    const knowledgeTitle = decode(query.knowledgeTitle);
    const stem = decode(query.stem);
    const studentAnswer = decode(query.studentAnswer);
    const correctAnswer = decode(query.correctAnswer);
    const grade = query.grade ? Number(query.grade) : undefined;

    // 交接优先：答错后从测试页过来时，题干/选项/答案/三级提示都在 handoff 里。
    // 从「我的 → AI 辅导」或学习详情页进来时没有交接，退化成 URL 参数（或纯自由问答）。
    const handoff = aiTutorHandoff.take();
    this.hints = handoff?.hints ?? [];

    this.context = mergeContext(
      {
        subjectName: subjectName || undefined,
        grade,
        stage: grade ? stageOfGrade(grade) : undefined,
        knowledgeTitle: knowledgeTitle || undefined,
        stem: stem || undefined,
        studentAnswer: studentAnswer || undefined,
        correctAnswer: correctAnswer || undefined,
      },
      handoff?.context,
    );

    // 场景由「有没有题干 / 有没有知识点」决定，具体给哪些按钮见 services/aiTutorActions
    const scene = sceneOf(!!this.context.stem, !!this.context.knowledgeTitle);
    this.setData({
      // 自由问答没有题目也没有知识点，标题给个「自由问答」，不留空也不冒充某学科
      contextTitle:
        scene === 'free'
          ? '自由问答'
          : [this.context.subjectName, this.context.knowledgeTitle].filter(Boolean).join(' · '),
      contextDesc: this.context.stem ?? '',
      contextMeta: contextMetaLines(this.context),
      quickActions: buildQuickActions(scene),
      messages: [{ id: this.nextId(), role: 'ai', text: greetingText(scene), source: 'ai' }],
    });
    void this.checkStatus();
    if (scene === 'free') void this.loadSubjects();
  },

  // 学科 chip：只在自由问答场景加载（题目/知识点场景的学科由内容本身决定，不该让用户改）。
  // 拉不到就整行不显示——自由问答不依赖它。
  async loadSubjects() {
    try {
      const names = await listSubjectNames();
      if (names.length > 0) this.setData({ subjectChips: names, showSubjectPicker: true });
    } catch (error) {
      console.error('AI 辅导：学科列表加载失败', error);
    }
  },

  onPickSubject(event: WechatMiniprogram.TouchEvent) {
    const { subject } = event.currentTarget.dataset as { subject: string };
    const name = subject ?? '';
    this.context = { ...this.context, subjectName: name || undefined };
    this.setData({ activeSubject: name });
  },

  nextId(): string {
    this.seq += 1;
    return `m${this.seq}`;
  },

  // 配置自检（不消耗额度）：只用来决定顶部是否提示「AI 暂未配置」，
  // 失败也不阻塞页面——照样能点，照样有兜底文案
  async checkStatus() {
    try {
      const status = await aiTutorService.status();
      const ready = !!status.configured && status.enabled !== false;
      this.setData({
        statusText: ready ? '' : 'AI 暂未配置，现在只会给出固定的学习提示（功能仍可用）',
      });
    } catch {
      this.setData({ statusText: '连不上 AI 服务，现在只会给出固定的学习提示' });
    }
  },

  onInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ inputText: event.detail.value });
  },

  onQuick(event: WechatMiniprogram.TouchEvent) {
    const { action, label } = event.currentTarget.dataset as {
      action: AiTutorAction;
      label: string;
    };
    void this.ask(action, label);
  },

  onSend() {
    const text = this.data.inputText.trim();
    if (!text) return;
    void this.ask('qa', text);
  },

  async ask(action: AiTutorAction, userText: string) {
    if (this.data.sending) return;
    const pendingId = this.nextId();
    const userMessage: ChatMessage = { id: this.nextId(), role: 'user', text: userText };
    const pendingMessage: ChatMessage = {
      id: pendingId,
      role: 'ai',
      text: '正在思考…',
      pending: true,
    };
    this.setData({
      messages: [...this.data.messages, userMessage, pendingMessage],
      sending: true,
      inputText: '',
      scrollTo: pendingId,
    });

    // aiTutorService 已兜住所有异常，这里拿到的永远是结果而不是抛出。
    // hintHistory 让 AI 知道前面已经说过什么，避免连点两次「只提示一步」得到同一句话。
    const result = await aiTutorService.ask(
      action,
      { ...this.context, hintHistory: this.hintsUsed },
      this.hints,
    );
    const text = result.text || '这次没拿到回答，换个说法再问一次试试。';
    if (result.text) this.hintsUsed.push(result.text);
    const messages = this.data.messages.map((item) =>
      item.id === pendingId ? { ...item, text, source: result.source, pending: false } : item,
    );
    this.setData({ messages, sending: false, scrollTo: pendingId });
  },
});
