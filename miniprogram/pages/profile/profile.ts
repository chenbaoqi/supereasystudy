// 个人形象：选头像 + 起名字（2026-09-20）。
//
// 全本机存储，没有任何云调用——所以它**不可能加载失败**，
// 也就不需要「加载中 / 失败重试」那三态（有别于其它读云的页面）。
import {
  AVATAR_CHOICES,
  NICKNAME_MAX,
  normalizeNickname,
  readProfile,
  saveProfile,
} from '../../services/profileService';

Page({
  data: {
    avatar: '🙂',
    nickname: '',
    choices: AVATAR_CHOICES as readonly string[],
    maxLen: NICKNAME_MAX,
  },

  onLoad() {
    this.setData({ ...readProfile() });
  },

  onTapAvatar(event: WechatMiniprogram.TouchEvent) {
    const { avatar } = event.currentTarget.dataset as { avatar: string };
    if (!avatar) return;
    saveProfile({ avatar });
    this.setData({ avatar });
  },

  onNicknameInput(event: WechatMiniprogram.Input) {
    // 输入时不清洗（否则打不出空格、长度突然截断很怪），保存时才清洗
    this.setData({ nickname: (event.detail.value ?? '').slice(0, NICKNAME_MAX) });
  },

  onSave() {
    const clean = normalizeNickname(this.data.nickname);
    saveProfile({ nickname: clean });
    wx.showToast({ title: '已保存' });
    setTimeout(() => wx.navigateBack(), 400);
  },
});
