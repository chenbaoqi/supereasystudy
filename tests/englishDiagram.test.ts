// 英语示意图的纯计算（2026-09-21）。
import { describe, expect, it } from 'vitest';
import { computeDiagram, parseTense } from '../miniprogram/utils/englishDiagram';

describe('parseTense（从语法点名解析）', () => {
  it('一般过去时 → past + simple', () => {
    expect(parseTense('一般过去时')).toEqual({ tense: 'past', aspect: 'simple' });
  });

  it('现在进行时 → present + continuous', () => {
    expect(parseTense('现在进行时')).toEqual({ tense: 'present', aspect: 'continuous' });
  });

  it('现在完成时 → present + perfect', () => {
    expect(parseTense('现在完成时')).toEqual({ tense: 'present', aspect: 'perfect' });
  });

  it('一般将来时 → future + simple', () => {
    expect(parseTense('一般将来时')).toEqual({ tense: 'future', aspect: 'simple' });
  });

  it('过去进行时 / 过去完成时也能分辨', () => {
    expect(parseTense('过去进行时')).toEqual({ tense: 'past', aspect: 'continuous' });
    expect(parseTense('过去完成时')).toEqual({ tense: 'past', aspect: 'perfect' });
  });

  it('⚠️ 解析不出时回落 present+simple（宁可画个大概，也不要画不出来）', () => {
    expect(parseTense('被动语态')).toEqual({ tense: 'present', aspect: 'simple' });
    expect(parseTense('')).toEqual({ tense: 'present', aspect: 'simple' });
  });
});

describe('computeDiagram', () => {
  it('介词：位置决定球的坐标', () => {
    const on = computeDiagram({ kind: 'preposition', position: 'on' });
    const under = computeDiagram({ kind: 'preposition', position: 'under' });
    expect(on.kind).toBe('preposition');
    if (on.kind === 'preposition' && under.kind === 'preposition') {
      expect(under.ballY).toBeGreaterThan(on.ballY); // under 比 on 更靠下
    }
  });

  it('⚠️ 不认识的介词回落 on（水平居中，不会画到场景外面去）', () => {
    const v = computeDiagram({ kind: 'preposition', position: '乱写的' });
    expect(v.kind === 'preposition' && v.position).toBeTruthy();
    if (v.kind === 'preposition') {
      // 坐标系是「场景百分比」（0~100），on 的球心水平居中
      expect(Math.abs(v.ballX - 50)).toBeLessThan(0.01);
      // 且回落的这个位置必须落在场景内（0~100），不能画出界
      expect(v.ballY).toBeGreaterThanOrEqual(0);
      expect(v.ballY).toBeLessThanOrEqual(100);
    }
  });

  it('⚠️ in 必须在盒子正中（Owner 2026-09-26 指出 in 的球偏到右下角）', () => {
    const v = computeDiagram({ kind: 'preposition', position: 'in' });
    if (v.kind === 'preposition') {
      // 盒子中心是 (50, 58)——in 的球就该在这里，不能偏
      expect(v.ballX).toBe(50);
      expect(v.ballY).toBe(58);
    }
  });

  it('⚠️ on 的球要骑在盒顶（不能压在角上）', () => {
    const v = computeDiagram({ kind: 'preposition', position: 'on' });
    if (v.kind === 'preposition') {
      expect(v.ballX).toBe(50); // 水平居中，不在角上
      expect(v.ballY).toBeLessThan(38); // 球心在盒顶（y=38%）上方
      expect(v.ballY).toBeGreaterThan(20); // 但也别飘太高
    }
  });

  it('behind：球会被盒子盖住（渲染层需要 behindBox 标记）', () => {
    const v = computeDiagram({ kind: 'preposition', position: 'behind' });
    if (v.kind === 'preposition') expect(v.behindBox).toBe(true);
  });

  it('between：渲染层画两个盒子', () => {
    const v = computeDiagram({ kind: 'preposition', position: 'between' });
    if (v.kind === 'preposition') expect(v.twinBoxes).toBe(true);
  });

  it('词族：最多 5 个（再多会挤成一团）', () => {
    const v = computeDiagram({
      kind: 'word-family',
      root: 'friend',
      members: ['friendly', 'friendship', 'a', 'b', 'c', 'd'],
    });
    if (v.kind === 'word-family') expect(v.members.length).toBe(5);
  });

  it('词族：过滤空成员', () => {
    const v = computeDiagram({ kind: 'word-family', root: 'help', members: ['helpful', '', '  '] });
    if (v.kind === 'word-family') expect(v.members).toEqual(['helpful']);
  });

  it('中文时态名也能画（挂题时传的就是语法点名）', () => {
    const v = computeDiagram({ kind: 'tense', tense: '一般过去时' });
    expect(v).toEqual({ kind: 'tense', tense: 'past', aspect: 'simple' });
  });
});
