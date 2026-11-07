/**
 * @file display.h
 * LVGL display driver: partial rendering into two DMA-capable buffers that are
 * streamed to the panel while LVGL renders the next chunk.
 */
#pragma once

#include <lvgl.h>

namespace hal::display {

/** Initialises the panel and creates the LVGL display. Returns null on failure. */
lv_display_t* init(bool flipped, bool mirrored);

/** Rotates the picture by 180 degrees (e.g. for an upside-down mounting). */
void set_orientation(bool flipped, bool mirrored);

bool flipped();
bool mirrored();

}  // namespace hal::display
