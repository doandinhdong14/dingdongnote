import { z } from 'zod';
import { UuidSchema, IsoDateSchema, IsoDateTimeSchema, PaginationQuerySchema } from './common.js';

export const TaskPrioritySchema = z.enum(['normal', 'high']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskStatusSchema = z.enum(['pending', 'completed']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  title: z.string().min(1, 'Tiêu đề không được để trống').max(255),
  description: z.string().max(10000).optional().nullable(),
  plannedDate: IsoDateSchema.optional().nullable(),
  dueAt: IsoDateTimeSchema.optional().nullable(),
  priority: TaskPrioritySchema.default('normal'),
  status: TaskStatusSchema.default('pending'),
  completedAt: IsoDateTimeSchema.optional().nullable(),
  noteId: UuidSchema.optional().nullable(),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = z.object({
  id: UuidSchema.optional(),
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(255),
  description: z.string().max(10000).optional().nullable(),
  plannedDate: IsoDateSchema.optional().nullable(),
  dueAt: IsoDateTimeSchema.optional().nullable(),
  priority: TaskPrioritySchema.optional().default('normal'),
  noteId: UuidSchema.optional().nullable(),
  baseVersion: z.number().int().min(0).default(0),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().max(10000).optional().nullable(),
  plannedDate: IsoDateSchema.optional().nullable(),
  dueAt: IsoDateTimeSchema.optional().nullable(),
  priority: TaskPrioritySchema.optional(),
  status: TaskStatusSchema.optional(),
  noteId: UuidSchema.optional().nullable(),
  baseVersion: z.number().int().min(1),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const TaskReminderSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  taskId: UuidSchema,
  scheduledAt: IsoDateTimeSchema,
  timezone: z.string(),
  mode: z.enum(['notification']).default('notification'),
  enabled: z.boolean().default(true),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export type TaskReminder = z.infer<typeof TaskReminderSchema>;

export const SetTaskReminderSchema = z.object({
  scheduledAt: IsoDateTimeSchema,
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
  mode: z.enum(['notification']).default('notification'),
  baseVersion: z.number().int().min(0).default(0),
});

export type SetTaskReminderInput = z.infer<typeof SetTaskReminderSchema>;

export const ListTasksQuerySchema = PaginationQuerySchema.extend({
  status: TaskStatusSchema.optional(),
  plannedDate: IsoDateSchema.optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
});

export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;

export const SetDailyFocusSchema = z.object({
  taskId: UuidSchema,
});

export type SetDailyFocusInput = z.infer<typeof SetDailyFocusSchema>;
