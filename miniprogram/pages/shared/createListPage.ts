// 列表页脚手架（DRY：subject / learning-path / textbook / semester 四页同构——
// 加载列表 → 渲染 → 点击已开放项跳下一级，未开放进 Coming Soon）。
// 仅生成 Page options，不含业务逻辑；数据获取经各 Repository 注入。
// 显式 this 标注：工厂返回的对象绕过了 Page() 的 ThisType 推断。

export interface ListPageItem {
  readonly id: string;
  readonly title: string;
  readonly open: boolean; // false 时点击进 Coming Soon（§5 Subject/Path 层级行为）
}

export interface ListPageConfig {
  // 拉取列表；入参为页面路由 query（如 { subjectId: '...' }）
  fetchItems: (query: Record<string, string>) => Promise<ListPageItem[]>;
  // 点击已开放项的下一级路由
  buildNextUrl: (id: string) => string;
}

interface ListPageData {
  items: ListPageItem[];
  loading: boolean;
  loadFailed: boolean;
}

// 工厂返回对象的自定义方法（供 this 标注使用，绕过 Page() 的 ThisType 推断限制）
interface ListPageCustom {
  reload(query: Record<string, string>): Promise<void>;
  onRetry(): void;
  onTapItem(event: WechatMiniprogram.TouchEvent): void;
}

type ListPageInstance = WechatMiniprogram.Page.Instance<ListPageData, ListPageCustom>;

export function createListPage(config: ListPageConfig) {
  return {
    data: { items: [], loading: true, loadFailed: false } as ListPageData,

    async onLoad(this: ListPageInstance, query: Record<string, string>) {
      await this.reload(query);
    },

    async reload(this: ListPageInstance, query: Record<string, string>) {
      try {
        const items = await config.fetchItems(query);
        this.setData({ items, loading: false, loadFailed: false });
      } catch (error) {
        console.error('列表加载失败（§8 重试）', error);
        this.setData({ loading: false, loadFailed: true });
      }
    },

    onRetry(this: ListPageInstance) {
      this.setData({ loading: true, loadFailed: false });
      void this.reload(this.options as Record<string, string>);
    },

    onTapItem(this: ListPageInstance, event: WechatMiniprogram.TouchEvent) {
      const { id, open } = event.currentTarget.dataset as { id: string; open: boolean };
      wx.navigateTo({ url: open ? config.buildNextUrl(id) : '/pages/coming-soon/coming-soon' });
    },
  };
}
