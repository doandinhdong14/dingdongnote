import { z } from 'zod';
import { IsoDateSchema, UuidSchema } from './common.js';
import { TaskSchema } from './tasks.js';
import { HabitSchema } from './habits.js';

export const TodaySummaryQuerySchema = z.object({
  date: IsoDateSchema,
});

export const HabitTodayItemSchema = z.object({
  habit: HabitSchema,
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable().optional(),
});

export type HabitTodayItem = z.infer<typeof HabitTodayItemSchema>;

export const TodaySummaryResponseSchema = z.object({
  date: IsoDateSchema,
  mainFocusTask: TaskSchema.nullable(),
  pendingTasks: z.array(TaskSchema),
  completedTasksCount: z.number().int().min(0),
  habits: z.array(HabitTodayItemSchema),
  todayTotalExpense: z.string(), // string integer in VND
});

export type TodaySummaryResponse = z.infer<typeof TodaySummaryResponseSchema>;

export const FinanceSummaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Tháng phải có định dạng YYYY-MM'),
});

export const CategorySummaryItemSchema = z.object({
  categoryId: UuidSchema,
  categoryName: z.string(),
  type: z.enum(['income', 'expense']),
  totalAmount: z.string(),
  count: z.number().int().min(0),
});

export type CategorySummaryItem = z.infer<typeof CategorySummaryItemSchema>;

export const FinanceSummaryResponseSchema = z.object({
  month: z.string(),
  totalIncome: z.string(),
  totalExpense: z.string(),
  netDifference: z.string(), // totalIncome - totalExpense (can be negative string)
  categories: z.array(CategorySummaryItemSchema),
});

export type FinanceSummaryResponse = z.infer<typeof FinanceSummaryResponseSchema>;
