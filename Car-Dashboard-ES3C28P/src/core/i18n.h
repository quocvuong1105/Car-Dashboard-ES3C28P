/** Runtime language selection and generated translation keys. */
#pragma once
#include "i18n_generated.h"
#include "types.h"
namespace core {
namespace i18n {
void set_language(Language lang);
Language language();
const char* get(Str id);
const char* language_name(Language lang);
}
inline const char* tr(Str id) { return i18n::get(id); }
}
