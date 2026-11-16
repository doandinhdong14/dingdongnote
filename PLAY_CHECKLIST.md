# Google Play Console — Bảng kiểm tra nghiệm thu (Release Checklist)

*Áp dụng cho Giai đoạn 9 — DingDongNote (`com.dingdongnote.app`)*

---

### Bảng kiểm tra 10 hạng mục bắt buộc

| STT | Hạng mục kiểm tra | Chi tiết thực hiện | Trạng thái kỹ thuật |
|---|---|---|---|
| 1 | **Chính sách Quyền riêng tư (Privacy Policy)** | Đã soạn thảo tại `PRIVACY_POLICY.md`. Cần đưa lên URL công khai (ví dụ GitHub Pages hoặc domain Railway). | Đã sẵn sàng nội dung |
| 2 | **Khai báo An toàn Dữ liệu (Data Safety)** | Khai báo: Thu thập Email (Xác thực tài khoản), Dữ liệu người dùng tạo (Ghi chú, Việc làm, Thu chi). Mã hóa truyền tải qua HTTPS/TLS. Không chia sẻ bên thứ ba. | Đã khớp thiết kế |
| 3 | **Cơ chế Xóa tài khoản (Account Deletion)** | Google Play bắt buộc có xóa tài khoản trong app và hướng dẫn web. Đã triển khai `DELETE /api/v1/me` (yêu cầu mật khẩu xác thực) và giao diện xóa trong Cài đặt. | Đã triển khai và test đạt |
| 4 | **Khai báo Quyền hệ thống (Permissions)** | `POST_NOTIFICATIONS` (thông báo Android 13+) và `SCHEDULE_EXACT_ALARM` (nhắc đúng giờ). Đã khai báo trong `app.json`. | Đã cấu hình |
| 5 | **Khai báo Tính năng Tài chính (Financial Features)** | Chọn loại hình: Ghi chép thu chi cá nhân thủ công (Personal Expense Tracker). Không cung cấp dịch vụ ngân hàng, cho vay hoặc đầu tư tài chính. | Đã xác nhận trong spec |
| 6 | **Xếp hạng nội dung (Content Rating)** | Hoàn thành bảng câu hỏi IARC trong Google Play Console. Không có nội dung bạo lực, cờ bạc hay nội dung nhạy cảm. | Đạt PEGI 3 / Everyone |
| 7 | **Hồ sơ Build Production AAB** | Cấu hình `eas.json` profile `production` xuất file định dạng Android App Bundle (`.aab`). Tăng `versionCode` tuần tự mỗi lần build. | Đã cấu hình `eas.json` |
| 8 | **Testing Track nội bộ (Closed Testing)** | Tạo danh sách kiểm thử nội bộ trên Google Play Console; đưa tài khoản Gmail của chủ sản phẩm vào nhóm tester. | Sẵn sàng khi submit |
| 9 | **Kiểm thử trên thiết bị OPPO thực tế** | Kiểm tra quyền chạy nền ColorOS, thiết lập thông báo màn hình khóa, âm thanh chuông ding-dong và hành động "Đã xong" / "Snooze". | Theo ma trận mục 9.4 |
| 10 | **Kế hoạch Rollback & Phục hồi** | Quy trình Rollback trên Railway và khôi phục dữ liệu từ bản sao lưu đã kiểm chứng theo tài liệu `RUNBOOK.md`. | Đã sẵn sàng runbook |

---

### Lệnh tạo bản phát hành AAB gửi Google Play

```bash
cd apps/mobile
npx eas build --profile production --platform android
```
File `.aab` sau khi build thành công được tải về và tải lên Google Play Console (Track Internal Test hoặc Closed Test).
