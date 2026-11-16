import { z } from 'zod';
import { UuidSchema, PaginationQuerySchema } from './common.js';
import { NoteSchema } from './notes.js';
import { TaskSchema, TaskReminderSchema } from './tasks.js';
import { HabitSchema, HabitCompletionSchema, HabitScheduleSchema } from './habits.js';
import { CategorySchema, TransactionSchema } from './finance.js';

export const SyncEntityTypeSchema = z.enum([
  'notes',
  'tasks',
  'habits',
  'habit_schedules',
  'habit_completions',
  'categories',
  'transactions',
  'task_reminders',
  'daily_focus',
]);

export type SyncEntityType = z.infer<typeof SyncEntityTypeSchema>;

export const SyncActionSchema = z.enum(['create', 'update', 'delete']);
export type SyncAction = z.infer<typeof SyncActionSchema>;

export const SyncMutationSchema = z.object({
  mutationId: UuidSchema,
  entityType: SyncEntityTypeSchema,
  entityId: UuidSchema,
  action: SyncActionSchema,
  baseVersion: z.number().int().min(0),
  payload: z.record(z.any()),
});

export type SyncMutation = z.infer<typeof SyncMutationSchema>;

export const PushMutationsRequestSchema = z.object({
  mutations: z.array(SyncMutationSchema).min(1).max(50),
});

export type PushMutationsRequest = z.infer<typeof PushMutationsRequestSchema>;

export const MutationResultStatusSchema = z.enum(['applied', 'conflict', 'duplicate']);
export type MutationResultStatus = z.infer<typeof MutationResultStatusSchema>;

export const MutationResultSchema = z.object({
  mutationId: UuidSchema,
  entityId: UuidSchema,
  status: MutationResultStatusSchema,
  version: z.number().int().optional(),
  entity: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
});

export type MutationResult = z.infer<typeof MutationResultSchema>;

export const PushMutationsResponseSchema = z.object({
  results: z.array(MutationResultSchema),
});

export type PushMutationsResponse = z.infer<typeof PushMutationsResponseSchema>;

export const CreateSnapshotResponseSchema = z.object({
  snapshotId: UuidSchema,
  expiresAt: z.string().datetime(),
  totalCount: z.number().int().min(0),
});

export type CreateSnapshotResponse = z.infer<typeof CreateSnapshotResponseSchema>;

export const SnapshotPageQuerySchema = PaginationQuerySchema;

export const SnapshotItemSchema = z.object({
  entityType: SyncEntityTypeSchema,
  entityId: UuidSchema,
  data: z.any(),
  version: z.number().int(),
  deleted: z.boolean().default(false),
});

export type SnapshotItem = z.infer<typeof SnapshotItemSchema>;

export const SnapshotPageResponseSchema = z.object({
  snapshotId: UuidSchema,
  items: z.array(SnapshotItemSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
});

export type SnapshotPageResponse = z.infer<typeof SnapshotPageResponseSchema>;
