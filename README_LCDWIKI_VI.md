# CarCYD – bản port LCDWiki ES3C28P / ES3N28P

Đây là nhánh port phần cứng ban đầu từ mã nguồn CarCYD gốc mà người dùng cung cấp.

## Đã thay đổi

- Chuyển cấu hình bo từ ESP32-2432S028R CYD sang LCDWiki ES3C28P/ES3N28P.
- LCD ILI9341V: SPI SCK=GPIO12, MOSI=GPIO11, MISO=GPIO13, CS=GPIO10, DC=GPIO46; RESET dùng chung EN.
- Đèn nền LCD: GPIO45, active HIGH.
- Cảm ứng FT6336G: I2C SDA=GPIO16, SCL=GPIO15, địa chỉ 0x38; RESET=GPIO18, INT=GPIO17.
- Viết lại đọc cảm ứng FT6336G, bỏ driver XPT2046.
- Giữ nguyên core, LVGL UI, Demo mode, màn hình Dashboard/Live Data/Diagnostics/Trip/Settings.
- Vô hiệu hóa an toàn các phần cứng đặc thù CYD không có cùng giao tiếp trên LCDWiki: LDR, RGB LED ba chân PWM và buzzer PWM.

## Chuẩn bị biên dịch

Mã nguồn gốc yêu cầu ESP32 Arduino core 3.x, LVGL 9.6+ và LovyanGFX 1.2.x. Dùng board ESP32S3 Dev Module, cấu hình Flash 16 MB và PSRAM OPI (N16R8). Không dùng cấu hình CYD 4 MB / PSRAM Disabled.

Mở `CarCYD-ES3C28P/CarCYD-ES3C28P.ino` bằng Arduino IDE sau khi cài đúng thư viện như README gốc.

## Những phần chưa hoàn thành

1. Chưa kiểm tra biên dịch trên máy có Arduino IDE và thư viện phụ thuộc.
2. Chưa thử trực tiếp trên bo thật: cần xác nhận chiều cảm ứng, đảo màu và thứ tự RGB/BGR.
3. Chưa thêm tiếng Việt vào bảng chuỗi giao diện. Hiện UI vẫn có English/Türkçe từ mã nguồn gốc.
4. Chưa có kết nối ELM327 thực tế. DataLink gốc hiện chỉ có DemoLink và NullLink.
5. Chưa có cấu hình PlatformIO; bản gốc dùng Arduino IDE.

## Lưu ý Bluetooth

ESP32-S3 hỗ trợ Bluetooth LE, không hỗ trợ Bluetooth Classic SPP. Nếu bộ ELM327 chỉ dùng Bluetooth Classic thì không thể kết nối trực tiếp theo kiểu SPP; cần xác định đúng model adapter và chọn giao thức phù hợp (BLE hoặc Wi-Fi).

## Tài liệu bo mạch

- https://www.lcdwiki.com/2.8inch_ESP32-S3_Display
- https://www.lcdwiki.com/res/ES3C28P/2.8inch_ES3C28P_ES3N28P_arduino_Demo_Instructions.pdf
