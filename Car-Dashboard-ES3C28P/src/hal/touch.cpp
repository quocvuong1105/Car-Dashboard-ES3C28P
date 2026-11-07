#include "touch.h"

#include <Arduino.h>
#include <Wire.h>

#include "../config/board_config.h"
#include "../core/log.h"
#include "../core/persist.h"
#include "../core/settings.h"
#include "../core/util.h"
#include "display.h"
#include "lcd.h"

namespace hal::touch {
namespace {
constexpr uint8_t kPressDebounce = 1;
constexpr uint8_t kRegTouchStatus = 0x02;
constexpr uint8_t kRegPoint1 = 0x03;

struct StoredCalibration {
  core::TouchCalibration cal;
  uint32_t orientation;
};

core::Storage* g_storage = nullptr;
lv_indev_t* g_indev = nullptr;
core::TouchCalibration g_cal = core::TouchCalibration::identity();
bool g_calibrated = false;
bool g_enabled = true;
uint8_t g_press_count = 0;
lv_point_t g_last{0, 0};
bool g_i2c_ready = false;
uint32_t g_mirror_hold_started = 0;
bool g_mirror_hold_triggered = false;
bool g_suppress_touch_until_release = false;

bool read_registers(uint8_t reg, uint8_t* data, size_t len) {
  if (!g_i2c_ready) return false;
  Wire.beginTransmission(board::kTouchAddress);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  const size_t received = Wire.requestFrom(static_cast<uint8_t>(board::kTouchAddress),
                                           static_cast<uint8_t>(len), static_cast<uint8_t>(true));
  if (received != len) return false;
  for (size_t i = 0; i < len; ++i) data[i] = Wire.read();
  return true;
}

/** Read the first FT6336G contact and convert native portrait to landscape. */
bool read_landscape_point(int32_t& x, int32_t& y) {
  uint8_t status = 0;
  if (!read_registers(kRegTouchStatus, &status, 1)) return false;
  if ((status & 0x0F) == 0) return false;

  uint8_t p[4] = {};
  if (!read_registers(kRegPoint1, p, sizeof(p))) return false;
  const int32_t raw_x = ((p[0] & 0x0F) << 8) | p[1];
  const int32_t raw_y = ((p[2] & 0x0F) << 8) | p[3];

  // LVGL dashboard is landscape (320x240), LCD controller native is portrait.
  x = core::clamp<int32_t>(raw_y, 0, board::kLcdHeight - 1);
  y = core::clamp<int32_t>(board::kLcdWidth - 1 - raw_x, 0, board::kLcdWidth - 1);
  return true;
}

core::TouchCalibration active_calibration() {
  core::TouchCalibration cal = g_cal;
  if (display::flipped()) cal = cal.rotated_180(lcd().width(), lcd().height());
  if (display::mirrored()) cal = cal.mirrored_x(lcd().width());
  return cal;
}

void read_cb(lv_indev_t*, lv_indev_data_t* data) {
  int32_t x = 0, y = 0;
  const bool pressed = g_enabled && read_landscape_point(x, y);
  if (!pressed) {
    g_suppress_touch_until_release = false;
    g_press_count = 0;
    g_mirror_hold_started = 0;
    g_mirror_hold_triggered = false;
    data->state = LV_INDEV_STATE_RELEASED;
    data->point = g_last;
    return;
  }
  if (g_suppress_touch_until_release) {
    data->state = LV_INDEV_STATE_RELEASED;
    data->point = g_last;
    return;
  }
  if (g_press_count < kPressDebounce) ++g_press_count;
  if (!g_mirror_hold_triggered && core::settings::get().mirror_screen) {
    const uint32_t now = millis();
    if (g_mirror_hold_started == 0) g_mirror_hold_started = now;
    else if (core::elapsed(now, g_mirror_hold_started) >= 5000) {
      core::settings::edit().mirror_screen = false;
      core::settings::commit(core::settings::kChangeOrientation);
      g_mirror_hold_triggered = true;
      g_suppress_touch_until_release = true;
      data->state = LV_INDEV_STATE_RELEASED;
      data->point = g_last;
      LOG_I("TOUCH", "5-second hold: Mirror Screen disabled");
      return;
    }
  }
  const core::TouchPoint mapped = active_calibration().map(x, y);
  g_last.x = core::clamp<int32_t>(mapped.x, 0, lcd().width() - 1);
  g_last.y = core::clamp<int32_t>(mapped.y, 0, lcd().height() - 1);
  data->point = g_last;
  data->state = g_press_count >= kPressDebounce ? LV_INDEV_STATE_PRESSED : LV_INDEV_STATE_RELEASED;
}
}  // namespace

void init(core::Storage& storage) {
  g_storage = &storage;
  pinMode(board::kTouchRst, OUTPUT);
  digitalWrite(board::kTouchRst, LOW);
  delay(5);
  digitalWrite(board::kTouchRst, HIGH);
  delay(120);

  Wire.begin(board::kTouchSda, board::kTouchScl, 400000);
  Wire.setTimeOut(20);
  g_i2c_ready = true;
  uint8_t chip_id = 0;
  if (read_registers(0xA8, &chip_id, 1)) {
    LOG_I("TOUCH", "FT6336G online, chip ID 0x%02X", chip_id);
  } else {
    LOG_W("TOUCH", "FT6336G not responding at I2C 0x%02X", board::kTouchAddress);
  }

  StoredCalibration stored{core::TouchCalibration::identity(), 0};
  const auto result = core::persist::load(storage, core::storage_key::kTouchCal, &stored, sizeof(stored));
  if (result == core::persist::LoadResult::Missing) {
    LOG_I("TOUCH", "no calibration stored, using nominal mapping");
  } else if (result != core::persist::LoadResult::Ok) {
    LOG_W("TOUCH", "stored calibration invalid, recalibration required");
  } else if (stored.orientation != lcd_orientation_id() || !stored.cal.plausible()) {
    LOG_W("TOUCH", "calibration belongs to another board/orientation; recalibration required");
  } else {
    g_cal = stored.cal;
    g_calibrated = true;
  }

  g_indev = lv_indev_create();
  lv_indev_set_type(g_indev, LV_INDEV_TYPE_POINTER);
  lv_indev_set_read_cb(g_indev, read_cb);
}

bool calibrated() { return g_calibrated; }

bool read_raw(platform::TouchSample& out) {
  int32_t x = 0, y = 0;
  out.pressed = read_landscape_point(x, y);
  out.raw_x = static_cast<int16_t>(x);
  out.raw_y = static_cast<int16_t>(y);
  out.pressure = out.pressed ? 1 : 0;
  return g_i2c_ready;
}

void apply_calibration(const core::TouchCalibration& cal) {
  core::TouchCalibration base = cal;
  if (display::flipped()) base = base.rotated_180(lcd().width(), lcd().height());
  if (display::mirrored()) base = base.mirrored_x(lcd().width());
  if (!base.plausible()) {
    LOG_W("TOUCH", "rejected implausible calibration");
    return;
  }
  g_cal = base;
  g_calibrated = true;
  if (g_storage != nullptr) {
    const StoredCalibration stored{g_cal, lcd_orientation_id()};
    core::persist::save(*g_storage, core::storage_key::kTouchCal, core::kTouchCalibrationVersion,
                        &stored, sizeof(stored));
  }
  LOG_I("TOUCH", "FT6336G calibration saved");
}

void set_enabled(bool enabled) {
  g_enabled = enabled;
  g_press_count = 0;
  if (g_indev != nullptr) lv_indev_reset(g_indev, nullptr);
}
}  // namespace hal::touch
