// 数字键盘答题的通用输入规则（目前只有口算冒险岛在用；
// 原「速算」也用同一份，2026-09-16 下线归档，见 _archive-math-drill/RESTORE.md）。
//
// 放进 core/ 而不是某个游戏的 core 里：判定规则属于「输入」而不是某个游戏的领域，
// 放游戏文件里会让另一个游戏为了一行判定去依赖整个领域模块（曾经的坏依赖）。

// 自动检测：孩子填完就该出结果，不必再按「确定」。
//
// ⚠️ 判据只能是「数值正好等于正确答案」。**绝不能按位数判定**（输入长度 == 答案位数）：
//    答案是 5、孩子想写 15 时，刚按下 1 就会被判错，那是真冤枉孩子。
//    按「等于答案」判定没有这个副作用 —— 既然写成答案了，那就一定是对的。
//
// 答错不自动提交是刻意的：否则孩子没有确认动作，多按一位就当场判错。
export function isInputComplete(input: string, answer: number): boolean {
  if (input === '') return false;
  const n = Number(input);
  return Number.isFinite(n) && n === answer;
}
