// subjects 集合访问（Chapter 04 §9）。
// 云端数据结构与本类型的一致性由种子/CMS 录入约束（Specification 第 13 章落地后加运行时校验）。
import type { Subject } from '../core/subject';

export interface SubjectRepository {
  // 全部学科（含未上线，§5：open=false 进 Coming Soon），按 order 升序
  listAll(): Promise<Subject[]>;
}

export const subjectRepository: SubjectRepository = {
  async listAll() {
    const res = await wx.cloud
      .database()
      .collection('subjects')
      .orderBy('order', 'asc')
      .limit(100)
      .get();
    return res.data as Subject[];
  },
};
