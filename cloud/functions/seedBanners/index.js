// 一次性 Banner 初始化云函数：写入首页轮播记录（幂等，按 title 查重）。
// 注意：imageUrl 为云存储 File ID，绑定当前环境（含环境 ID 段）；
// 新环境需重新上传图片并替换下方 URL 后再执行。
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const BANNERS = [
  {
    imageUrl:
      'cloud://cloud1-d8g6b7jctd1a3be1c.636c-cloud1-d8g6b7jctd1a3be1c-1455637430/images/ui/banner-1.png',
    title: '超easy学习',
    order: 1,
    open: true,
  },
  {
    imageUrl:
      'cloud://cloud1-d8g6b7jctd1a3be1c.636c-cloud1-d8g6b7jctd1a3be1c-1455637430/images/ui/banner-2.png',
    title: '英语学习已上线',
    order: 2,
    open: true,
  },
];

exports.main = async () => {
  const db = cloud.database();
  const results = [];
  for (const banner of BANNERS) {
    const existing = await db.collection('banners').where({ title: banner.title }).limit(1).get();
    if (existing.data.length > 0) {
      results.push({ title: banner.title, status: 'skipped' });
      continue;
    }
    await db.collection('banners').add({
      data: { ...banner, createdAt: db.serverDate(), updatedAt: db.serverDate() },
    });
    results.push({ title: banner.title, status: 'created' });
  }
  return results;
};
