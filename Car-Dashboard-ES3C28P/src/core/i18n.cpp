#include "i18n.h"
namespace core::i18n {
namespace {
Language g_language = Language::English;
const char* const* active_catalog() {
  switch (g_language) {
    case Language::Turkish: return i18n_generated::kTurkish;
    case Language::Vietnamese: return i18n_generated::kVietnamese;
    case Language::English:
    default: return i18n_generated::kEnglish;
  }
}
}
void set_language(Language lang) {
  g_language = static_cast<uint8_t>(lang) < static_cast<uint8_t>(Language::Count) ? lang : Language::English;
}
Language language() { return g_language; }
const char* get(Str id) {
  const uint16_t index = static_cast<uint16_t>(id);
  return index < static_cast<uint16_t>(Str::Count) ? active_catalog()[index] : "";
}
const char* language_name(Language lang) {
  switch (lang) {
    case Language::Turkish: return "Türkçe";
    case Language::Vietnamese: return "Tiếng Việt";
    case Language::English:
    default: return "English";
  }
}
}
