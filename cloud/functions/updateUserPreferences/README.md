# updateUserPreferences — 教材偏好写入

## 用途

保存/覆盖当前用户的教材偏好（`users.preferences`：
textbookId / textbookName / semesterId / semesterName）。

## 部署

右键本目录 →「上传并部署：云端安装依赖（不上传 node_modules）」。

## 调用方

小程序端 `repositories/userRepository.ts`（`updatePreferences`），
由 `UserService.savePreferences` 在「用户点开册次」时自动触发（Chapter 14 §4）。

## 安全

openid 由云端 `getWXContext` 注入，调用者只能改自己的记录，无需额外校验。
