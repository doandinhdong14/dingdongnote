import {
  DbUser,
  DbSession,
  DbNote,
  DbTask,
  DbDailyFocus,
  DbHabit,
  DbHabitSchedule,
  DbHabitCompletion,
  DbCategory,
  DbTransaction,
  DbTaskReminder,
  DbProcessedMutation,
  DbSyncSnapshot,
} from './types.js';

export class InMemoryDataStore {
  users = new Map<string, DbUser>();
  usersByEmail = new Map<string, string>(); // emailNormalized -> userId
  sessions = new Map<string, DbSession>();
  sessionsByRefreshHash = new Map<string, string>(); // refreshHash -> sessionId

  notes = new Map<string, DbNote>();
  tasks = new Map<string, DbTask>();
  dailyFocus = new Map<string, DbDailyFocus>(); // `${userId}:${localDate}` -> DbDailyFocus

  habits = new Map<string, DbHabit>();
  habitSchedules = new Map<string, DbHabitSchedule>();
  habitCompletions = new Map<string, DbHabitCompletion>(); // `${userId}:${habitId}:${localDate}` -> DbHabitCompletion

  categories = new Map<string, DbCategory>();
  transactions = new Map<string, DbTransaction>();
  taskReminders = new Map<string, DbTaskReminder>();

  processedMutations = new Map<string, DbProcessedMutation>(); // `${userId}:${mutationId}` -> DbProcessedMutation
  syncSnapshots = new Map<string, DbSyncSnapshot>();

  clear() {
    this.users.clear();
    this.usersByEmail.clear();
    this.sessions.clear();
    this.sessionsByRefreshHash.clear();
    this.notes.clear();
    this.tasks.clear();
    this.dailyFocus.clear();
    this.habits.clear();
    this.habitSchedules.clear();
    this.habitCompletions.clear();
    this.categories.clear();
    this.transactions.clear();
    this.taskReminders.clear();
    this.processedMutations.clear();
    this.syncSnapshots.clear();
  }

  // User & Auth
  findUserByEmail(email: string): DbUser | null {
    const normalized = email.trim().toLowerCase();
    const id = this.usersByEmail.get(normalized);
    if (!id) return null;
    return this.users.get(id) || null;
  }

  findUserById(id: string): DbUser | null {
    return this.users.get(id) || null;
  }

  createUser(user: DbUser): DbUser {
    this.users.set(user.id, user);
    this.usersByEmail.set(user.emailNormalized, user.id);
    return user;
  }

