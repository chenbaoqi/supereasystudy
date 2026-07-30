// 一次性初始化云函数：按数据库基线批量创建集合（Baseline Spec §4）。
// 设计说明：
// - 幂等：集合已存在时 createCollection 报错，捕获后记为 skipped，可安全重复执行
// - 清单与 cloud/database/collections.json 保持一致（云函数部署包相互独立，
//   无法引用包外文件；基线清单变更时两处需同步）
// - 用完可删除；保留则可用于未来新环境（如测试环境）的快速初始化
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const COLLECTIONS = [
  'users',
  'subjects',
  'learning_paths',
  'stages',
  'grades',
  'textbooks',
  'semesters',
  'chapters',
  'knowledge',
  'learning_records',
  'practice_records',
  'review_records',
  'banners',
  'notices',
  'favorites', // 2026-07-19 新增（ADR-005）：与 collections.json 保持同步
  'memory_game_records', // 2026-07-19 新增（ADR-006）：与 collections.json 保持同步
  'reading_passages', // 2026-07-30 新增（ADR-007）：与 collections.json 保持同步
];

exports.main = async () => {
  const db = cloud.database();
  const results = [];
  for (const name of COLLECTIONS) {
    try {
      // 串行创建：避免并发触发云端建集合的频率限制
      await db.createCollection(name);
      results.push({ name, status: 'created' });
    } catch (error) {
      results.push({ name, status: 'skipped', message: error.message });
    }
  }
  return { total: COLLECTIONS.length, collections: results };
};
