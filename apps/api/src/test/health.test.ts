import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { AddressInfo } from 'node:net';

describe('Health Routes', () => {
  const app = createApp();
  const server = app.listen(0);

  after(() => {
    server.close();
  });

  test('GET /health/live returns 200 OK', async () => {
    const port = (server.address() as AddressInfo).port;
    const res = await fetch(`http://127.0.0.1:${port}/health/live`);
    assert.equal(res.status, 200);

    const body = await res.json() as { status: string; timestamp: string };
    assert.equal(body.status, 'ok');
    assert.ok(body.timestamp);
  });

  test('GET /api/v1 returns 200 with service info', async () => {
    const port = (server.address() as AddressInfo).port;
    const res = await fetch(`http://127.0.0.1:${port}/api/v1`);
    assert.equal(res.status, 200);

    const body = await res.json() as { name: string; version: string; requestId: string };
    assert.equal(body.name, 'DingDongNote API');
    assert.equal(body.version, 'v1');
    assert.ok(body.requestId);
  });

  test('GET /not-found returns 404 with standard error format', async () => {
    const port = (server.address() as AddressInfo).port;
    const res = await fetch(`http://127.0.0.1:${port}/some-random-route`);
    assert.equal(res.status, 404);

    const body = await res.json() as { error: { code: string; message: string }; meta: { requestId: string } };
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.ok(body.meta.requestId);
  });
});
