// 数轴的可视化计算（B-7 组件 math-number-line 的纯逻辑层）。
//
// 为什么要单独抽出来：组件的 wxml 只负责按百分比摆位置，
// 刻度怎么切、坐标怎么换算、浮点怎么防抖，这些必须能单测——
// 数轴画错一格，学生会记错一个知识点，靠肉眼看截图是抓不出来的。

// 浮点累加误差：0.1 连加十次是 0.9999999999999999，刻度就会画歪、标签出现 0.30000000000000004
const EPSILON = 1e-9;

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min; // 区间写反了不崩，按 min 处理（页面不会白屏）
  return Math.min(Math.max(value, min), max);
}

// 刻度值序列：含两端端点。
// step <= 0 时退化为「只画两端」，避免死循环。
export function ticksOf(min: number, max: number, step: number): number[] {
  if (max < min) return [min];
  if (!(step > 0)) return [min, max];
  const out: number[] = [];
  // 用乘法而不是累加：i * step 的误差是单次乘法级别，累加会滚雪球
  const count = Math.floor((max - min) / step + EPSILON);
  for (let i = 0; i <= count; i += 1) {
    const value = min + i * step;
    if (value > max + EPSILON) break;
    out.push(round(value));
  }
  // 端点没被 step 整除时（如 0~10 step=3），把 max 补上——数轴右端必须有刻度
  if (out.length === 0) return [min, max];
  const last = out[out.length - 1] as number;
  if (Math.abs(last - max) > EPSILON) out.push(round(max));
  return out;
}

// 值 → 百分比位置（0~100）。区间长度为 0 时给 0，不做除法（会出 Infinity）
export function percentOf(value: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return 0;
  return clamp(((clamp(value, min, max) - min) / span) * 100, 0, 100);
}

// 刻度标签：整数不带小数点，小数按 step 的位数决定（step=0.5 → 1 位；step=0.25 → 2 位）
export function formatTick(value: number, step: number): string {
  if (Number.isInteger(value) && Number.isInteger(step)) return String(value);
  const decimals = decimalsOf(step);
  return value.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

function decimalsOf(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
}

function round(value: number): number {
  // 先把 0.30000000000000004 这类值抹平，再保留 6 位有效小数（够用且不会引入新误差）
  return Math.round(value * 1e6) / 1e6;
}

// —— 组件视图数据（math-number-line 直接 setData 这个结果） ——
// 放在这里而不是组件文件里，是因为组件文件会执行 Component({...})，
// 在 Node 测试环境里 Component 未定义，一 import 就崩（已踩）。
export interface NumberLineInput {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: unknown; // 不传为 null；小程序属性也可能是字符串
  readonly rangeFrom: unknown;
  readonly rangeTo: unknown;
}

export interface NumberLineView {
  // 不用 readonly：setData 要求可变数组
  readonly ticks: { value: number; label: string; left: number }[];
  readonly hasValue: boolean;
  readonly valueLeft: number;
  readonly hasRange: boolean;
  readonly rangeLeft: number;
  readonly rangeWidth: number;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function computeView(input: NumberLineInput): NumberLineView {
  const { min, max, step } = input;
  const ticks = ticksOf(min, max, step).map((value) => ({
    value,
    label: formatTick(value, step),
    left: percentOf(value, min, max),
  }));

  const value = toNumber(input.value);
  const rangeFrom = toNumber(input.rangeFrom);
  const rangeTo = toNumber(input.rangeTo);
  // 半开区间（只给一端）不画：定位不出宽度，画出来是错的
  const hasRange = rangeFrom !== null && rangeTo !== null;
  const left = hasRange ? percentOf(rangeFrom, min, max) : 0;
  const right = hasRange ? percentOf(rangeTo, min, max) : 0;

  return {
    ticks,
    hasValue: value !== null,
    valueLeft: value === null ? 0 : percentOf(value, min, max),
    hasRange,
    rangeLeft: Math.min(left, right),
    rangeWidth: Math.abs(right - left),
  };
}