  updateUser(id: string, updates: Partial<DbUser>): DbUser | null {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  // Session
  createSession(session: DbSession): DbSession {
    this.sessions.set(session.id, session);
    this.sessionsByRefreshHash.set(session.refreshHash, session.id);
    return session;
  }

  findSessionByRefreshHash(refreshHash: string): DbSession | null {
    const id = this.sessionsByRefreshHash.get(refreshHash);
    if (!id) return null;
    return this.sessions.get(id) || null;
  }

  revokeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.revokedAt = new Date();
    }
  }

  revokeSessionFamily(familyId: string): void {
    for (const session of this.sessions.values()) {
      if (session.familyId === familyId) {
        session.revokedAt = new Date();
      }
    }
  }

  revokeAllUserSessions(userId: string): void {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.revokedAt = new Date();
      }
    }
  }

  // Notes
  listNotes(userId: string, query?: { q?: string; pinned?: boolean; limit?: number; cursor?: string }): DbNote[] {
    const result: DbNote[] = [];
    for (const note of this.notes.values()) {
      if (note.userId !== userId || note.deletedAt !== null) continue;
      if (query?.pinned !== undefined && note.pinned !== query.pinned) continue;
      if (query?.q) {
        const q = query.q.toLowerCase();
        if (!note.title.toLowerCase().includes(q) && !note.body.toLowerCase().includes(q)) {
          continue;
        }
      }
      result.push(note);
    }

    // Sort: pinned first, then updatedAt DESC
    result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    const limit = query?.limit || 50;
    return result.slice(0, limit);
  }

  findNote(userId: string, noteId: string): DbNote | null {
    const note = this.notes.get(noteId);
    if (!note || note.userId !== userId || note.deletedAt !== null) return null;
    return note;
  }

  createNote(note: DbNote): DbNote {
    this.notes.set(note.id, note);
    return note;
  }

  updateNote(note: DbNote): DbNote {
    this.notes.set(note.id, note);
    return note;
  }

  // Tasks
  listTasks(userId: string, query?: { status?: string; plannedDate?: string; from?: string; to?: string; limit?: number }): DbTask[] {
    const result: DbTask[] = [];
    for (const task of this.tasks.values()) {
      if (task.userId !== userId || task.deletedAt !== null) continue;
      if (query?.status && task.status !== query.status) continue;
      if (query?.plannedDate && task.plannedDate !== query.plannedDate) continue;
      if (query?.from && task.plannedDate && task.plannedDate < query.from) continue;
      if (query?.to && task.plannedDate && task.plannedDate > query.to) continue;
      result.push(task);
    }

    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const limit = query?.limit || 50;
    return result.slice(0, limit);
  }

  findTask(userId: string, taskId: string): DbTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.userId !== userId || task.deletedAt !== null) return null;
    return task;
  }

  createTask(task: DbTask): DbTask {
    this.tasks.set(task.id, task);
    return task;
  }

  updateTask(task: DbTask): DbTask {
    this.tasks.set(task.id, task);
    return task;
  }

  // Daily Focus
  getDailyFocus(userId: string, localDate: string): DbDailyFocus | null {
    return this.dailyFocus.get(`${userId}:${localDate}`) || null;
  }

  setDailyFocus(userId: string, localDate: string, taskId: string): DbDailyFocus {
    const focus: DbDailyFocus = { userId, localDate, taskId };
    this.dailyFocus.set(`${userId}:${localDate}`, focus);
    return focus;
  }

  removeDailyFocus(userId: string, localDate: string): void {
    this.dailyFocus.delete(`${userId}:${localDate}`);
  }

  // Habits
  listHabits(userId: string, query?: { archived?: boolean; limit?: number }): DbHabit[] {
    const result: DbHabit[] = [];
    for (const habit of this.habits.values()) {
      if (habit.userId !== userId || habit.deletedAt !== null) continue;
      const isArchived = habit.archivedAt !== null;
      if (query?.archived !== undefined && isArchived !== query.archived) continue;
      result.push(habit);
    }
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return result.slice(0, query?.limit || 50);
  }

  findHabit(userId: string, habitId: string): DbHabit | null {
    const habit = this.habits.get(habitId);
    if (!habit || habit.userId !== userId || habit.deletedAt !== null) return null;
    return habit;
  }

  createHabit(habit: DbHabit, schedule: DbHabitSchedule): DbHabit {
    this.habits.set(habit.id, habit);
    this.habitSchedules.set(schedule.id, schedule);
    return habit;
  }

  updateHabit(habit: DbHabit): DbHabit {
    this.habits.set(habit.id, habit);
    return habit;
  }

  getActiveSchedule(habitId: string): DbHabitSchedule | null {
    for (const schedule of this.habitSchedules.values()) {
      if (schedule.habitId === habitId && schedule.validTo === null) {
        return schedule;
      }
    }
    return null;
  }

  createHabitSchedule(schedule: DbHabitSchedule): DbHabitSchedule {
    this.habitSchedules.set(schedule.id, schedule);
    return schedule;
  }

  // Habit Completions
  getHabitCompletion(userId: string, habitId: string, localDate: string): DbHabitCompletion | null {
    const item = this.habitCompletions.get(`${userId}:${habitId}:${localDate}`);
    if (!item || item.deletedAt !== null) return null;
    return item;
  }

  setHabitCompletion(completion: DbHabitCompletion): DbHabitCompletion {
    this.habitCompletions.set(`${completion.userId}:${completion.habitId}:${completion.localDate}`, completion);
    return completion;
  }

  removeHabitCompletion(userId: string, habitId: string, localDate: string): void {
    const key = `${userId}:${habitId}:${localDate}`;
    const item = this.habitCompletions.get(key);
    if (item) {
      item.deletedAt = new Date();
      item.version += 1;
    }
  }

  listCompletionsForDate(userId: string, localDate: string): DbHabitCompletion[] {
    const result: DbHabitCompletion[] = [];
    for (const comp of this.habitCompletions.values()) {
      if (comp.userId === userId && comp.localDate === localDate && comp.deletedAt === null) {
        result.push(comp);
      }
    }
    return result;
  }

  // Categories
  listCategories(userId: string): DbCategory[] {
    const result: DbCategory[] = [];
    for (const cat of this.categories.values()) {
      if (cat.userId === userId && cat.deletedAt === null) {
        result.push(cat);
      }
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }

  findCategory(userId: string, categoryId: string): DbCategory | null {
    const cat = this.categories.get(categoryId);
    if (!cat || cat.userId !== userId || cat.deletedAt !== null) return null;
    return cat;
  }

  createCategory(category: DbCategory): DbCategory {
    this.categories.set(category.id, category);
    return category;
  }

  updateCategory(category: DbCategory): DbCategory {
    this.categories.set(category.id, category);
    return category;
  }

  // Transactions
  listTransactions(userId: string, query?: { from?: string; to?: string; type?: string; categoryId?: string; limit?: number }): DbTransaction[] {
    const result: DbTransaction[] = [];
    for (const tx of this.transactions.values()) {
      if (tx.userId !== userId || tx.deletedAt !== null) continue;
      if (query?.type && tx.type !== query.type) continue;
      if (query?.categoryId && tx.categoryId !== query.categoryId) continue;
      if (query?.from && tx.transactionDate < query.from) continue;
      if (query?.to && tx.transactionDate > query.to) continue;
      result.push(tx);
    }
    result.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.createdAt.getTime() - a.createdAt.getTime());
    return result.slice(0, query?.limit || 50);
  }

  findTransaction(userId: string, txId: string): DbTransaction | null {
    const tx = this.transactions.get(txId);
    if (!tx || tx.userId !== userId || tx.deletedAt !== null) return null;
    return tx;
  }

  createTransaction(tx: DbTransaction): DbTransaction {
    this.transactions.set(tx.id, tx);
    return tx;
  }

  updateTransaction(tx: DbTransaction): DbTransaction {
    this.transactions.set(tx.id, tx);
    return tx;
  }

  // Task Reminders
  getTaskReminder(userId: string, taskId: string): DbTaskReminder | null {
    for (const rem of this.taskReminders.values()) {
      if (rem.userId === userId && rem.taskId === taskId && rem.deletedAt === null) {
        return rem;
      }
    }
    return null;
  }

  setTaskReminder(rem: DbTaskReminder): DbTaskReminder {
    this.taskReminders.set(rem.id, rem);
    return rem;
  }

  removeTaskReminder(userId: string, taskId: string): void {
    for (const rem of this.taskReminders.values()) {
      if (rem.userId === userId && rem.taskId === taskId && rem.deletedAt === null) {
        rem.deletedAt = new Date();
        rem.enabled = false;
        rem.version += 1;
      }
    }
  }

  // Idempotency & Processed Mutations
  getProcessedMutation(userId: string, mutationId: string): DbProcessedMutation | null {
    return this.processedMutations.get(`${userId}:${mutationId}`) || null;
  }

  saveProcessedMutation(mutation: DbProcessedMutation): void {
    this.processedMutations.set(`${mutation.userId}:${mutation.mutationId}`, mutation);
  }

  // Sync Snapshots
  createSyncSnapshot(snapshot: DbSyncSnapshot): DbSyncSnapshot {
    this.syncSnapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  getSyncSnapshot(userId: string, snapshotId: string): DbSyncSnapshot | null {
    const snap = this.syncSnapshots.get(snapshotId);
    if (!snap || snap.userId !== userId) return null;
    if (snap.expiresAt.getTime() < Date.now()) return null;
    return snap;
  }
}

export const defaultStore = new InMemoryDataStore();
