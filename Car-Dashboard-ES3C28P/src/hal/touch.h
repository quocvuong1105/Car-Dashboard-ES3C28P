/**
 * @file touch.h
 * LVGL pointer input for the FT6336G capacitive touch controller, with a
 * per-unit affine correction (user calibration).
 */
#pragma once

#include <lvgl.h>
#include <stdint.h>

#include "../core/platform.h"
#include "../core/storage.h"
#include "../core/touch_calibration.h"

namespace hal::touch {

/** Creates the LVGL input device and loads the stored calibration. */
void init(core::Storage& storage);

/** True if a user calibration is stored (false on first boot). */
bool calibrated();

/** Sample in the current screen orientation, before the user correction. */
bool read_raw(platform::TouchSample& out);

/** Applies a correction computed in the current orientation and stores it. */
void apply_calibration(const core::TouchCalibration& cal);

void set_enabled(bool enabled);

/** True while a finger is on the panel; used by UI idle and hold gestures. */
bool pressed();
uint32_t last_activity_ms();
/** Returns true once for each uninterrupted five-second hold. */
bool take_five_second_hold();

}  // namespace hal::touch
