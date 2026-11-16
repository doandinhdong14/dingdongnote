import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateTransactionSchema,
  UpdateTransactionSchema,
  ListTransactionsQuerySchema,
} from '@dingdong/contracts';
import { defaultStore } from '../store/inMemoryStore.js';
import { requireAuth } from '../middleware/auth.js';

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

function getParamId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

// --- CATEGORIES ---

// GET /categories
categoriesRouter.get('/', (req: Request, res: Response) => {
  const categories = defaultStore.listCategories(req.user!.id);
  res.status(200).json({
    data: categories.map((c) => ({
      ...c,
      archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
    })),
    meta: { requestId: req.id },
  });
});

// POST /categories
categoriesRouter.post('/', (req: Request, res: Response) => {
  const parseResult = CreateCategorySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu danh mục không hợp lệ',
        fields: parseResult.error.flatten().fieldErrors,
      },
      meta: { requestId: req.id },
    });
  }

  const { id = randomUUID(), name, type } = parseResult.data;
  const now = new Date();

  const category = defaultStore.createCategory({
    id,
    userId: req.user!.id,
    name,
    type,
    archivedAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  res.status(201).json({
    data: {
      ...category,
      archivedAt: null,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
      deletedAt: null,
    },
    meta: { requestId: req.id },
  });
});

// PATCH /categories/:id
categoriesRouter.patch('/:id', (req: Request, res: Response) => {
  const category = defaultStore.findCategory(req.user!.id, getParamId(req));
  if (!category) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy danh mục' },
      meta: { requestId: req.id },
    });
  }

  const parseResult = UpdateCategorySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu cập nhật không hợp lệ',
        fields: parseResult.error.flatten().fieldErrors,
      },
      meta: { requestId: req.id },
    });
  }

  const { baseVersion, name, archived } = parseResult.data;
  if (category.version !== baseVersion) {
    return res.status(409).json({
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Dữ liệu đã thay đổi trên máy chủ',
        details: { currentVersion: category.version },
      },
      meta: { requestId: req.id },
    });
  }

  if (name !== undefined) category.name = name;
  if (archived !== undefined) {
    category.archivedAt = archived ? new Date() : null;
  }

  category.version += 1;
  category.updatedAt = new Date();
  defaultStore.updateCategory(category);

  res.status(200).json({
    data: {
      ...category,
      archivedAt: category.archivedAt ? category.archivedAt.toISOString() : null,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
      deletedAt: null,
    },
    meta: { requestId: req.id },
  });
});

// DELETE /categories/:id (archived if used in transactions)
categoriesRouter.delete('/:id', (req: Request, res: Response) => {
  const category = defaultStore.findCategory(req.user!.id, getParamId(req));
  if (!category) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy danh mục' },
      meta: { requestId: req.id },
    });
  }

  // Check if used in transactions
  const hasTransactions = defaultStore
    .listTransactions(req.user!.id)
    .some((t) => t.categoryId === category.id);

  if (hasTransactions) {
    // Spec: Danh mục đã dùng chỉ lưu trữ, giữ tên trong lịch sử
    category.archivedAt = new Date();
    category.version += 1;
    category.updatedAt = new Date();
    defaultStore.updateCategory(category);

    return res.status(200).json({
      data: {
        id: category.id,
        version: category.version,
        archived: true,
        message: 'Danh mục đã có giao dịch nên được chuyển vào lưu trữ',
      },
      meta: { requestId: req.id },
    });
  }

  category.deletedAt = new Date();
  category.version += 1;
  category.updatedAt = new Date();
  defaultStore.updateCategory(category);

  res.status(200).json({
    data: { id: category.id, version: category.version, deleted: true },
    meta: { requestId: req.id },
  });
});

// --- TRANSACTIONS ---

// GET /transactions
transactionsRouter.get('/', (req: Request, res: Response) => {
  const query = ListTransactionsQuerySchema.parse(req.query || {});

  const txs = defaultStore.listTransactions(req.user!.id, {
    from: query.from,
    to: query.to,
    type: query.type,
    categoryId: query.categoryId,
    limit: query.limit,
  });

  res.status(200).json({
    data: txs.map((t) => {
      const category = defaultStore.findCategory(req.user!.id, t.categoryId);
      return {
        ...t,
        amount: t.amount.toString(),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        deletedAt: t.deletedAt ? t.deletedAt.toISOString() : null,
        category: category
          ? {
              ...category,
              archivedAt: category.archivedAt ? category.archivedAt.toISOString() : null,
              createdAt: category.createdAt.toISOString(),
              updatedAt: category.updatedAt.toISOString(),
              deletedAt: null,
            }
          : undefined,
      };
    }),
    meta: { requestId: req.id },
  });
});

