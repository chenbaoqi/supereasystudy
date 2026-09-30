// 孩子的个人形象：头像 + 昵称（2026-09-20）。
//
// 为什么加这个：「我的」页原来写死「你好，同学」+ 🙂——那是**系统视角**。
// 同类产品的做法是让孩子「给自己起个名字、选个专属头像」，那是**孩子视角**：
// 他会觉得这是「我的地盘」而不是「一个学习软件」。对中小学生尤其有效。
//
// 存储口径：只存**本机**（与 currentSubjectId / manualGrade 同口径，直接用 wx 同步存储）。
//   这是个性化偏好，不是学习数据；换设备丢了也不影响任何记录，
//   不值得为它往 users 集合里加字段（那要云写入、要处理权限）。
const AVATAR_KEY = 'profileAvatar';
const NICKNAME_KEY = 'profileNickname';

// 候选头像：动物为主（与同类儿童产品一致），给孩子「哪只像我」的乐趣
export const AVATAR_CHOICES: readonly string[] = [
  '🦁',
  '🐯',
  '🐼',
  '🐨',
  '🦊',
  '🐰',
  '🐸',
  '🐵',
  '🐧',
  '🦄',
  '🐳',
  '🦖',
  '🐶',
  '🐱',
];

export const DEFAULT_AVATAR = '🙂';
/** 没起名字时的兜底称呼（原来写死的「同学」） */
export const DEFAULT_NICKNAME = '同学';
export const NICKNAME_MAX = 8;

export interface Profile {
  readonly avatar: string;
  readonly nickname: string;
}

function readKey(key: string): string {
  try {
    const raw = wx.getStorageSync<string>(key);
    return typeof raw === 'string' ? raw : '';
  } catch {
    return '';
  }
}

function writeKey(key: string, value: string): void {
  try {
    if (value) wx.setStorageSync(key, value);
    else wx.removeStorageSync(key);
  } catch (error) {
    console.error('个人形象保存失败', error);
  }
}

export function readProfile(): Profile {
  const avatar = readKey(AVATAR_KEY);
  const nickname = readKey(NICKNAME_KEY).trim();
  return {
    avatar: avatar || DEFAULT_AVATAR,
    nickname: nickname || DEFAULT_NICKNAME,
  };
}

export function saveProfile(patch: Partial<Profile>): Profile {
  const next = { ...readProfile(), ...patch };
  if (patch.avatar !== undefined) writeKey(AVATAR_KEY, next.avatar);
  if (patch.nickname !== undefined) writeKey(NICKNAME_KEY, next.nickname);
  return next;
}

/** 昵称清洗：去空白与逗号（避免「你好，」被截出歧义）、限长 */
export function normalizeNickname(input: string): string {
  return input.replace(/[,，\s]+/g, '').slice(0, NICKNAME_MAX);
}
