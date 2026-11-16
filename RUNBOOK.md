# DingDongNote — Vận hành & Hướng dẫn triển khai (Runbook)

Tài liệu hướng dẫn vận hành cho Backend trên Railway và Mobile trên Expo EAS (Phục vụ Giai đoạn 8 & 9).

---

## 1. Môi trường Backend trên Railway

### 1.1 Các biến môi trường cần thiết (`Environment Variables`)
Thiết lập trên giao diện Railway Service:
* `NODE_ENV`: `production`
* `PORT`: `3000` (hoặc cổng do Railway tự cấp)
* `DATABASE_URL`: URL kết nối PostgreSQL private nội bộ Railway
* `JWT_SECRET`: Khóa bí mật JWT tối thiểu 32 ký tự ngẫu nhiên
* `JWT_ISSUER`: `dingdongnote-api`
* `JWT_AUDIENCE`: `dingdongnote-app`
* `ACCESS_TOKEN_TTL`: `900` (15 phút)
* `REFRESH_TOKEN_TTL`: `2592000` (30 ngày)
* `REGISTRATION_ENABLED`: `false` (bản cá nhân tắt đăng ký mở)
* `LOG_LEVEL`: `info`

### 1.2 Khởi tạo cơ sở dữ liệu và Migrations
Sau khi kết nối PostgreSQL trên Railway:
```bash
# Áp dụng migration đã kiểm duyệt vào DB production
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

### 1.3 Tạo hoặc Đặt lại mật khẩu tài khoản chủ sở hữu (Master Account)
Chạy script quản trị an toàn trên Railway CLI:
```bash
node -e "require('./apps/api/dist/scripts/admin.js').createOrResetMasterUser('doandinhdong@gmail.com', 'MatKhauBaoMat123!', 'Đoàn Đình Đông')"
```

---

## 2. Quy trình Sao lưu & Phục hồi (Backup & Restore)

* **Chính sách:** Sao lưu hằng ngày (giữ 7 bản gần nhất) và sao lưu hằng tuần (giữ 4 bản).
* **Mục tiêu:** RPO 24 giờ, RTO 4 giờ.
* **Lệnh sao lưu thủ công:**
  ```bash
  pg_dump -Fc $DATABASE_URL > backup_$(date +%Y%m%d).dump
  ```
* **Lệnh kiểm thử phục hồi (Restore Test vào DB phụ):**
  ```bash
  pg_restore -d $TEST_DATABASE_URL -c backup_YYYYMMDD.dump
  ```
* *Lưu ý:* Không coi bản backup là hoàn tất nếu chưa thực hiện kiểm thử restore sang DB riêng.

---

## 3. Kế hoạch Hoàn tác (Rollback Plan)

* **Rollback API:** Nếu phiên bản mới gặp lỗi crash hoặc 5xx, trên Railway Dashboard chọn Deployment trước đó và bấm **Rollback**. Do các migration đều thiết kế tương thích lùi (backward-compatible), phiên bản code cũ vẫn hoạt động trơn tru.
* **Rollback Migration phá hủy:** Khôi phục từ bản backup snapshot gần nhất theo quy trình ở mục 2.

---

## 4. Build APK cá nhân cho điện thoại OPPO (Giai đoạn 8)

Khi chủ sản phẩm cho phép build và có tài khoản Expo:
```bash
cd apps/mobile

# Đăng nhập EAS CLI
npx eas login

# Build file APK cài trực tiếp trên máy OPPO cá nhân
npx eas build --profile preview --platform android
```
Tải file `.apk` cài vào điện thoại OPPO của chủ sản phẩm và kiểm tra ma trận thông báo mục 9.4.
