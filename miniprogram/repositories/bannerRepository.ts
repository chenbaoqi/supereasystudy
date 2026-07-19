// banners 集合访问（Specification §12.5：首页 Banner 轮播数据源）。
import type { Banner } from '../core/banner';

export interface BannerRepository {
  // 上线 Banner（open=true），按 order 升序
  listOpen(): Promise<Banner[]>;
}

export const bannerRepository: BannerRepository = {
  async listOpen() {
    const res = await wx.cloud
      .database()
      .collection('banners')
      .where({ open: true })
      .orderBy('order', 'asc')
      .limit(10)
      .get();
    return res.data as Banner[];
  },
};
