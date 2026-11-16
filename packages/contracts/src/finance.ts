import { z } from 'zod';
import { UuidSchema, IsoDateSchema, PaginationQuerySchema } from './common.js';

export const TransactionTypeSchema = z.enum(['income', 'expense']);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export const MoneyAmountSchema = z.string().regex(/^[1-9]\d{0,11}$/, 'Số tiền phải là số nguyên dương từ 1 đến 999.999.999.999 VND');

export const CategorySchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  name: z.string().trim().min(1, 'Tên danh mục không được để trống').max(100),
  type: TransactionTypeSchema,
  archivedAt: z.string().datetime().nullable().optional(),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

export const CreateCategorySchema = z.object({
  id: UuidSchema.optional(),
  name: z.string().trim().min(1, 'Tên danh mục không được để trống').max(100),
  type: TransactionTypeSchema,
  baseVersion: z.number().int().min(0).default(0),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  archived: z.boolean().optional(),
  baseVersion: z.number().int().min(1),
});

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

export const TransactionSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  categoryId: UuidSchema,
  type: TransactionTypeSchema,
  amount: MoneyAmountSchema,
  currency: z.literal('VND').default('VND'),
  transactionDate: IsoDateSchema,
  note: z.string().max(500).optional().nullable(),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
  category: CategorySchema.optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const CreateTransactionSchema = z.object({
  id: UuidSchema.optional(),
  categoryId: UuidSchema,
  type: TransactionTypeSchema,
  amount: MoneyAmountSchema,
  currency: z.literal('VND').default('VND'),
  transactionDate: IsoDateSchema,
  note: z.string().max(500).optional().nullable(),
  baseVersion: z.number().int().min(0).default(0),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

export const UpdateTransactionSchema = z.object({
  categoryId: UuidSchema.optional(),
  type: TransactionTypeSchema.optional(),
  amount: MoneyAmountSchema.optional(),
  transactionDate: IsoDateSchema.optional(),
  note: z.string().max(500).optional().nullable(),
  baseVersion: z.number().int().min(1),
});

export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

export const ListTransactionsQuerySchema = PaginationQuerySchema.extend({
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
  type: TransactionTypeSchema.optional(),
  categoryId: UuidSchema.optional(),
});

export type ListTransactionsQuery = z.infer<typeof ListTransactionsQuerySchema>;
