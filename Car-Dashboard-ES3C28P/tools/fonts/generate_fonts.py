#!/usr/bin/env python3
"""Generate Vietnamese-only LVGL fallback fonts without touching the base fonts.

The five committed ui_font_*.c files are the immutable Latin/icon baseline.
This script emits separate *_vi.c files from the exact Barlow TTF revision
used for that baseline, containing only Vietnamese-specific precomposed
codepoints absent from the baseline's Latin-1 repertoire.
"""
from __future__ import annotations

import pathlib
import re
import subprocess
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
FONT_DIR = ROOT / "src" / "ui" / "fonts"
BARLOW_SOURCE_REV = "a87aa340da64a05fbe4e42f36ebc16fdfac8b8db"
BARLOW_FILES = {
    "medium": (
        "https://raw.githubusercontent.com/muki01/Car-Dashboard-ESP32-CYD/"
        f"{BARLOW_SOURCE_REV}/tools/fonts/ttf/BarlowSemiCondensed-Medium.ttf"
    ),
    "semibold": (
        "https://raw.githubusercontent.com/muki01/Car-Dashboard-ESP32-CYD/"
        f"{BARLOW_SOURCE_REV}/tools/fonts/ttf/BarlowSemiCondensed-SemiBold.ttf"
    ),
}
# The base font source ranges contain ASCII plus a few selected symbols
# and Turkish letters, but NOT the Vietnamese Latin-1 letters (à, á, â, è,
# ê, ì, í, ò, ó, ô, ù, ú, etc.). Add those exact missing Vietnamese glyphs
# as well as the Vietnamese Extended-A and Extended Additional blocks.
VIETNAMESE_RANGES = (
    "0x00C0-0x00C3,0x00C8-0x00CA,0x00CC-0x00CD,"
    "0x00D2-0x00D5,0x00D9-0x00DA,0x00DD,"
    "0x00E0-0x00E3,0x00E8-0x00EA,0x00EC-0x00ED,"
    "0x00F2-0x00F5,0x00F9-0x00FA,0x00FD,"
    "0x0102-0x0103,0x0110-0x0111,0x0128-0x0129,0x0168-0x0169,"
    "0x01A0-0x01A1,0x01AF-0x01B0,0x1EA0-0x1EF9"
)
FONT_SIZES = (
    ("ui_font_12", 12, "medium"),
    ("ui_font_14", 14, "medium"),
    ("ui_font_16", 16, "semibold"),
    ("ui_font_20", 20, "semibold"),
    ("ui_font_28", 28, "semibold"),
)


def download(url: str, destination: pathlib.Path) -> None:
    request = urllib.request.Request(
        url, headers={"User-Agent": "Car-Dashboard-ES3C28P-font-builder"}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        destination.write_bytes(response.read())


def baseline_metrics(font_name: str) -> tuple[int, int]:
    source = FONT_DIR / f"{font_name}.c"
    text = source.read_text(encoding="utf-8")
    line_height = re.search(r"\.line_height\s*=\s*(\d+)", text)
    base_line = re.search(r"\.base_line\s*=\s*(\d+)", text)
    if not line_height or not base_line:
        raise RuntimeError(f"Cannot read baseline metrics from {source}")
    return int(line_height.group(1)), int(base_line.group(1))


def align_metrics(generated: pathlib.Path, line_height: int, base_line: int) -> None:
    text = generated.read_text(encoding="utf-8")
    text, n_line = re.subn(
        r"(\.line_height\s*=\s*)\d+",
        lambda m: m.group(1) + str(line_height),
        text,
        count=1,
    )
    text, n_base = re.subn(
        r"(\.base_line\s*=\s*)\d+",
        lambda m: m.group(1) + str(base_line),
        text,
        count=1,
    )
    if n_line != 1 or n_base != 1:
        raise RuntimeError(f"Cannot align fallback metrics in {generated}")
    generated.write_text(text, encoding="utf-8")


def main() -> None:
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="car-dashboard-vietnamese-fonts-") as tmp:
        temp = pathlib.Path(tmp)
        downloaded: dict[str, pathlib.Path] = {}
        for weight, url in BARLOW_FILES.items():
            target = temp / pathlib.Path(url).name
            download(url, target)
            downloaded[weight] = target

        for font_name, size, weight in FONT_SIZES:
            output = FONT_DIR / f"{font_name}_vi.c"
            line_height, base_line = baseline_metrics(font_name)
            args = [
                "lv_font_conv",
                "--bpp", "4",
                "--size", str(size),
                "--format", "lvgl",
                "--no-compress",
                "--lv-include", "lvgl.h",
                "--lv-font-name", f"{font_name}_vi",
                "-o", str(output),
                "--font", str(downloaded[weight]),
                "-r", VIETNAMESE_RANGES,
            ]
            print(f"Generating Vietnamese fallback {font_name}_vi ({size}px)")
            subprocess.run(args, check=True)
            align_metrics(output, line_height, base_line)

    print("Generated five Vietnamese-only fallback fonts; base font files were not modified.")


if __name__ == "__main__":
    main()
