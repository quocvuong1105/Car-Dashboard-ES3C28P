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

The workflow `.github/workflows/crowdin.yml` can then be run manually from GitHub Actions. It uploads English source strings, downloads translations, and opens a PR against `feature/modular-i18n-crowdin`.

## Vietnamese font note

The existing LVGL Barlow font C files were generated with an explicit ASCII/Turkish glyph list. The current repository does not include the original Barlow TTF source assets referenced in the old font-generation command. Vietnamese JSON strings are ready, but full Vietnamese rendering requires regenerating the LVGL text fonts with the Vietnamese precomposed glyph ranges (including U+0102–U+01B0 and U+1EA0–U+1EF9) using the licensed Barlow source TTFs. Until that font update is supplied and compiled, some Vietnamese diacritics may render as missing-glyph boxes.
