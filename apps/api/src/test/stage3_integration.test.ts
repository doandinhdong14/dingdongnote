import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { createOrResetMasterUser } from '../scripts/admin.js';

describe('Stage 3 - Backend Integration & Ownership Tests', () => {
  const app = createApp();
  const server = app.listen(0);
  let baseUrl: string;

  let tokenUserA: string;
  let refreshUserA: string;
  let userIdA: string;

  let tokenUserB: string;
  let userIdB: string;

  before(async () => {
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    // Seed User A
    const userA = await createOrResetMasterUser('user.a@example.com', 'password123456', 'User A');
    userIdA = userA.id;

    // Seed User B
    const userB = await createOrResetMasterUser('user.b@example.com', 'password123456', 'User B');
    userIdB = userB.id;

    // Login User A
    const resA = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user.a@example.com', password: 'password123456' }),
    });
    const dataA = (await resA.json()) as any;
    tokenUserA = dataA.data.accessToken;
    refreshUserA = dataA.data.refreshToken;

    // Login User B
    const resB = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user.b@example.com', password: 'password123456' }),
    });
    const dataB = (await resB.json()) as any;
    tokenUserB = dataB.data.accessToken;
  });

  after(() => {
    server.close();
  });

  // 1. Auth & Refresh Rotation
  test('Auth: Refresh rotation revokes old token and detects token reuse', async () => {
    // 1st refresh
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshUserA }),
    });
    assert.equal(refreshRes.status, 200);
    const refreshData = (await refreshRes.json()) as any;
    assert.ok(refreshData.data.accessToken);
    assert.ok(refreshData.data.refreshToken);

    // Reuse old token -> Must return 401 TOKEN_REUSED
    const reuseRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshUserA }),
    });
    assert.equal(reuseRes.status, 401);
    const reuseData = (await reuseRes.json()) as any;
    assert.equal(reuseData.error.code, 'TOKEN_REUSED');
  });

  // 2. Two-User Ownership Isolation
  test('Ownership: User B cannot view, edit or delete User A resources', async () => {
    // User A creates a note
    const noteRes = await fetch(`${baseUrl}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ title: 'Ghi chú bí mật của A', body: 'Nội dung riêng' }),
    });
    assert.equal(noteRes.status, 201);
    const noteA = (await noteRes.json()) as any;

    // User B tries to GET User A's note -> 404
    const getResB = await fetch(`${baseUrl}/notes/${noteA.data.id}`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert.equal(getResB.status, 404);

    // User B tries to PATCH User A's note -> 404
    const patchResB = await fetch(`${baseUrl}/notes/${noteA.data.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserB}`,
      },
      body: JSON.stringify({ title: 'User B cố sửa', baseVersion: 1 }),
    });
    assert.equal(patchResB.status, 404);

    // User B tries to DELETE User A's note -> 404
    const deleteResB = await fetch(`${baseUrl}/notes/${noteA.data.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert.equal(deleteResB.status, 404);
  });

  // 3. Stale BaseVersion Conflict Check
  test('Conflict: Updating with stale baseVersion returns 409 VERSION_CONFLICT', async () => {
    // User A creates a task
    const taskRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ title: 'Task kiểm tra version' }),
    });
    const task = (await taskRes.json()) as any;
    assert.equal(task.data.version, 1);

    // User A updates task to version 2
    const update1 = await fetch(`${baseUrl}/tasks/${task.data.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ title: 'Task v2', baseVersion: 1 }),
    });
    assert.equal(update1.status, 200);

    // Second client attempts update with stale baseVersion = 1 -> 409
    const updateStale = await fetch(`${baseUrl}/tasks/${task.data.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ title: 'Task stale', baseVersion: 1 }),
    });
    assert.equal(updateStale.status, 409);
    const staleData = (await updateStale.json()) as any;
    assert.equal(staleData.error.code, 'VERSION_CONFLICT');
    assert.equal(staleData.error.details.currentVersion, 2);
  });

  // 4. Task Completion and Reminder Cancelling
  test('Task: Completion sets completedAt and cancels reminder', async () => {
    const taskRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ title: 'Họp đội phát triển', plannedDate: '2026-11-16' }),
    });
    const task = (await taskRes.json()) as any;

    // Set reminder
    const remRes = await fetch(`${baseUrl}/tasks/${task.data.id}/reminder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ scheduledAt: '2026-11-16T15:00:00Z', timezone: 'Asia/Ho_Chi_Minh' }),
    });
    assert.equal(remRes.status, 200);

    // Complete task
    const completeRes = await fetch(`${baseUrl}/tasks/${task.data.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ status: 'completed', baseVersion: 1 }),
    });
    assert.equal(completeRes.status, 200);
    const completedTask = (await completeRes.json()) as any;
    assert.equal(completedTask.data.status, 'completed');
    assert.ok(completedTask.data.completedAt);

    // Verify reminder is now removed/null
    const getTask = await fetch(`${baseUrl}/tasks/${task.data.id}`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    const taskData = (await getTask.json()) as any;
    assert.equal(taskData.data.reminder, null);
  });

  // 5. Habit Rules: Cannot mark future dates
  test('Habit: Rejects marking future dates and schedule takes effect next day', async () => {
    const habitRes = await fetch(`${baseUrl}/habits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({
        name: 'Đọc sách 30 phút',
        startDate: '2026-11-16',
        weekdays: [1, 2, 3, 4, 5],
        reminderTime: '21:00',
      }),
    });
    assert.equal(habitRes.status, 201);
    const habit = (await habitRes.json()) as any;

    // Try to mark a future date (e.g. 2099-01-01) -> 400
    const futureRes = await fetch(`${baseUrl}/habits/${habit.data.id}/completions/2099-01-01`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert.equal(futureRes.status, 400);
    const futureData = (await futureRes.json()) as any;
    assert.equal(futureData.error.code, 'FUTURE_DATE_NOT_ALLOWED');

    // Mark today -> 200 OK
    const today = new Date().toISOString().split('T')[0];
    const todayRes = await fetch(`${baseUrl}/habits/${habit.data.id}/completions/${today}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert.equal(todayRes.status, 200);

    // Update schedule -> validFrom must be tomorrow
    const updateScheduleRes = await fetch(`${baseUrl}/habits/${habit.data.id}/schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({
        weekdays: [1, 3, 5, 7],
        reminderTime: '07:00',
        timezone: 'Asia/Ho_Chi_Minh',
      }),
    });
    assert.equal(updateScheduleRes.status, 200);
    const schedData = (await updateScheduleRes.json()) as any;
    assert.ok(schedData.data.validFrom > today);
  });

  // 6. Finance: Exact VND integer calculation, type check, summary
  test('Finance: Validates category matching type and aggregates month summary accurately', async () => {
    // Create expense category
    const catRes = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ name: 'Ăn uống', type: 'expense' }),
    });
    assert.equal(catRes.status, 201);
    const category = (await catRes.json()) as any;

    // Attempt to create income transaction with expense category -> 400 TYPE_MISMATCH
    const mismatchRes = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({
        categoryId: category.data.id,
        type: 'income',
        amount: '50000',
        transactionDate: '2026-11-16',
      }),
    });
    assert.equal(mismatchRes.status, 400);
    const mismatchData = (await mismatchRes.json()) as any;
    assert.equal(mismatchData.error.code, 'TYPE_MISMATCH');

    // Create valid expense transaction: 35.000 VND
    const tx1Res = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({
        categoryId: category.data.id,
        type: 'expense',
        amount: '35000',
        transactionDate: '2026-11-16',
        note: 'Cà phê sáng',
      }),
    });
    assert.equal(tx1Res.status, 201);

    // Create income category & transaction: 15.000.000 VND
    const catIncome = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ name: 'Lương', type: 'income' }),
    });
    const incomeCategory = (await catIncome.json()) as any;

    const tx2Res = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({
        categoryId: incomeCategory.data.id,
        type: 'income',
        amount: '15000000',
        transactionDate: '2026-11-16',
      }),
    });
    assert.equal(tx2Res.status, 201);

    // Check Finance Summary for 2026-11
    const summaryRes = await fetch(`${baseUrl}/summary/finance?month=2026-11`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert.equal(summaryRes.status, 200);
    const summary = (await summaryRes.json()) as any;

    assert.equal(summary.data.totalIncome, '15000000');
    assert.equal(summary.data.totalExpense, '35000');
    assert.equal(summary.data.netDifference, '14965000');
    assert.equal(summary.data.categories.length, 2);
  });

  // 7. Sync Mutations & Snapshots
  test('Sync: Push mutations with duplicate detection and consistent snapshots', async () => {
    const mutationId = 'd0b8180f-90e8-4663-b24d-847e09ab1677';
    const entityId = 'a1b2c3d4-e5f6-47a8-b9c0-112233445566';

    // 1st push mutation
    const push1 = await fetch(`${baseUrl}/sync/mutations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({
        mutations: [
          {
            mutationId,
            entityType: 'notes',
            entityId,
            action: 'create',
            baseVersion: 0,
            payload: { title: 'Ghi chú đồng bộ offline', body: 'Nội dung test sync' },
          },
        ],
      }),
    });
    assert.equal(push1.status, 200);
    const push1Data = (await push1.json()) as any;
    assert.equal(push1Data.data.results[0].status, 'applied');

    // Retry same mutationId -> status 'duplicate'
    const pushRetry = await fetch(`${baseUrl}/sync/mutations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({
        mutations: [
          {
            mutationId,
            entityType: 'notes',
            entityId,
            action: 'create',
            baseVersion: 0,
            payload: { title: 'Ghi chú đồng bộ offline', body: 'Nội dung test sync' },
          },
        ],
      }),
    });
    assert.equal(pushRetry.status, 200);
    const pushRetryData = (await pushRetry.json()) as any;
    assert.equal(pushRetryData.data.results[0].status, 'duplicate');

    // Create sync snapshot
    const snapRes = await fetch(`${baseUrl}/sync/snapshots`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert.equal(snapRes.status, 201);
    const snapData = (await snapRes.json()) as any;
    assert.ok(snapData.data.snapshotId);
    assert.ok(snapData.data.totalCount > 0);

    // Fetch snapshot page
    const pageRes = await fetch(`${baseUrl}/sync/snapshots/${snapData.data.snapshotId}?limit=10`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert.equal(pageRes.status, 200);
    const pageData = (await pageRes.json()) as any;
    assert.ok(Array.isArray(pageData.data.items));
  });
});