// POST /transactions
transactionsRouter.post('/', (req: Request, res: Response) => {
  const parseResult = CreateTransactionSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu giao dịch không hợp lệ',
        fields: parseResult.error.flatten().fieldErrors,
      },
      meta: { requestId: req.id },
    });
  }

  const { id = randomUUID(), categoryId, type, amount, currency, transactionDate, note } = parseResult.data;

  // Validate category ownership & matching type
  const category = defaultStore.findCategory(req.user!.id, categoryId);
  if (!category) {
    return res.status(400).json({
      error: { code: 'INVALID_CATEGORY', message: 'Danh mục không tồn tại' },
      meta: { requestId: req.id },
    });
  }

  if (category.type !== type) {
    return res.status(400).json({
      error: { code: 'TYPE_MISMATCH', message: `Loại giao dịch (${type}) không khớp loại danh mục (${category.type})` },
      meta: { requestId: req.id },
    });
  }

  const now = new Date();
  const tx = defaultStore.createTransaction({
    id,
    userId: req.user!.id,
    categoryId,
    type,
    amount: BigInt(amount),
    currency,
    transactionDate,
    note: note || null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  res.status(201).json({
    data: {
      ...tx,
      amount: tx.amount.toString(),
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
      deletedAt: null,
    },
    meta: { requestId: req.id },
  });
});

// GET /transactions/:id
transactionsRouter.get('/:id', (req: Request, res: Response) => {
  const tx = defaultStore.findTransaction(req.user!.id, getParamId(req));
  if (!tx) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy giao dịch' },
      meta: { requestId: req.id },
    });
  }

  res.status(200).json({
    data: {
      ...tx,
      amount: tx.amount.toString(),
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
      deletedAt: null,
    },
    meta: { requestId: req.id },
  });
});

// PATCH /transactions/:id
transactionsRouter.patch('/:id', (req: Request, res: Response) => {
  const tx = defaultStore.findTransaction(req.user!.id, getParamId(req));
  if (!tx) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy giao dịch' },
      meta: { requestId: req.id },
    });
  }

  const parseResult = UpdateTransactionSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu cập nhật không hợp lệ',
        fields: parseResult.error.flatten().fieldErrors,
      },
      meta: { requestId: req.id },
    });
  }

  const { baseVersion, categoryId, type, amount, transactionDate, note } = parseResult.data;
  if (tx.version !== baseVersion) {
    return res.status(409).json({
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Dữ liệu đã thay đổi trên máy chủ',
        details: { currentVersion: tx.version },
      },
      meta: { requestId: req.id },
    });
  }

  const targetCategory = categoryId
    ? defaultStore.findCategory(req.user!.id, categoryId)
    : defaultStore.findCategory(req.user!.id, tx.categoryId);

  if (!targetCategory) {
    return res.status(400).json({
      error: { code: 'INVALID_CATEGORY', message: 'Danh mục không tồn tại' },
      meta: { requestId: req.id },
    });
  }

  const targetType = type || tx.type;
  if (targetCategory.type !== targetType) {
    return res.status(400).json({
      error: { code: 'TYPE_MISMATCH', message: `Loại giao dịch (${targetType}) không khớp loại danh mục (${targetCategory.type})` },
      meta: { requestId: req.id },
    });
  }

  if (categoryId !== undefined) tx.categoryId = categoryId;
  if (type !== undefined) tx.type = type;
  if (amount !== undefined) tx.amount = BigInt(amount);
  if (transactionDate !== undefined) tx.transactionDate = transactionDate;
  if (note !== undefined) tx.note = note;

  tx.version += 1;
  tx.updatedAt = new Date();
  defaultStore.updateTransaction(tx);

  res.status(200).json({
    data: {
      ...tx,
      amount: tx.amount.toString(),
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
      deletedAt: null,
    },
    meta: { requestId: req.id },
  });
});

// DELETE /transactions/:id
transactionsRouter.delete('/:id', (req: Request, res: Response) => {
  const tx = defaultStore.findTransaction(req.user!.id, getParamId(req));
  if (!tx) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy giao dịch' },
      meta: { requestId: req.id },
    });
  }

  const baseVersion = Number(req.body?.baseVersion || req.query?.baseVersion);
  if (baseVersion && tx.version !== baseVersion) {
    return res.status(409).json({
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Dữ liệu đã thay đổi trên máy chủ',
        details: { currentVersion: tx.version },
      },
      meta: { requestId: req.id },
    });
  }

  tx.deletedAt = new Date();
  tx.version += 1;
  tx.updatedAt = new Date();
  defaultStore.updateTransaction(tx);

  res.status(200).json({
    data: { id: tx.id, version: tx.version, deleted: true },
    meta: { requestId: req.id },
  });
});
