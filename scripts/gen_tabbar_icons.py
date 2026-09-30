#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""本地生成 tabBar 图标（8 张 PNG，81x81，透明底）。

为什么不用在线图标库：外链图标不可控，且小程序 tabBar 只认本地文件。
本脚本零依赖外部素材，用 PIL 画描边式图标，颜色取 styles/tokens.wxss 的
--ink-3（未选中 #98A1B3）与 --brand-500（选中 #2F6BFF）。

用法：
    python scripts/gen_tabbar_icons.py
输出：
    miniprogram/assets/tabbar/{home,study,practice,mine}[_on].png

需要 Pillow（本机 Python 3.10 已装：C:\\Users\\1\\AppData\\Local\\Programs\\Python\\Python310）。
"""

import os
from PIL import Image, ImageDraw

SIZE = 81          # 微信推荐尺寸
SCALE = 8          # 超采样倍数，缩回去后边缘干净
OUT_DIR = os.path.join("miniprogram", "assets", "tabbar")

# v1.1 淡色版：未选中 --ink-3 #9aa3b4；选中 --brand-600 #3f6bc4（比 500 深一档，
# 24rpx 级别的小图标在白底上需要这点额外对比度才看得清）
COLOR_OFF = (154, 163, 180)   # #9aa3b4
COLOR_ON = (63, 107, 196)     # #3f6bc4


def _mask():
    return Image.new("L", (SIZE * SCALE, SIZE * SCALE), 0)


def _scaled(points):
    return [(x * SCALE, y * SCALE) for x, y in points]


def icon_home():
    """房子：屋顶三角 + 墙体 + 掏空的门洞"""
    m = _mask()
    d = ImageDraw.Draw(m)
    s = SCALE
    d.polygon(_scaled([(40.5, 11), (73, 37), (8, 37)]), fill=255)
    d.rounded_rectangle([17 * s, 33 * s, 64 * s, 69 * s], radius=4 * s, fill=255)
    d.rounded_rectangle([33 * s, 46 * s, 48 * s, 69 * s], radius=3 * s, fill=0)
    return m


def icon_study():
    """摊开的书：左右两页 + 中缝留白 + 文字线"""
    m = _mask()
    d = ImageDraw.Draw(m)
    s = SCALE
    d.polygon(_scaled([(9, 22), (40, 28), (40, 66), (9, 60)]), fill=255)
    d.polygon(_scaled([(72, 22), (41, 28), (41, 66), (72, 60)]), fill=255)
    d.line([(16 * s, 36 * s), (33 * s, 39 * s)], fill=0, width=2 * s)
    d.line([(16 * s, 46 * s), (33 * s, 49 * s)], fill=0, width=2 * s)
    d.line([(65 * s, 36 * s), (48 * s, 39 * s)], fill=0, width=2 * s)
    d.line([(65 * s, 46 * s), (48 * s, 49 * s)], fill=0, width=2 * s)
    return m


def icon_practice():
    """闪电：代表闯关 / 速算这类练习"""
    m = _mask()
    d = ImageDraw.Draw(m)
    d.polygon(
        _scaled([(50, 10), (21, 45), (39, 45), (31, 71), (61, 34), (42, 34)]),
        fill=255,
    )
    return m


def icon_mine():
    """人像：圆头 + 半身"""
    m = _mask()
    d = ImageDraw.Draw(m)
    s = SCALE
    d.ellipse([28 * s, 13 * s, 53 * s, 38 * s], fill=255)
    d.ellipse([11 * s, 45 * s, 70 * s, 95 * s], fill=255)  # 下沿被画布裁掉，形成肩线
    return m


ICONS = {
    "home": icon_home,
    "study": icon_study,
    "practice": icon_practice,
    "mine": icon_mine,
}


def write(mask, name, color):
    alpha = mask.resize((SIZE, SIZE), Image.LANCZOS)
    img = Image.new("RGBA", (SIZE, SIZE), color + (0,))
    img.putalpha(alpha)
    path = os.path.join(OUT_DIR, name + ".png")
    img.save(path, "PNG")
    return path


def main():
    if not os.path.isdir(OUT_DIR):
        os.makedirs(OUT_DIR)
    for key, fn in ICONS.items():
        mask = fn()
        print(write(mask, key, COLOR_OFF))
        print(write(mask, key + "_on", COLOR_ON))


if __name__ == "__main__":
    main()
