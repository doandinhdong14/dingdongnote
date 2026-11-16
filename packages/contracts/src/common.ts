import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Phải có định dạng YYYY-MM-DD');
export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export const TimeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Phải có định dạng HH:mm');

export const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const ApiResponseMetaSchema = z.object({
  requestId: z.string().optional(),
  nextCursor: z.string().optional(),
});

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  fields: z.record(z.string()).optional(),
  details: z.any().optional(),
});

export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema.optional(),
    meta: ApiResponseMetaSchema.optional(),
    error: ApiErrorSchema.optional(),
  });
}

export interface ApiResponse<T> {
  data?: T;
  meta?: {
    requestId?: string;
    nextCursor?: string;
  };
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    details?: any;
  };
}
