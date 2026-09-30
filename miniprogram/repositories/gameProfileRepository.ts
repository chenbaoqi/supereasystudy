// user_game_profile 集合访问：**全站**游戏成长账户（每用户一条）。
//
// 与 math_island_progress 的分工：
//   - user_game_profile  = 跨游戏通用：星星 / 金币 / 等级 / 徽章 / 每日打卡 / 宝箱
//   - math_island_progress = 冒险岛专属：7 关的关卡进度（走完没走完、桥板、城堡评级）
// 两个集合**各自每用户一条**，职责不重叠，谁也不需要读对方。
//
// ⚠️ 集合权限必须是默认的「仅创建者可读写」，不要改成「所有用户可读」：
//    该模式下小程序端查询会自动追加 `_openid == auth.openid`，用户只能读到自己那条。
//    ⚠️ 副作用：云端导入（控制台/脚本）写进来的记录没有 _openid，小程序端读不到，
//       所以这个集合的文档只能由客户端自己 add 产生。
import type { GameProfile } from '../core/growth';

// 账户正文（_id / userId / 时间戳由仓储层负责）
export type GameProfileUpsert = Omit<GameProfile, 'v'>;

export interface GameProfileRepository {
  getByUser(userId: string): Promise<GameProfile | null>;
  upsert(userId: string, data: GameProfileUpsert): Promise<void>;
}

const COLLECTION = 'user_game_profile';

export const gameProfileRepository: GameProfileRepository = {
  async getByUser(userId) {
    const res = await wx.cloud.database().collection(COLLECTION).where({ userId }).limit(1).get();
    const doc = res.data[0] as (GameProfile & { _id: string; userId?: string }) | undefined;
    if (!doc) return null;
    const { _id: _drop, userId: _dropUser, ...rest } = doc;
    void _drop;
    void _dropUser;
    return rest as GameProfile;
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
