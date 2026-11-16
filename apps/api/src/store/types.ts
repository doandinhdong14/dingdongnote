export interface DbUser {
  id: string;
  emailNormalized: string;
  passwordHash: string;
  displayName: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbSession {
  id: string;
  userId: string;
  refreshHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  deviceLabel?: string | null;
  createdAt: Date;
}

export interface DbNote {
  id: string;
  userId: string;
  title: string;
  body: string;
  pinned: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DbTask {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  plannedDate: string | null;
  dueAt: Date | null;
  priority: 'normal' | 'high';
  status: 'pending' | 'completed';
  completedAt: Date | null;
  noteId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DbDailyFocus {
  userId: string;
  localDate: string;
  taskId: string;
}

export interface DbHabit {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  archivedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DbHabitSchedule {
  id: string;
  habitId: string;
  validFrom: string;
  validTo: string | null;
  weekdays: number[];
  reminderTime: string | null;
  timezone: string;
  mode: string;
  createdAt: Date;
}

export interface DbHabitCompletion {
  id: string;
  userId: string;
  habitId: string;
  localDate: string;
  completedAt: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DbCategory {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  archivedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DbTransaction {
  id: string;
  userId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: bigint;
  currency: string;
  transactionDate: string;
  note: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DbTaskReminder {
  id: string;
  userId: string;
  taskId: string;
  scheduledAt: Date;
  timezone: string;
  mode: string;
  enabled: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DbProcessedMutation {
  userId: string;
  mutationId: string;
  payloadHash: string;
  responseJson: string;
  createdAt: Date;
}

export interface DbSyncSnapshot {
  id: string;
  userId: string;
  expiresAt: Date;
  snapshotData: string;
  createdAt: Date;
}
