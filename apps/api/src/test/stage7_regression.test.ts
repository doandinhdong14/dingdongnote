import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { createOrResetMasterUser } from '../scripts/admin.js';
import { calculateHabitWeeklyProgress, calculateVndTotals } from '@dingdong/contracts';

describe('Stage 7 - Regression, Edge Cases & Compliance Tests', () => {
  const app = createApp();
  const server = app.listen(0);
  let baseUrl: string;
  let testToken: string;
  let testUserId: string;

  before(async () => {
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    const user = await createOrResetMasterUser('stage7.test@example.com', 'password123456', 'Tester 7');
    testUserId = user.id;

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'stage7.test@example.com', password: 'password123456' }),
    });
    const data = (await res.json()) as any;
    testToken = data.data.accessToken;
  });

  after(() => {
    server.close();
  });

  // 1. Habit denominator edge cases
  test('Habit Denominator: Excludes rest days and days before start date', () => {
    // Habit starts on Wednesday 2026-11-18. Scheduled Mon(1), Wed(3), Fri(5).
    // Eval dates in 7-day window: 2026-11-16 (Mon) to 2026-11-22 (Sun)
    const evalDates = [
      '2026-11-16', // Mon (before start date -> excluded)
      '2026-11-17', // Tue (rest day -> excluded)
      '2026-11-18', // Wed (start date & scheduled -> included)
      '2026-11-19', // Thu (rest day -> excluded)
      '2026-11-20', // Fri (scheduled -> included)
      '2026-11-21', // Sat (rest day -> excluded)
      '2026-11-22', // Sun (rest day -> excluded)
    ];

    // Only completed Wed
    const res = calculateHabitWeeklyProgress({
      startDate: '2026-11-18',
      weekdays: [1, 3, 5],
      completions: ['2026-11-18'],
      evalDates,
    });

    // Total scheduled due = Wed & Fri = 2 days
    // Completed = 1 day
    // Rate = 50%
    assert.equal(res.scheduledDueCount, 2);
    assert.equal(res.completedCount, 1);
    assert.equal(res.ratePercentage, 50);
  });

  // 2. Large VND BigInt math without float rounding
  test('Finance Math: Accurately calculates large numbers up to 999.999.999.999 without float errors', () => {
    const transactions = [
      { type: 'income' as const, amount: '500000000000' },
      { type: 'income' as const, amount: '499999999999' },
      { type: 'expense' as const, amount: '123456789123' },
    ];

    const result = calculateVndTotals(transactions);
    assert.equal(result.totalIncome, '999999999999');
    assert.equal(result.totalExpense, '123456789123');
    assert.equal(result.netDifference, '876543210876');
  });

  // 3. User Data Export (GDPR / Data Safety)
  test('Compliance: GET /me/export returns complete structured data', async () => {
    const res = await fetch(`${baseUrl}/me/export`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.ok(body.data.exportedAt);
    assert.equal(body.data.user.email, 'stage7.test@example.com');
    assert.ok(Array.isArray(body.data.notes));
    assert.ok(Array.isArray(body.data.tasks));
  });

  // 4. Re-authenticated Account Deletion
  test('Security: DELETE /me requires correct password and purges user data', async () => {
    // Wrong password -> 401
    const wrongRes = await fetch(`${baseUrl}/me`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ password: 'wrongpassword' }),
    });
    assert.equal(wrongRes.status, 401);

    // Correct password -> 200
    const correctRes = await fetch(`${baseUrl}/me`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ password: 'password123456' }),
    });
    assert.equal(correctRes.status, 200);

    // Subsequent call with token fails with 404
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert.equal(meRes.status, 404);
  });
});
