import { z } from 'zod';
import { UuidSchema, PaginationQuerySchema } from './common.js';

export const NoteSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  title: z.string().max(200),
  body: z.string().max(50000),
  pinned: z.boolean().default(false),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export type Note = z.infer<typeof NoteSchema>;

export const CreateNoteSchema = z.object({
  id: UuidSchema.optional(),
  title: z.string().max(200).optional().default(''),
  body: z.string().max(50000).default(''),
  pinned: z.boolean().optional().default(false),
  baseVersion: z.number().int().min(0).default(0),
}).refine(data => data.title.trim().length > 0 || data.body.trim().length > 0, {
  message: 'Ghi chú phải có tiêu đề hoặc nội dung',
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

export const UpdateNoteSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().max(50000).optional(),
  pinned: z.boolean().optional(),
  baseVersion: z.number().int().min(1),
});

export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;

export const ListNotesQuerySchema = PaginationQuerySchema.extend({
  q: z.string().optional(),
  pinned: z.coerce.boolean().optional(),
});

export type ListNotesQuery = z.infer<typeof ListNotesQuerySchema>;
