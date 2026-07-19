# seedBanners — Banner 记录一次性初始化

写入 2 条首页轮播记录（图片已上传至云存储 `images/ui/`）。幂等：按 `title` 查重。

## 使用

1. 右键本目录 →「上传并部署：云端安装依赖（不上传 node_modules）」
2. 云控制台 → 云函数 → `seedBanners` →「云端测试」→ 运行
3. 预期返回两条 `created`（重复运行变 `skipped`）
4. 小程序「编译」→ 首页顶部出现轮播

## 注意

- `imageUrl` 为云存储 File ID，**绑定当前环境**（URL 内含环境 ID 段）；
  新环境需重新上传图片并替换 `index.js` 中的 URL
- 若首页轮播不出现：检查 `banners` 集合权限应为「所有用户可读，仅创建者可写」
  （见 `cloud/database/README.md` 权限矩阵）
- 正式 Banner 图替换：云存储换图 + 更新记录的 imageUrl，代码零改动
