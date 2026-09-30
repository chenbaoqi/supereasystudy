// 统一判题器（需求第二十九章 Question Engine / 第三十一章 方程步骤 / 第三十六章 错因）。
//
// 原则：
// 1) 只判「程序能 100% 判定」的题型（见 core/question.ts 的 JUDGEABLE_TYPES）。
//    不能判的返回 correct=null（**不是 false**），由上层决定转人工/AI 或跳过。
// 2) 判错时推断错因，并且要具体到「错在第几行」（需求第三十一章明确要求）。
// 3) 本文件为纯函数，无 IO，可完整单测。

import type { ErrorType, JudgeResult, Question } from '../core/question';
import { isJudgeable } from '../core/question';

// ---------- 归一化 ----------

// 文本归一化：全角→半角、数学符号统一、去空格、转小写。
export function normalizeText(input: string): string {
  let s = String(input ?? '');
  // 全角 ASCII（\uFF01-\uFF5E）→ 半角
  s = s.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  s = s.replace(/\u3000/g, ' '); // 全角空格 U+3000
  // 数学符号统一
  s = s.replace(/[×✕✖·]/g, '*');
  s = s.replace(/÷/g, '/');
  s = s.replace(/[−–—]/g, '-');
  s = s.replace(/\s+/g, '');
  return s.toLowerCase();
}

// 数字答案解析：支持 0.5 / .5 / 1/2 / -3 / 50% / 带分数 1 1/2。解析不出返回 null。
export function parseNumericAnswer(input: string): number | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;

  // 带分数 a b/c（如「1 1/2」= 1.5）：必须在去空格之前判断。
  // 否则 normalizeText 会先把空格删掉变成「11/2」，被误读成 5.5 —— 学生会因此被误判为错。
  const mixed = /^([+-]?)(\d+)\s+(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(raw);
  if (mixed) {
    const sign = mixed[1] === '-' ? -1 : 1;
    const whole = Number(mixed[2]);
    const a = Number(mixed[3]);
    const b = Number(mixed[4]);
    if (!Number.isFinite(whole) || !Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
      return null;
    }
    return sign * (whole + a / b);
  }

  // 含内部空格但不是带分数（如「2 3」）→ 不猜，交回上层按文本比对
  if (/\s/.test(raw)) return null;

  const s = normalizeText(raw);
  if (!s) return null;

  if (s.endsWith('%')) {
    const inner = parseNumericAnswer(s.slice(0, -1));
    return inner === null ? null : inner / 100;
  }

  // 分数 a/b
  const frac = /^([+-]?\d+(?:\.\d+)?)\/([+-]?\d+(?:\.\d+)?)$/.exec(s);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
    return a / b;
  }

  // 整数 / 小数 / 正负号
  if (/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ---------- 表达式求值（用于公式等价判定） ----------

type Node = (x: number) => number;
type Tok =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' };

const FUNCS: Record<string, (n: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: (n) => Math.sqrt(n),
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
};

function tokenize(src: string): Tok[] | null {
  const s = normalizeText(src);
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i] ?? '';
    if (/[0-9.]/.test(c)) {
      let j = i;
      let dots = 0;
      while (j < s.length && /[0-9.]/.test(s[j] ?? '')) {
        if (s[j] === '.') {
          dots += 1;
          if (dots > 1) return null;
        }
        j += 1;
      }
      const num = Number(s.slice(i, j));
      if (!Number.isFinite(num)) return null;
      out.push({ t: 'num', v: num });
      i = j;
      continue;
    }
    if (/[a-z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-z]/.test(s[j] ?? '')) j += 1;
      out.push({ t: 'id', v: s.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '(') {
      out.push({ t: 'lp' });
      i += 1;
      continue;
    }
    if (c === ')') {
      out.push({ t: 'rp' });
      i += 1;
      continue;
    }
    if ('+-*/^'.includes(c)) {
      out.push({ t: 'op', v: c });
      i += 1;
      continue;
    }
    return null; // 非法字符
  }
  return out;
}

