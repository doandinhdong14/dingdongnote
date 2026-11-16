import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const app = createApp();

const server = app.listen(PORT, HOST, () => {
  console.log(`[DingDongNote API] Server running at http://${HOST}:${PORT}`);
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
