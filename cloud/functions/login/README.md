# login — 登录云函数

按 openid（云端 `getWXContext` 注入）查找用户，不存在则自动建档。幂等。

## 部署

右键本目录 →「上传并部署：云端安装依赖（不上传 node_modules）」。

> 首次部署前确认 `cloud/functions` 已关联云环境（见 initDatabase/README 前置步骤）。

## 调用方

小程序端 `repositories/userRepository.ts`（`wx.cloud.callFunction({ name: 'login' })`），
被 `UserService.login()` / `restoreSession()` 复用。

## 权限建议

云控制台中保持默认即可（客户端可调用；openid 由云端注入，无伪造风险）。
