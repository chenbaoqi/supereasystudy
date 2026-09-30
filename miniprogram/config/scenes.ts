// 情景闯关题库总入口（数学 + 英语合流）。
//
// 数据分两个文件只是为了**好维护**（数学题和英语题的量都还会涨），
// 消费方一律从这里 import，不要分别引 mathScenes / englishScenes——
// 否则以后加第三个学科的包，要改的地方又会散开。
import type { ScenePack } from '../core/scene';
import { MATH_SCENE_PACKS } from './mathScenes';
import { ENGLISH_SCENE_PACKS } from './englishScenes';

export const SCENE_PACKS: readonly ScenePack[] = [...MATH_SCENE_PACKS, ...ENGLISH_SCENE_PACKS];
