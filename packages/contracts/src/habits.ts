import { z } from 'zod';
import { UuidSchema, IsoDateSchema, IsoDateTimeSchema, TimeStringSchema, PaginationQuerySchema } from './common.js';

export const WeekdaySchema = z.number().int().min(1).max(7); // ISO 1=Monday .. 7=Sunday

export const HabitScheduleSchema = z.object({
  id: UuidSchema,
  habitId: UuidSchema,
  validFrom: IsoDateSchema,
  validTo: IsoDateSchema.nullable().optional(),
  weekdays: z.array(WeekdaySchema).min(1),
  reminderTime: TimeStringSchema.nullable().optional(),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
  mode: z.enum(['notification']).default('notification'),
});

export type HabitSchedule = z.infer<typeof HabitScheduleSchema>;

export const HabitSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  name: z.string().trim().min(1, 'Tên thói quen không được để trống').max(120),
  startDate: IsoDateSchema,
  archivedAt: z.string().datetime().nullable().optional(),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
  currentSchedule: HabitScheduleSchema.optional(),
});

export type Habit = z.infer<typeof HabitSchema>;

export const CreateHabitSchema = z.object({
  id: UuidSchema.optional(),
  name: z.string().trim().min(1, 'Tên thói quen không được để trống').max(120),
  startDate: IsoDateSchema,
  weekdays: z.array(WeekdaySchema).min(1, 'Phải chọn ít nhất 1 ngày trong tuần'),
  reminderTime: TimeStringSchema.optional().nullable(),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
  baseVersion: z.number().int().min(0).default(0),
});

export type CreateHabitInput = z.infer<typeof CreateHabitSchema>;

export const UpdateHabitSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  archived: z.boolean().optional(),
  baseVersion: z.number().int().min(1),
});

export type UpdateHabitInput = z.infer<typeof UpdateHabitSchema>;

export const UpdateHabitScheduleSchema = z.object({
  weekdays: z.array(WeekdaySchema).min(1, 'Phải chọn ít nhất 1 ngày trong tuần'),
  reminderTime: TimeStringSchema.optional().nullable(),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
});

export type UpdateHabitScheduleInput = z.infer<typeof UpdateHabitScheduleSchema>;

export const HabitCompletionSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  habitId: UuidSchema,
  localDate: IsoDateSchema,
  completedAt: IsoDateTimeSchema,
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export type HabitCompletion = z.infer<typeof HabitCompletionSchema>;

export const ListHabitsQuerySchema = PaginationQuerySchema.extend({
  archived: z.coerce.boolean().optional(),
});

export type ListHabitsQuery = z.infer<typeof ListHabitsQuerySchema>;