// 递归下降解析：expr → term → unary → power → primary，支持 2x 这类隐式乘法。
// 语法或遇到未知标识符时返回 null（宁可不判，也不误判）。
function compile(src: string): Node | null {
  const toks = tokenize(src);
  if (!toks || toks.length === 0) return null;
  let p = 0;
  const peek = (): Tok | undefined => toks[p];

  // 采用「先收集操作数与运算符，最后统一折叠」的写法，
  // 避免 left 被反复重新赋值形成闭包自引用（会触发 TS7022 循环类型推断）。
  function parseExpr(): Node | null {
    const first = parseTerm();
    if (!first) return null;
    const rest: { op: string; fn: Node }[] = [];
    for (;;) {
      const t = peek();
      if (!t || t.t !== 'op' || (t.v !== '+' && t.v !== '-')) break;
      p += 1;
      const right = parseTerm();
      if (!right) return null;
      rest.push({ op: t.v, fn: right });
    }
    if (rest.length === 0) return first;
    return (x: number): number => {
      let acc = first(x);
      for (const r of rest) {
        acc = r.op === '+' ? acc + r.fn(x) : acc - r.fn(x);
      }
      return acc;
    };
  }

  function parseTerm(): Node | null {
    const first = parseUnary();
    if (!first) return null;
    const rest: { op: '*' | '/'; fn: Node }[] = [];
    for (;;) {
      const t = peek();
      if (!t) break;
      if (t.t === 'op' && (t.v === '*' || t.v === '/')) {
        p += 1;
        const right = parseUnary();
        if (!right) return null;
        rest.push({ op: t.v === '*' ? '*' : '/', fn: right });
        continue;
      }
      // 隐式乘法：2x、3(x+1)、xy
      if (t.t === 'num' || t.t === 'id' || t.t === 'lp') {
        const right = parseUnary();
        if (!right) return null;
        rest.push({ op: '*', fn: right });
        continue;
      }
      break;
    }
    if (rest.length === 0) return first;
    return (x: number): number => {
      let acc = first(x);
      for (const r of rest) {
        acc = r.op === '*' ? acc * r.fn(x) : acc / r.fn(x);
      }
      return acc;
    };
  }

  function parseUnary(): Node | null {
    const t = peek();
    if (!t) return null;
    if (t.t === 'op' && (t.v === '+' || t.v === '-')) {
      p += 1;
      const v = parseUnary();
      if (!v) return null;
      return t.v === '-' ? (x) => -v(x) : v;
    }
    return parsePower();
  }

  function parsePower(): Node | null {
    const base = parsePrimary();
    if (!base) return null;
    const t = peek();
    if (t && t.t === 'op' && t.v === '^') {
      p += 1;
      const exp = parseUnary();
      if (!exp) return null;
      const b = base;
      const e = exp;
      return (x) => Math.pow(b(x), e(x));
    }
    return base;
  }

  function parsePrimary(): Node | null {
    const t = peek();
    if (!t) return null;
    if (t.t === 'num') {
      p += 1;
      const v = t.v;
      return () => v;
    }
    if (t.t === 'lp') {
      p += 1;
      const e = parseExpr();
      if (!e) return null;
      const r = peek();
      if (!r || r.t !== 'rp') return null;
      p += 1;
      return e;
    }
    if (t.t === 'id') {
      const name = t.v;
      p += 1;
      const nx = peek();
      if (nx && nx.t === 'lp') {
        p += 1;
        const arg = parseExpr();
        if (!arg) return null;
        const rr = peek();
        if (!rr || rr.t !== 'rp') return null;
        p += 1;
        const fn = FUNCS[name];
        if (!fn) return null;
        return (x) => fn(arg(x));
      }
      if (name === 'x') return (x) => x;
      if (name === 'e') return () => Math.E;
      if (name === 'pi') return () => Math.PI;
      return null; // 未知标识符，不敢瞎算
    }
    return null;
  }

  const fn = parseExpr();
  if (!fn) return null;
  if (p !== toks.length) return null; // 有剩余 token = 语法错误
  return fn;
}

export function evalExpression(expr: string, x: number): number | null {
  const fn = compile(expr);
  if (!fn) return null;
  try {
    const v = fn(x);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// 采样点：避开 0（很多式子在 0 处无区分度），覆盖正负与分数
const SAMPLE_POINTS = [-3, -2, -1.5, -0.5, 0.5, 1, 2, 3, 4.5];
const MIN_SAMPLES = 5;
const DEFAULT_TOLERANCE = 1e-6;

// 公式等价判定：在多个采样点上比较取值。
// 返回 true=等价 / false=不等价 / null=无法判定（解析失败或有效样本不足）。
export function formulasEquivalent(
  a: string,
  b: string,
  tolerance: number = DEFAULT_TOLERANCE,
): boolean | null {
  const fa = compile(a);
  const fb = compile(b);
  if (!fa || !fb) return null;

  let checked = 0;
  for (const x of SAMPLE_POINTS) {
    let va: number;
    let vb: number;
    try {
      va = fa(x);
      vb = fb(x);
    } catch {
      continue;
    }
    if (!Number.isFinite(va) || !Number.isFinite(vb)) continue; // 跳过奇点
    checked += 1;
    const scale = Math.max(1, Math.abs(va), Math.abs(vb));
    if (Math.abs(va - vb) > tolerance * scale) return false;
  }
  if (checked < MIN_SAMPLES) return null;
  return true;
}

// ---------- 错因推断 ----------

export function inferErrorType(question: Question, wrongStepIndex?: number): ErrorType {
  // 步骤题：错在某一步 = 步骤错误（需求第三十一章）
  if (question.questionType === 'equation_steps' && wrongStepIndex !== undefined) {
    return 'step';
  }
  switch (question.questionType) {
    case 'number_input':
      return 'calculation';
    case 'formula_input':
      return 'formula';
    case 'fill_blank':
      return 'concept';
    case 'equation_steps':
      return 'step';
    default:
      // 选择题等：优先用题目声明的常见错因，其次概念错误
      return question.errorTypes?.[0] ?? 'concept';
  }
}

// ---------- 主判题入口 ----------

function asNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') return parseNumericAnswer(v);
  return null;
}

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v.map((x) => String(x));
}

