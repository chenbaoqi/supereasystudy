// 跟读判分（2026-09-29 跟读 POC）：语音识别返回的文本 vs 目标单词。
//
// 为什么单拎成纯函数：
//   语音识别（ASR）返回的英文文本天然「脏」——首字母大写、句尾带点、多读一个词、
//   说话太短返回空串。判分规则必须收敛一处，否则页面里散落 replace 迟早对不齐。
//   复用 questionJudge.normalizeText（去空格/转小写/全角转半角），再剥掉标点。
//
// 判分口径：**严格相等**（剥标点后）。识别成 "an apple" 判错（多读了），
// 这正是跟读要抓的「读错」；不是发音评分（发音准不准插件给不了，见方案）。
import { normalizeText } from './questionJudge';

/**
 * 识别文本是否等于目标单词。
 * @returns 识别文本为空时恒 false（「没听清」由调用方兜底，不计对错）
 */
export function matchSpoken(spoken: string, word: string): boolean {
  const got = clean(spoken);
  const want = clean(word);
  return got.length > 0 && want.length > 0 && got === want;
}

// normalizeText 已转小写、去空格；这里再只留小写字母与撇号，剥掉句点/逗号/问号等
function clean(raw: string): string {
  return normalizeText(raw).replace(/[^a-z']/g, '');
}
