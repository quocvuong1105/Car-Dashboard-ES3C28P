# Yêu cầu thay đổi: Display Mode, xoay 180° và Mirror

> Trạng thái: **Chờ người dùng xác nhận trước khi triển khai mã nguồn.**
>
> Commit này chỉ ghi nhận đặc tả/yêu cầu. Không thay đổi firmware, giao diện, cấu hình build hoặc mã nguồn hiện có.

## 1. Thay Auto Brightness bằng Display Mode

Trong **Setup / màn hình (Display)**, thay tùy chọn **Auto Brightness** bằng **Display Mode** gồm ba chế độ:

- **Light**: luôn sử dụng giao diện sáng.
- **Dark**: luôn sử dụng giao diện tối.
- **Follow Vehicle**: tự chuyển Light/Dark theo trạng thái đèn xe.

Yêu cầu:
1. Loại bỏ Auto Brightness và logic tự động điều chỉnh giao diện dựa trên cảm biến ánh sáng.
2. Loại bỏ thanh/thông tin trạng thái cảm biến ánh sáng khỏi giao diện.
3. Giữ điều chỉnh độ sáng màn hình thủ công nếu phần cứng/driver hiện tại hỗ trợ.
4. Lưu Display Mode trong Settings/Preferences và khôi phục đúng lựa chọn sau khi khởi động lại.
5. Ở Follow Vehicle, đọc trạng thái đèn xe từ dữ liệu CAN/OBD nếu xe và bộ chuyển đổi hỗ trợ PID/tham số phù hợp. Không giả định mọi ELM327 hoặc mọi xe đều cung cấp tín hiệu này.
6. Nếu không đọc được trạng thái đèn xe, không tự suy diễn từ cảm biến ánh sáng; giữ trạng thái giao diện ổn định và có cách xử lý lỗi rõ ràng.

## 2. Sửa xoay màn hình 180°

- Khi bật Rotate Screen 180°, hình ảnh hiển thị xoay 180°.
- Tọa độ cảm ứng phải được biến đổi đồng bộ với hình ảnh để thao tác chạm/kéo vẫn đúng vị trí.
- Không làm thay đổi hành vi cảm ứng ở chế độ xoay bình thường.
- Lưu lựa chọn sau khi khởi động lại nếu thiết lập hiện tại có cơ chế lưu Settings.

## 3. Thêm chế độ Mirror

- Thêm tùy chọn **Mirror Screen** trong phần Setup/Display.
- Khi bật, lật hình ảnh theo chiều ngang (trục trái-phải).
- Biến đổi tọa độ cảm ứng tương ứng để vùng chạm khớp với hình ảnh đã lật.
- Phối hợp đúng với Rotate Screen 180°; kiểm tra riêng từng chế độ và khi bật đồng thời cả hai.
- Lưu lựa chọn Mirror trong Settings/Preferences để giữ sau khi khởi động lại.
- Có thao tác khôi phục nhanh: nhấn giữ bất kỳ vị trí nào trên màn hình trong 5 giây để tắt Mirror (Mirror OFF); không tự thay đổi các thiết lập khác.

## 4. Phạm vi kiểm tra và nghiệm thu

- Kiểm tra đủ ba Display Mode: Light, Dark, Follow Vehicle.
- Kiểm tra lưu/khôi phục Display Mode, Rotate 180° và Mirror sau khi khởi động lại.
- Kiểm tra cảm ứng tại các góc và vùng trung tâm ở các tổ hợp: bình thường, Rotate 180°, Mirror, Rotate 180° + Mirror.
- Kiểm tra thao tác chạm, vuốt/kéo trong các màn hình và popup.
- Kiểm tra trường hợp CAN/OBD không hỗ trợ hoặc mất dữ liệu trạng thái đèn; không để giao diện nhấp nháy hoặc đổi chế độ ngoài ý muốn.
- Giữ nguyên các chức năng khác ngoài phạm vi yêu cầu.

## 5. Quy trình làm việc bắt buộc

1. Commit đặc tả này trước, chưa sửa mã nguồn.
2. Gửi người dùng liên kết branch và commit để xác nhận nội dung.
3. Chỉ bắt đầu sửa mã nguồn sau khi người dùng xác nhận rõ ràng.
4. Khi triển khai, commit các thay đổi mã nguồn lên chính branch này và gửi lại liên kết commit (SHA đầy đủ), danh sách file thay đổi, kết quả build/kiểm tra và các giới hạn phần cứng nếu có.
5. Không merge vào main nếu chưa được người dùng yêu cầu.
