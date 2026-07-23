// memory_game_records 集合访问（Chapter 07 §11：保存和查询游戏记录；ADR-006）。
import type { MemoryGameRecord } from '../core/memoryGame';

export interface MemoryGameRecordCreate {
  readonly userId: string;
  readonly chapterId: string;
  readonly knowledgeIds: string[];
  readonly score: number;
  readonly correctCount: number;
  readonly wrongCount: number;
  readonly duration: number;
  readonly gameType: 'match' | 'speed'; // Chapter 08 §9：游戏模式
  readonly avgResponseMs?: number; // 平均反应时间（极速选择）
}

export interface MemoryGameRepository {
  save(input: MemoryGameRecordCreate): Promise<MemoryGameRecord>;
  listByUser(userId: string): Promise<MemoryGameRecord[]>;
}

const COLLECTION = 'memory_game_records';

export const memoryGameRepository: MemoryGameRepository = {
  async save(input) {
    const db = wx.cloud.database();
    const res = await db.collection(COLLECTION).add({
      data: { ...input, createdAt: db.serverDate(), updatedAt: db.serverDate() },
    });
    // add 返回的 _id 类型为 DocumentId（string|number），云数据库实际恒为 string
    return { _id: res._id as string, ...input, createdAt: new Date(), updatedAt: new Date() };
  },

  async listByUser(userId) {
    const res = await wx.cloud
      .database()
      .collection(COLLECTION)
      .where({ userId })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    return res.data as MemoryGameRecord[];
  },
};
