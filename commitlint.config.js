// 提交信息格式校验。规范细节见 docs/guides/git-workflow.md。
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 本项目提交信息使用中文：CJK 文本没有自然换行点，
    // 默认 100 字符行宽限制按英文书写习惯设计，对中文正文误伤率高，故关闭。
    'body-max-line-length': [0],
    // 同上：五要素正文会被解析为 footer，需一并关闭
    'footer-max-line-length': [0],
  },
};
