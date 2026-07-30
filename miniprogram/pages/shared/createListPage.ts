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
  // 点击已开放项的下一级路由（入参为完整列表项；提供 onTapItem 钩子时可省略）
  buildNextUrl?: (item: ListPageItem) => string;
  // 可选：自定义点击行为（替代默认跳转），如册次页的偏好保存（Chapter 14）/ 语法扁平化
  onTapItem?: (item: ListPageItem, query: Record<string, string>) => void | Promise<void>;
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
      const item = this.data.items.find((entry) => entry.id === id);
      if (!item) return;
      if (config.onTapItem) {
        void config.onTapItem(item, this.options as Record<string, string>);
        return;
      }
      wx.navigateTo({
        url:
          open && config.buildNextUrl
            ? config.buildNextUrl(item)
            : '/pages/coming-soon/coming-soon',
      });
    },
  };
}