export function judgeAnswer(question: Question, answer: unknown): JudgeResult {
  const qa = question.correctAnswer;

  if (!isJudgeable(question.questionType)) {
    return {
      correct: null,
      feedback: '本题型暂不支持自动判题，需人工或 AI 评阅',
    };
  }

  switch (question.questionType) {
    case 'single_choice': {
      const got = asNumber(answer);
      const want = qa.index;
      if (got === null || want === undefined) {
        return { correct: null, feedback: '答案格式不正确' };
      }
      const ok = got === want;
      return {
        correct: ok,
        expected: question.options?.[want] ?? String(want),
        errorType: ok ? undefined : inferErrorType(question),
      };
    }

    case 'multiple_choice': {
      const arr = Array.isArray(answer) ? answer.map(asNumber) : null;
      const want = qa.indexes ? [...qa.indexes].sort((a, b) => a - b) : undefined;
      if (!arr || arr.some((n) => n === null) || !want) {
        return { correct: null, feedback: '答案格式不正确' };
      }
      const got = (arr as number[]).slice().sort((a, b) => a - b);
      const ok = got.length === want.length && got.every((n, i) => n === want[i]);
      return {
        correct: ok,
        expected: want.map((i) => question.options?.[i] ?? String(i)).join('、'),
        errorType: ok ? undefined : inferErrorType(question),
      };
    }

    case 'true_false': {
      const want = qa.index !== undefined ? qa.index === 1 : undefined;
      let got: boolean | undefined;
      if (typeof answer === 'boolean') got = answer;
      else if (answer === 'true' || answer === 'false') got = answer === 'true';
      else {
        const n = asNumber(answer);
        if (n === 0 || n === 1) got = n === 1;
      }
      if (got === undefined || want === undefined) {
        return { correct: null, feedback: '答案格式不正确' };
      }
      const ok = got === want;
      return {
        correct: ok,
        expected: want ? '正确' : '错误',
        errorType: ok ? undefined : inferErrorType(question),
      };
    }

    case 'fill_blank': {
      const got = normalizeText(String(answer ?? ''));
      const wants = (qa.texts ?? []).map(normalizeText);
      if (!got || wants.length === 0) {
        return { correct: null, feedback: '答案格式不正确' };
      }
      const ok = wants.includes(got);
      return {
        correct: ok,
        expected: qa.texts?.join(' / '),
        normalized: got,
        errorType: ok ? undefined : inferErrorType(question),
      };
    }

    case 'number_input': {
      const got = asNumber(answer);
      const want = qa.number;
      if (got === null || want === undefined) {
        return { correct: null, feedback: '答案格式不正确' };
      }
      const tol = qa.tolerance ?? 1e-6;
      const ok = Math.abs(got - want) <= tol;
      return {
        correct: ok,
        expected: String(want),
        normalized: String(got),
        errorType: ok ? undefined : inferErrorType(question),
      };
    }

    case 'formula_input': {
      const gotRaw = String(answer ?? '');
      const got = normalizeText(gotRaw);
      const wants = (qa.texts ?? []).map(normalizeText);
      if (!got || wants.length === 0) {
        return { correct: null, feedback: '答案格式不正确' };
      }
      // 1) 字面完全一致（最快路径）
      if (wants.includes(got)) {
        return { correct: true, expected: qa.texts?.join(' / '), normalized: got };
      }
      // 2) 两边都是纯数字 → 数值比较
      const gotNum = parseNumericAnswer(got);
      if (gotNum !== null) {
        for (const w of wants) {
          const wn = parseNumericAnswer(w);
          if (wn !== null && Math.abs(gotNum - wn) <= (qa.tolerance ?? 1e-6)) {
            return { correct: true, expected: w, normalized: got };
          }
        }
      }
      // 3) 表达式数值采样等价（如 2x+2 与 2(x+1)）
      for (const w of wants) {
        const eq = formulasEquivalent(got, w);
        if (eq === true) {
          return { correct: true, expected: w, normalized: got };
        }
      }
      return {
        correct: false,
        expected: qa.texts?.join(' / '),
        normalized: got,
        errorType: inferErrorType(question),
      };
    }

    case 'equation_steps': {
      const got = asStringArray(answer);
      const want = qa.steps;
      if (!got || !want || want.length === 0) {
        return { correct: null, feedback: '答案格式不正确' };
      }
      // 需求第三十一章：指出错在第几行，而不是整题判错
      let wrongStepIndex = -1;
      for (let i = 0; i < want.length; i += 1) {
        const w = normalizeText(want[i] ?? '');
        const g = normalizeText(got[i] ?? '');
        if (g !== w) {
          wrongStepIndex = i;
          break;
        }
      }
      const ok = wrongStepIndex === -1;
      return {
        correct: ok,
        expected: want.join(' → '),
        wrongStepIndex,
        errorType: ok ? undefined : 'step',
        feedback: ok ? undefined : `第 ${wrongStepIndex + 1} 步有问题，检查一下这一步的变形`,
      };
    }

    default:
      return { correct: null, feedback: '本题型暂不支持自动判题' };
  }
}
