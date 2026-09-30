// math_island_progress 集合访问：口算冒险岛存档（**每用户一条**）。
//
// 为什么不再存本机：系统需要注册，进度必须跟着账号走——
// 本机存储会「换设备丢进度、同设备换账号串进度」，两者都是真会发生的场景。
// 集合未创建时（Owner 还没去控制台建）本仓储整体按「不可用」处理，
// 由 Service 回落到本机镜像，游戏照常能玩，不会白屏或报错。
//
// ⚠️ 集合权限必须是默认的「仅创建者可读写」，不要改成「所有用户可读」：
//    该模式下微信小程序端的查询会自动追加 `_openid == auth.openid`，
//    任何用户都只能读到自己的那条；放宽权限反而会跨账号泄漏进度。
//    ⚠️ 另一个副作用：云端导入（控制台/脚本）写进来的记录没有 _openid，小程序端读不到，
//       所以这个集合的文档只能由客户端自己 add 产生。
import type { IslandProgress } from '../core/mathIsland';

// 存档正文（_id / userId / 时间戳由仓储层负责）
export type IslandProgressUpsert = Omit<IslandProgress, 'v'>;

export interface MathIslandRepository {
  getByUser(userId: string): Promise<IslandProgress | null>;
  upsert(userId: string, data: IslandProgressUpsert): Promise<void>;
}

const COLLECTION = 'math_island_progress';

export const mathIslandRepository: MathIslandRepository = {
  async getByUser(userId) {
    const res = await wx.cloud.database().collection(COLLECTION).where({ userId }).limit(1).get();
    // 库里存的是「领域对象 + userId + _id + 时间戳」，领域对象本身不含 userId
    const doc = res.data[0] as (IslandProgress & { _id: string; userId?: string }) | undefined;
    if (!doc) return null;
    // 剥掉数据库字段，只把领域对象交出去（Repository 层的输入输出纪律）
    const { _id: _drop, userId: _dropUser, ...rest } = doc;
    void _drop;
    void _dropUser;
    return rest as IslandProgress;
  },

  async upsert(userId, data) {
    const db = wx.cloud.database();
    const existing = await db.collection(COLLECTION).where({ userId }).limit(1).get();
    const patch = { ...data, updatedAt: db.serverDate() };
    if (existing.data.length > 0) {
      const doc = existing.data[0] as { _id: string };
      await db.collection(COLLECTION).doc(doc._id).update({ data: patch });
      return;
    }
    await db.collection(COLLECTION).add({
      data: { userId, ...patch, createdAt: db.serverDate() },
    });
  },
};
