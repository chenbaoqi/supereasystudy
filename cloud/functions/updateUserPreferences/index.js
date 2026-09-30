// 教材偏好写入云函数（Chapter 14 §3）。
// 为什么必须云端收口：users 记录由 login 云函数以管理端身份创建，
// 客户端对 users 集合无写权限；openid 由 getWXContext 注入，不可伪造，
// 天然只能改自己的记录。
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { preferences, subjectId } = event;
  const db = cloud.database();

  const existing = await db.collection('users').where({ openid: OPENID }).limit(1).get();
  if (existing.data.length === 0) return null;
  const user = existing.data[0];

  // 分科偏好（多科修复 2026-09-08）：subjectId 有值时并入 preferencesBySubject，
  // 旧字段 preferences 始终写入（向后兼容 + 未传 subjectId 的老客户端）。
  const data = { preferences, updatedAt: db.serverDate() };
  if (subjectId && typeof subjectId === 'string') {
    data.preferencesBySubject = {
      ...(user.preferencesBySubject || {}),
      [subjectId]: preferences,
    };
  }

  await db.collection('users').doc(user._id).update({ data });

  const doc = await db.collection('users').doc(existing.data[0]._id).get();
  return doc.data;
};
