# Banner 示例图（SAMPLE）

由 `scripts/generate_sample_banners.py` 生成。**正式图由设计替换**：
替换云存储文件 + 更新 banners 集合记录的 `imageUrl` 即可，代码零改动。

## 上线步骤（约 5 分钟，手动）

0. **前置（仅首次）**：云开发控制台 →「存储」→ 右上角「权限设置」→
   改为「**所有用户可读，仅创建者可写**」。存储与数据库是两套权限，
   默认「仅创建者可读写」会导致管理端上传的图片在小程序端 500/加载失败。
   💡 改完权限若不生效，**重启开发者工具**（配置缓存）
1. **上传图片**：云开发控制台 →「存储」→ 新建文件夹 `banners/` → 上传本目录 2 张 PNG
2. **复制 File ID**：点击已上传文件 → 复制 `cloud://...` 格式的 File ID
3. **录入数据**：「数据库」→ `banners` →「添加记录」× 2：

```json
// 记录 1
{ "imageUrl": "<banner-1.png 的 File ID>", "title": "超easy学习", "order": 1, "open": true }
// 记录 2
{ "imageUrl": "<banner-2.png 的 File ID>", "title": "英语学习已上线", "order": 2, "open": true }
```

4. **验证**：小程序「编译」→ 首页顶部出现轮播（indicator-dots + autoplay）

## 排序与启用规则（Specification §13.2 冻结字段）

- `order` 升序轮播（1 在前）
- `open: false` 即下线，无需删记录
- 新增 Banner：传图 → 录记录（open=true, order=最大值+1）
