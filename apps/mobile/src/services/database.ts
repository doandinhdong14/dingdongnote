import * as SQLite from 'expo-sqlite';
import { SyncMutation } from '@dingdong/contracts';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('dingdongnote.db');
    initDatabaseSchema(dbInstance);
  }
  return dbInstance;
}

export function initDatabaseSchema(db: SQLite.SQLiteDatabase) {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      planned_date TEXT,
      due_at TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      completed_at TEXT,
      note_id TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_focus (
      user_id TEXT NOT NULL,
      local_date TEXT NOT NULL,
      task_id TEXT NOT NULL,
      PRIMARY KEY (user_id, local_date)
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      archived_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS habit_schedules (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      valid_to TEXT,
      weekdays TEXT NOT NULL,
      reminder_time TEXT,
      timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
      mode TEXT NOT NULL DEFAULT 'notification',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      habit_id TEXT NOT NULL,
      local_date TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      UNIQUE (user_id, habit_id, local_date)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      archived_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'VND',
      transaction_date TEXT NOT NULL,
      note TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      mutation_id TEXT UNIQUE NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      base_version INTEGER NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS notification_jobs (
      id TEXT PRIMARY KEY,
      os_notification_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      occurrence_key TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'notification',
      state TEXT NOT NULL DEFAULT 'scheduled',
      user_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drafts (
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      draft_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (entity_type, entity_id)
    );
  `);
}

export interface OutboxRecord {
  id: string;
  mutationId: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  baseVersion: number;
  payloadJson: string;
  createdAt: string;
  attempts: number;
  status: 'pending' | 'syncing' | 'conflict';
  errorMessage?: string;
}

export const localDb = {
  // Outbox
  queueMutation(mutation: SyncMutation): void {
    const db = getDatabase();
    db.runSync(
      `INSERT INTO outbox (id, mutation_id, entity_type, entity_id, action, base_version, payload_json, created_at, attempts, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
      [
        mutation.mutationId,
        mutation.mutationId,
        mutation.entityType,
        mutation.entityId,
        mutation.action,
        mutation.baseVersion,
        JSON.stringify(mutation.payload),
        new Date().toISOString(),
      ]
    );
  },

  getPendingMutations(limit = 50): OutboxRecord[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      `SELECT id, mutation_id as mutationId, entity_type as entityType, entity_id as entityId,
              action, base_version as baseVersion, payload_json as payloadJson, created_at as createdAt,
              attempts, status, error_message as errorMessage
       FROM outbox
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT ?`,
      [limit]
    );
    return rows;
  },

  removeOutboxMutation(mutationId: string): void {
    const db = getDatabase();
    db.runSync(`DELETE FROM outbox WHERE mutation_id = ?`, [mutationId]);
  },

  markOutboxConflict(mutationId: string, errorMsg: string): void {
    const db = getDatabase();
    db.runSync(
      `UPDATE outbox SET status = 'conflict', error_message = ? WHERE mutation_id = ?`,
      [errorMsg, mutationId]
    );
  },

  getPendingOutboxCount(): number {
    const db = getDatabase();
    const row = db.getFirstSync<{ count: number }>(
      `SELECT count(*) as count FROM outbox WHERE status = 'pending'`
    );
    return row?.count || 0;
  },

  // Notification Jobs
  saveNotificationJob(job: {
    id: string;
    osNotificationId: string;
    entityId: string;
    occurrenceKey: string;
    scheduledAt: string;
    mode: string;
    userId: string;
  }): void {
    const db = getDatabase();
    db.runSync(
      `INSERT OR REPLACE INTO notification_jobs (id, os_notification_id, entity_id, occurrence_key, scheduled_at, mode, state, user_id)
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
      [
        job.id,
        job.osNotificationId,
        job.entityId,
        job.occurrenceKey,
        job.scheduledAt,
        job.mode,
        job.userId,
      ]
    );
  },

  cancelNotificationJobByEntity(entityId: string): string[] {
    const db = getDatabase();
    const rows = db.getAllSync<{ os_notification_id: string }>(
      `SELECT os_notification_id FROM notification_jobs WHERE entity_id = ?`,
      [entityId]
    );
    db.runSync(`DELETE FROM notification_jobs WHERE entity_id = ?`, [entityId]);
    return rows.map((r) => r.os_notification_id);
  },

  getScheduledJobs(): any[] {
    const db = getDatabase();
    return db.getAllSync(`SELECT * FROM notification_jobs WHERE state = 'scheduled'`);
  },

  clearAllLocalData(): void {
    const db = getDatabase();
    db.execSync(`
      DELETE FROM notes;
      DELETE FROM tasks;
      DELETE FROM daily_focus;
      DELETE FROM habits;
      DELETE FROM habit_schedules;
      DELETE FROM habit_completions;
      DELETE FROM categories;
      DELETE FROM transactions;
      DELETE FROM outbox;
      DELETE FROM notification_jobs;
      DELETE FROM drafts;
    `);
  },
};
