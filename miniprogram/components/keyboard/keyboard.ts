// QWERTY 虚拟键盘（Chapter 15 Q2：WXML 按钮区，发射 keypress/backspace 事件）。
Component({
  properties: {
    disabled: { type: Boolean, value: false },
  },
  methods: {
    onKey(event: WechatMiniprogram.TouchEvent) {
      if (this.data.disabled) return;
      const { key } = event.currentTarget.dataset as { key: string };
      this.triggerEvent('keypress', { key });
    },
    onBackspace() {
      if (this.data.disabled) return;
      this.triggerEvent('backspace');
    },
  },
});
