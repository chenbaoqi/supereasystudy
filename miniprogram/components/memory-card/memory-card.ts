// 消消乐卡片（Chapter 07，Owner 定交互：明面点选消除）。
// 纯展示组件：不访问 Service/Repository，状态由游戏页经 properties 下发（分层规范）。
Component({
  properties: {
    text: { type: String, value: '' },
    selected: { type: Boolean, value: false },
    wrong: { type: Boolean, value: false },
    eliminated: { type: Boolean, value: false },
    index: { type: Number, value: 0 },
  },
  methods: {
    onTap() {
      // 已消除的卡片不响应
      if (this.data.eliminated) return;
      this.triggerEvent('cardtap', { index: this.data.index });
    },
  },
});
