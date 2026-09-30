// 情景应用闯关 · 场景列表页（数学 + 英语共用）。
//
// 为什么它不进 `knowledge.quiz[]`：testService.buildPaper 按章节随机抽题组卷，
// 一组共享故事的多问塞进去会被打散（第 2 问的前提就不见了）。所以情景闯关有自己的
// 入口、自己的数据（config/scenes.ts）和自己的页面。规格见
// docs/design/math-scene-quest-spec.md。
//
// 年级过滤复用 services/gradeScope.withinGrade（ADR-012 唯一口径）：
// 低年级不超纲，高年级仍能看到前面学过的（复习需要累积）。
import { SCENE_PACKS } from '../../config/scenes';
import { scenePacksOf, type SceneSubject } from '../../core/scene';
import { gradeScope, withinGrade } from '../../services/gradeScope';
import { resolveSubjectOfSemester } from '../../services/subjectResolver';
import { gradeLabel } from '../../utils/stage';

interface QuestRow {
  readonly key: string;
  readonly id: string;
  readonly name: string;
  readonly gradeText: string;
  readonly countText: string;
}

interface PackRow {
  readonly key: string;
  readonly icon: string;
  readonly name: string;
  readonly desc: string;
  readonly quests: readonly QuestRow[];
}

// 学科名 → 情景题的学科枚举。学科名从教材反查而来，反查不到时回落数学
// （数学场景最全，宁可给内容也不给空页面）。
function sceneSubjectOf(subjectName: string): SceneSubject {
  return subjectName === '英语' ? '英语' : '数学';
}

Page({
  data: {
    subjectName: '',
    gradeText: '',
    packs: [] as PackRow[],
    empty: false,
  },

  async onLoad(query: Record<string, string>) {
    const semesterId = query.semesterId ?? '';
    const subject = await resolveSubjectOfSemester(semesterId);
    const subjectName = subject?.subjectName ?? '';
    const grade = gradeScope.currentGrade();
    const packs: PackRow[] = scenePacksOf(SCENE_PACKS, sceneSubjectOf(subjectName)).map((pack) => ({
      key: pack.id,
      icon: pack.icon,
      name: pack.name,
      desc: pack.desc,
      quests: withinGrade(pack.quests, grade).map((q) => ({
        key: q.id,
        id: q.id,
        name: q.name,
        gradeText: q.grade === undefined ? '全年级' : `${gradeLabel(q.grade)}起`,
        countText: `${q.questions.length} 问`,
      })),
    }));
    this.setData({
      subjectName,
      gradeText: grade === null ? '' : gradeLabel(grade),
      // 整包被年级过滤掉的（比如一年级看「零花钱」的百分数组）就不显示这一包
      packs: packs.filter((p) => p.quests.length > 0),
      empty: packs.every((p) => p.quests.length === 0),
    });
    if (subjectName) wx.setNavigationBarTitle({ title: `情景闯关 · ${subjectName}` });
  },

  onTapQuest(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id: string };
    if (!id) return;
    wx.navigateTo({ url: `/pages/scene-quest-run/scene-quest-run?questId=${id}` });
  },
});
