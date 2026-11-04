# Localization / Crowdin setup

The firmware translation source of truth is in `translations/*.json` inside the Arduino sketch folder.

## Supported languages

- `en.json`: English source
- `tr.json`: Turkish
- `vi.json`: Vietnamese

Do not edit `src/core/i18n_generated.h` or `src/core/i18n_generated.cpp` by hand. Regenerate them after editing catalogs:

```bash
python3 tools/i18n/generate_translations.py
```

The generator checks identical keys and printf-style format placeholders before emitting compile-time C++ tables. Translation text is compiled into firmware; the device does not need JSON parsing or filesystem access at runtime.

## Crowdin

Create a Crowdin project for the JSON source file, then add these GitHub repository secrets:

- `CROWDIN_PROJECT_ID`
- `CROWDIN_PERSONAL_TOKEN`

The workflow `.github/workflows/crowdin.yml` can be run manually from GitHub Actions. It uploads English source strings, downloads translations, and opens or updates a pull request against `main`.

The workflow grants `contents: write` and `pull-requests: write`. The repository setting **Settings → Actions → General → Workflow permissions** must also allow GitHub Actions to create pull requests. If the workflow log reports that GitHub Actions is not permitted to create pull requests, enable that repository setting; changing the YAML permissions alone does not override it.

Crowdin uses the stable branch name `l10n_crowdin`. If a previous localization PR targets a feature branch, retarget or close that old PR after verifying the new workflow run; do not close a PR containing unique translation updates before comparing its diff.

## Vietnamese font status

The translation catalogs contain Vietnamese text, but that alone does not guarantee correct rendering on the display.

The five generated LVGL text-font files currently use a restricted character set and do not include the full Vietnamese precomposed glyph repertoire. The font-generation command recorded in those C files references these source assets:

- `tools/fonts/ttf/BarlowSemiCondensed-Medium.ttf`
- `tools/fonts/ttf/BarlowSemiCondensed-SemiBold.ttf`
- `tools/fonts/ttf/BarlowCondensed-SemiBold.ttf`
- `tools/fonts/ttf/materialdesignicons-webfont.ttf`

Those TTF files and the previously referenced `tools/fonts/generate_fonts.py` are not present in the current repository tree. Do not hand-edit the generated C bitmap arrays or substitute arbitrary glyph data.

Before regenerating the fonts, restore the licensed source TTFs and the reproducible generator. The text-font character ranges must include at least:

- Latin Extended Vietnamese letters: `U+0102–U+01B0`
- Vietnamese precomposed tone-marked letters: `U+1EA0–U+1EF9`
- Existing ASCII, degree/math punctuation, Turkish characters, and any application-specific symbols already in use

Regenerate all text sizes (12, 14, 16, 20, and 28 px) with the existing Barlow families and weights, preserving the icon-font remappings where used. Keep the 64 px speed font digit-only unless its use changes. Then run the ESP32-S3 build and inspect actual screens for clipping, baseline/line-height issues, missing glyphs, and flash/RAM impact.

Until those source assets are restored and the generated fonts are rebuilt, Vietnamese UI rendering is **not complete** even though `vi.json` and the C++ translation catalog are present.
