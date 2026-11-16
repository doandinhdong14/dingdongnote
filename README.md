# DingDongNote (dingdongnote.app)

> Ứng dụng quản lý cuộc sống cá nhân: Ghi chú, Việc cần làm (Daily Focus), Thói quen (Habits) và Sổ thu chi (VND).  
> **Chủ sản phẩm:** Đoàn Đình Đông  
> **Package ID:** `com.dingdongnote.app`  
> **Kiến trúc:** Monorepo npm workspaces (`packages/contracts`, `apps/api`, `apps/mobile`)

---

## 📌 Tổng quan kiến trúc & Tech Stack

- **Monorepo:** npm workspaces kết nối TypeScript project references.
- **Mobile (`apps/mobile`):**
  - React Native + Expo SDK 58 + Expo Router (File-based navigation).
  - Database Offline: `expo-sqlite` (chế độ WAL, 10 bảng dữ liệu).
  - Bảo mật Token: `expo-secure-store` cho opaque Refresh Token.
  - Thông báo: `expo-notifications` hỗ trợ Android notification channels (`tasks` & `habits`) với priority HIGH, rung, âm thanh và interactive action buttons (✓ Đã xong / ⏰ Nhắc lại 10 phút).
- **Backend API (`apps/api`):**
  - Node.js + Express + TypeScript.
  - ORM: Prisma Client + PostgreSQL (deploy sẵn sàng trên Railway).
  - Xác thực: Argon2id (OWASP recommendation) + Access Token (JWT 15m) + Token Family Refresh Token (30 ngày) chống tấn công replay.
  - Phân quyền & Cô lập: Multi-tenant ownership isolation ở tầng query, không ai truy cập được dữ liệu của nhau.
  - Version Control: `baseVersion` optimistic concurrency check (mã lỗi `409 VERSION_CONFLICT`).
- **Contracts (`packages/contracts`):**
  - Định nghĩa chuẩn Zod schema & TypeScript types dùng chung giữa Mobile & Backend.
  - Phép tính tiền tệ VND không sai số (`BigInt` math) và công thức habit weekly completion.

---

## 🚀 Hướng dẫn Cài đặt & Chạy Local

### 1. Cài đặt dependencies và Build contracts
```bash
# Cài đặt toàn bộ dependencies trong monorepo
npm install

# Build các package TypeScript (contracts & api)
npm run build

# Kiểm tra tính toàn vẹn type
npm run typecheck

# Chạy toàn bộ test suites (Contracts validation + API integration + Regression tests)
npm run test
```

### 2. Khởi chạy Backend API
```bash
# Di chuyển vào apps/api hoặc dùng workspace command
cd apps/api
cp .env.example .env

# Chạy server ở chế độ dev
npm run dev

# Tạo tài khoản chủ sở hữu (Admin Script)
npx tsx src/scripts/admin.ts create <email> <password>
```
Backend API sẽ lắng nghe tại: `http://localhost:3000`  
Healthcheck endpoint: `http://localhost:3000/health/live`

### 3. Khởi chạy ứng dụng Mobile
```bash
cd apps/mobile
cp .env.example .env

# Chạy Metro Bundler
npm run start
```
- Quét mã QR bằng ứng dụng **Expo Go** hoặc cài đặt development build trên điện thoại Android (OPPO).
- Đăng nhập bằng tài khoản chủ sở hữu đã tạo qua Admin script.

---

## 📱 Kiểm thử Thông báo trên Điện thoại OPPO (ColorOS)

1. Vào tab **Cài đặt (Settings)** trong ứng dụng DingDongNote.
2. Nhấn nút **"Phát lời nhắc mẫu (Thử nghiệm OPPO)"**.
3. Sau 3 giây, thông báo sẽ hiển thị trên thanh trạng thái với 2 nút hành động:
   - `✓ Đã làm`: Đánh dấu hoàn thành ngay lập tức và đồng bộ vào Outbox.
   - `⏰ Nhắc lại 10 phút`: Hoãn lời nhắc tự động (Snooze).
4. **Lưu ý tối ưu ColorOS:**
   - Vào Cài đặt máy > *Quản lý ứng dụng* > *DingDongNote* > *Mức tiêu thụ pin* > Bật *Cho phép hoạt động dưới nền*.
   - Cho phép hiển thị trên Màn hình khóa và Biểu ngữ.

---

## 🛡️ Tài liệu Vận hành & Phát hành

- [RUNBOOK.md](file:///c:/Users/Administrator/Downloads/nghich/RUNBOOK.md) — Hướng dẫn cấu hình Railway, Database migrations, Backup/Restore test và quy trình Rollback sự cố.
- [PRIVACY_POLICY.md](file:///c:/Users/Administrator/Downloads/nghich/PRIVACY_POLICY.md) — Chính sách quyền riêng tư theo tiêu chuẩn Google Play Developer Policy.
- [STORE_LISTING.md](file:///c:/Users/Administrator/Downloads/nghich/STORE_LISTING.md) — Bản mô tả ứng dụng, tiêu đề, ảnh chụp màn hình và metadata chuẩn bị đăng tải lên Play Store.
- [PLAY_CHECKLIST.md](file:///c:/Users/Administrator/Downloads/nghich/PLAY_CHECKLIST.md) — Danh mục 10 tiêu chí kiểm tra phát hành (Google Play Release Checklist).

---

## 🧪 Kết quả Kiểm thử (Test Suite)

Dự án trang bị 18 unit và integration tests tự động:
- **Contracts Validation:** Kiểm tra schema Note, Task, Habit weekdays, và MoneyAmount VND range.
- **Health & Error Handling:** Chuẩn hóa format lỗi theo chuẩn envelope `{ error: { code, message } }`.
- **Auth & Refresh Token Family:** Xoay vòng token, thu hồi token cũ, phát hiện token reuse.
- **Ownership Isolation:** Đảm bảo User B tuyệt đối không xem, sửa hoặc xóa dữ liệu của User A.
- **Optimistic Concurrency:** Bắt lỗi 409 khi cập nhật bản ghi có `baseVersion` cũ.
- **Habit Scheduling & Completion:** Chặn điểm danh ngày tương lai, thay đổi lịch có hiệu lực từ ngày kế tiếp, mẫu số loại trừ ngày nghỉ và ngày trước ngày bắt đầu.
- **Finance VND Precision:** Tính toán chuẩn xác đến hàng trăm tỷ đồng không gặp lỗi làm tròn số thực của JavaScript.
- **Sync Mutations & Snapshots:** Gửi mutation theo lô, phát hiện trùng lặp idempotency, phân trang snapshot.
- **GDPR & Play Policy Compliance:** `GET /me/export` xuất toàn bộ dữ liệu người dùng; `DELETE /me` xác thực lại mật khẩu và xóa sạch dữ liệu.
