import { createApp } from './app.js';
import { createOrResetMasterUser } from './scripts/admin.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const app = createApp();

const server = app.listen(PORT, HOST, async () => {
  console.log(`[DingDongNote API] Server running at http://${HOST}:${PORT}`);
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'doandinhdong1405@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'DingDong@2026!';
    await createOrResetMasterUser(adminEmail, adminPassword, 'Đoàn Đình Đông', 'Asia/Ho_Chi_Minh');
  } catch (err) {
    console.error('[DingDongNote API] Error seeding master user:', err);
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
