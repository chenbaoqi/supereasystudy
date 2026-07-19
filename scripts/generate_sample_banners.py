#!/usr/bin/env python3
"""生成首页 Banner 示例图（SAMPLE：正式图由设计替换后从云存储换 URL 即可）。

用法：python3 scripts/generate_sample_banners.py
输出：scripts/assets/banners/banner-1.png、banner-2.png（900x360，适配 swiper aspectFill）
"""

import os

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 900, 360
FONT_PATH = "/System/Library/Fonts/Hiragino Sans GB.ttc"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "assets", "banners")


def lerp(color_a, color_b, ratio):
    return tuple(int(color_a[i] + (color_b[i] - color_a[i]) * ratio) for i in range(3))


def make_banner(filename, top_color, bottom_color, title, subtitle):
    image = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(image)
    for row in range(HEIGHT):
        draw.line([(0, row), (WIDTH, row)], fill=lerp(top_color, bottom_color, row / HEIGHT))
    title_font = ImageFont.truetype(FONT_PATH, 96)
    subtitle_font = ImageFont.truetype(FONT_PATH, 40)
    title_box = draw.textbbox((0, 0), title, font=title_font)
    draw.text(
        ((WIDTH - (title_box[2] - title_box[0])) / 2, 100),
        title,
        font=title_font,
        fill="white",
    )
    subtitle_box = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    draw.text(
        ((WIDTH - (subtitle_box[2] - subtitle_box[0])) / 2, 230),
        subtitle,
        font=subtitle_font,
        fill=(230, 255, 240),
    )
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    image.save(os.path.join(OUTPUT_DIR, filename))


if __name__ == "__main__":
    make_banner("banner-1.png", (7, 193, 96), (3, 140, 70), "超easy学习", "每天进步一点点")
    make_banner("banner-2.png", (52, 152, 219), (30, 100, 180), "英语学习已上线", "教材同步 · 智能复习")
    print("已生成:", os.listdir(OUTPUT_DIR))
