// 分数模型的纯计算层（B-7 之二，math-subject-requirements-assessment.md §3.C 的 4 个第一批可视化组件）。
//
// 为什么逻辑单独放这里：组件文件导入时就会执行 Component({...})，
// Node 测试环境里 Component 未定义会直接崩（已踩过，见 utils/numberLine.ts 注释）。
//
// 口径说明（小学数学）：
//   - 不处理负分数（小学阶段不出现），出现即按 0 处理并照常出图，不报错。
//   - 假分数一律化成带分数再画：5/4 画成「1 又 1/4」的两个整体，
//     而不是在一条 4 等分的条上涂 5 段（那样学生会数不清）。
//   - 分母过大（> 24）时改画连续条：等分线会细到看不见，不如直接给占比。
export interface Fraction {
  readonly whole: number;
  readonly numerator: number;
  readonly denominator: number;
}

export interface FractionSegment {
  readonly index: number;
  // 是否涂色（分子覆盖到的份）
  readonly filled: boolean;
  // 是否某个「整体」的第一份：用来在两份之间画一条更明显的分隔
  readonly groupStart: boolean;
}

export interface FractionView {
  // 分母 <= 0 等脏输入：页面按 invalid 走空态，不画出错的图
  readonly valid: boolean;
  // 等分线的份数上限。超过这个数等分线会细到看不见，改画连续条
  readonly segmented: boolean;
  readonly segments: FractionSegment[];
  // 连续条用的填充占比（0~100），= 已涂份数 / 总份数
  readonly fillPercent: number;
  readonly label: string;
}

// 总份数上限：(whole + 1) * denominator 超过它就不再逐份画
const MAX_SEGMENT_DENOMINATOR = 24;

function toInt(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

// 化成带分数：7/3 → 2 又 1/3；5/5 → 2（分子归零）
export function normalize(numerator: unknown, denominator: unknown): Fraction {
  const d = toInt(denominator);
  if (d <= 0) return { whole: 0, numerator: 0, denominator: 0 };
  const raw = toInt(numerator);
  const n = raw < 0 ? 0 : raw;
  const carry = Math.floor(n / d);
  return { whole: carry, numerator: n % d, denominator: d };
}

export function labelOf(fraction: Fraction): string {
  const { whole, numerator, denominator } = fraction;
  if (denominator <= 0) return '';
  if (whole <= 0 && numerator <= 0) return '0';
  if (numerator === 0) return `${whole}`;
  return whole > 0 ? `${whole} ${numerator}/${denominator}` : `${numerator}/${denominator}`;
}

// 数值大小（比较用）：1 又 3/4 → 1.75
export function valueOf(fraction: Fraction): number {
  if (fraction.denominator <= 0) return 0;
  return fraction.whole + fraction.numerator / fraction.denominator;
}

export function compareFraction(a: Fraction, b: Fraction): -1 | 0 | 1 {
  const diff = valueOf(a) - valueOf(b);
  // 浮点尾差：1/3 与 2/6 必须判等，不能因为 0.3333333 ≠ 0.3333334 说它们不等
  if (Math.abs(diff) < 1e-9) return 0;
  return diff > 0 ? 1 : -1;
}

// 解析 "3/4" / "1 3/4" / "5" / "0.75"。解析不了返回 null（页面按没传处理）。
// 只认「数字 + 斜杠」这一种写法，不接受 "-1/2"（小学阶段不出现负分数）。
export function parseFraction(text: string): Fraction | null {
  const raw = (text ?? '').trim();
  if (!raw) return null;

  // 整数：5
  if (/^\d+$/.test(raw)) return { whole: Number(raw), numerator: 0, denominator: 1 };

  // 小数：0.75 → 75/100 → 约分成 3/4（超过 6 位小数不认，避免精度噪声）
  const decimal = /^(\d+)\.(\d+)$/.exec(raw);
  if (decimal) {
    const digits = (decimal[2] ?? '').length;
    if (digits > 6) return null;
    const num = Number(decimal[2] ?? '0');
    const den = 10 ** digits;
    const g = gcd(num, den) || 1;
    const proper = normalize(num / g, den / g);
    return {
      whole: Number(decimal[1] ?? '0') + proper.whole,
      numerator: proper.numerator,
      denominator: proper.denominator,
    };
  }

  // 真分数 / 假分数：3/4、5/4
  const plain = /^(\d+)\s*\/\s*(\d+)$/.exec(raw);
  if (plain) {
    const p = normalize(Number(plain[1] ?? '0'), Number(plain[2] ?? '0'));
    return p.denominator > 0 ? p : null;
  }

  // 带分数：1 3/4
  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(raw);
  if (mixed) {
    const p = normalize(Number(mixed[2] ?? '0'), Number(mixed[3] ?? '0'));
    if (p.denominator <= 0) return null;
    return {
      whole: Number(mixed[1] ?? '0') + p.whole,
      numerator: p.numerator,
      denominator: p.denominator,
    };
  }

  return null;
}

export interface FractionInput {
  readonly whole: unknown;
  readonly numerator: unknown;
  readonly denominator: unknown;
}

// 入参 → 规范分数（供比较用，与 computeView 画的图必须是同一个口径）
export function fractionOfInput(input: FractionInput): Fraction {
  const base = normalize(input.numerator, input.denominator);
  return {
    whole: Math.max(0, toInt(input.whole)) + base.whole,
    numerator: base.numerator,
    denominator: base.denominator,
  };
}

export function computeView(input: FractionInput): FractionView {
  const fraction = fractionOfInput(input);

  if (fraction.denominator <= 0) {
    return { valid: false, segmented: false, segments: [], fillPercent: 0, label: '' };
  }

  // 画 whole + 1 个整体：带分数 1 又 3/4 要看到「第二个整体」才讲得通
  const total = (fraction.whole + 1) * fraction.denominator;
  const filled = fraction.whole * fraction.denominator + fraction.numerator;
  const segmentable = fraction.denominator <= MAX_SEGMENT_DENOMINATOR && total <= 48;

  return {
    valid: true,
    segmented: segmentable,
    segments: segmentable
      ? Array.from({ length: total }, (_, index) => ({
          index,
          filled: index < filled,
          groupStart: index % fraction.denominator === 0,
        }))
      : [],
    fillPercent: total > 0 ? (filled / total) * 100 : 0,
    label: labelOf(fraction),
  };
}

export interface FractionCompareView {
  readonly a: FractionView;
  // 没传 / 解析不出来 → null，页面只画第一条
  readonly b: FractionView | null;
  readonly relation: '' | '<' | '>' | '=';
}

// 比大小是分数教学里最容易讲错的一环（分母不同不能直接比分子），
// 所以两根条必须等宽、各按自己的分母等分 —— 看长度而不是看份数。
export function computeCompareView(
  input: FractionInput & { readonly compare: unknown },
): FractionCompareView {
  const a = computeView(input);
  const other = typeof input.compare === 'string' ? parseFraction(input.compare) : null;
  if (!other) return { a, b: null, relation: '' };
  const cmp = compareFraction(fractionOfInput(input), other);
  return { a, b: computeView(other), relation: cmp === 0 ? '=' : cmp > 0 ? '>' : '<' };
}
