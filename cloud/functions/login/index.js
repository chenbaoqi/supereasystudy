// 登录云函数（Chapter 04 §5：微信登录/恢复用户）。
// 微信云开发标准模式：getWXContext 取 openid（云端注入，客户端无法伪造），
// 有则返回用户，无则建档——幂等，客户端 login 与 restoreSession 共用本函数。
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const users = db.collection('users');

  const existing = await users.where({ openid: OPENID }).limit(1).get();
  if (existing.data.length > 0) return existing.data[0];

  const now = db.serverDate();
  const created = await users.add({ data: { openid: OPENID, createdAt: now, updatedAt: now } });
  const doc = await users.doc(created._id).get();
  return doc.data;
};
