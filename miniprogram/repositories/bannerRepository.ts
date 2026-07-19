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
    const banners = res.data as Banner[];
    if (banners.length === 0) return banners;
    // cloud:// File ID 直出渲染在部分环境会经网关 500（渲染层网络层错误），
    // 标准解法：换临时 HTTPS URL 再渲染（临时地址每次进首页重新换取，过期无影响）
    const temp = await wx.cloud.getTempFileURL({
      fileList: banners.map((item) => item.imageUrl),
    });
    const urlMap = new Map(temp.fileList.map((file) => [file.fileID, file.tempFileURL]));
    return banners.map((item) => ({
      ...item,
      imageUrl: urlMap.get(item.imageUrl) ?? item.imageUrl,
    }));
  },
};
