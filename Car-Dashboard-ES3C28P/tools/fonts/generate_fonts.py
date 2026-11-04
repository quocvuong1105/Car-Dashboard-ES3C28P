#!/usr/bin/env python3
"""Rebuild LVGL text fonts with full Vietnamese glyph coverage.

Font binaries are downloaded from pinned upstream commits into a temporary
folder; only the generated C files are written into the Arduino sketch.
"""
from __future__ import annotations

import pathlib
import re
import subprocess
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
FONT_DIR = ROOT / "src" / "ui" / "fonts"
BARLOW_REV = "dc2940e2e04ef4ec96c07e23e0f02aefbddd343b"
MDI_REV = "57b567a448bd579892174cd47c47f9e187ea56c6"

BARLOW_FILES = {
    "medium": f"https://raw.githubusercontent.com/jpt/barlow/{BARLOW_REV}/fonts/ttf/BarlowSemiCondensed-Medium.ttf",
    "semibold": f"https://raw.githubusercontent.com/jpt/barlow/{BARLOW_REV}/fonts/ttf/BarlowSemiCondensed-SemiBold.ttf",
    "condensed_semibold": f"https://raw.githubusercontent.com/jpt/barlow/{BARLOW_REV}/fonts/ttf/BarlowCondensed-SemiBold.ttf",
}
MDI_URL = (
    "https://raw.githubusercontent.com/Templarian/MaterialDesign-Webfont/"
    f"{MDI_REV}/fonts/materialdesignicons-webfont.ttf"
)

# Precomposed Vietnamese letters, existing Turkish glyphs, punctuation, and
# common combining marks. Keep the full set in every text size for consistency.
TEXT_RANGES = (
    "0x20-0x7E,0xB0,0xB1,0xB7,0xD7,"
    "0xC7,0xE7,0xD6,0xF6,0xDC,0xFC,0x11E,0x11F,0x130,0x131,0x15E,0x15F,"
    "0x0102-0x0103,0x0110-0x0111,0x0128-0x0129,0x0168-0x0169,"
    "0x01A0-0x01A1,0x01AF-0x01B0,0x1EA0-0x1EF9,"
    "0x0300-0x0303,0x0306,0x0309,0x0323,"
    "0x2013,0x2014,0x2022,0x2026"
)

FONT_SIZES = (
    ("ui_font_12", 12, "medium", True),
    ("ui_font_14", 14, "medium", True),
    ("ui_font_16", 16, "semibold", True),
    ("ui_font_20", 20, "semibold", True),
    ("ui_font_28", 28, "semibold", False),
)


def download(url: str, destination: pathlib.Path) -> None:
    request = urllib.request.Request(
        url, headers={"User-Agent": "Car-Dashboard-ES3C28P-font-builder"}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        destination.write_bytes(response.read())


def existing_icon_mappings() -> list[str]:
    # The existing 12 px generated font is the source of truth for the
    # application's private-use Material Design icon remappings.
    source = FONT_DIR / "ui_font_12.c"
    if not source.exists():
        raise FileNotFoundError(f"Missing existing icon mapping source: {source}")
    header = source.read_text(encoding="utf-8").split("*/", 1)[0]
    mappings = re.findall(r"-r\s+(0x[0-9A-Fa-f]+=>0x[0-9A-Fa-f]+)", header)
    if not mappings:
        raise RuntimeError("Could not recover existing Material Design icon mappings")
    return mappings


def main() -> None:
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    icon_mappings = existing_icon_mappings()

    with tempfile.TemporaryDirectory(prefix="car-dashboard-fonts-") as tmp:
        temp = pathlib.Path(tmp)
        downloaded: dict[str, pathlib.Path] = {}
        for name, url in BARLOW_FILES.items():
            target = temp / pathlib.Path(url).name
            download(url, target)
            downloaded[name] = target

        mdi = temp / "materialdesignicons-webfont.ttf"
        download(MDI_URL, mdi)

        for font_name, size, weight, include_icons in FONT_SIZES:
            args = [
                "lv_font_conv",
                "--bpp", "4",
                "--size", str(size),
                "--format", "lvgl",
                "--no-compress",
                "--lv-include", "lvgl.h",
                "--lv-font-name", font_name,
                "--relative-project-path", str(ROOT),
                "-o", str(FONT_DIR / f"{font_name}.c"),
                "--font", str(downloaded[weight]),
                "-r", TEXT_RANGES,
            ]
            if include_icons:
                args.extend(["--font", str(mdi)])
                for mapping in icon_mappings:
                    args.extend(["-r", mapping])
            print(f"Generating {font_name} ({size}px)")
            subprocess.run(args, check=True)

    print("Generated five LVGL text fonts with Vietnamese glyph coverage.")


if __name__ == "__main__":
    main()
