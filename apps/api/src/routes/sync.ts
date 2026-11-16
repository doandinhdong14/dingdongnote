import { Router, Request, Response } from 'express';
import { randomUUID, createHash } from 'node:crypto';
import {
  PushMutationsRequestSchema,
  MutationResult,
  SnapshotItem,
} from '@dingdong/contracts';
import { defaultStore } from '../store/inMemoryStore.js';
import { requireAuth } from '../middleware/auth.js';

export const syncRouter = Router();
syncRouter.use(requireAuth);

function hashPayload(payload: any): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// POST /sync/mutations
syncRouter.post('/mutations', (req: Request, res: Response) => {
  const parseResult = PushMutationsRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu đợt gửi mutations không hợp lệ',
        fields: parseResult.error.flatten().fieldErrors,
      },
      meta: { requestId: req.id },
    });
  }

  const { mutations } = parseResult.data;
  const userId = req.user!.id;
  const results: MutationResult[] = [];

  for (const mut of mutations) {
    const payloadHash = hashPayload(mut.payload);
    const existingProcessed = defaultStore.getProcessedMutation(userId, mut.mutationId);

    if (existingProcessed) {
      if (existingProcessed.payloadHash === payloadHash) {
        // Idempotent duplicate
        results.push({
          mutationId: mut.mutationId,
          entityId: mut.entityId,
          status: 'duplicate',
          entity: JSON.parse(existingProcessed.responseJson),
        });
        continue;
      } else {
        // Same mutationId with different payload -> 409 Conflict
        results.push({
          mutationId: mut.mutationId,
          entityId: mut.entityId,
          status: 'conflict',
          error: {
            code: 'MUTATION_ID_REUSED',
            message: 'Cùng mutationId nhưng payload khác nhau',
          },
        });
        continue;
      }
    }

    // Process mutation by entityType
    try {
      if (mut.entityType === 'notes') {
        if (mut.action === 'create') {
          const now = new Date();
          const note = defaultStore.createNote({
            id: mut.entityId,
            userId,
            title: mut.payload.title || '',
            body: mut.payload.body || '',
            pinned: !!mut.payload.pinned,
            version: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          });

          const entityData = { ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString(), deletedAt: null };
          defaultStore.saveProcessedMutation({
            userId,
            mutationId: mut.mutationId,
            payloadHash,
            responseJson: JSON.stringify(entityData),
            createdAt: now,
          });

          results.push({ mutationId: mut.mutationId, entityId: mut.entityId, status: 'applied', version: 1, entity: entityData });
        } else if (mut.action === 'update') {
          const note = defaultStore.findNote(userId, mut.entityId);
          if (!note) {
            results.push({ mutationId: mut.mutationId, entityId: mut.entityId, status: 'conflict', error: { code: 'NOT_FOUND', message: 'Ghi chú không tồn tại' } });
            continue;
          }
          if (note.version !== mut.baseVersion) {
            results.push({ mutationId: mut.mutationId, entityId: mut.entityId, status: 'conflict', version: note.version, error: { code: 'VERSION_CONFLICT', message: 'Xung đột phiên bản' } });
            continue;
          }

          if (mut.payload.title !== undefined) note.title = mut.payload.title;
          if (mut.payload.body !== undefined) note.body = mut.payload.body;
          if (mut.payload.pinned !== undefined) note.pinned = mut.payload.pinned;
          note.version += 1;
          note.updatedAt = new Date();
          defaultStore.updateNote(note);

          const entityData = { ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString(), deletedAt: null };
          defaultStore.saveProcessedMutation({
            userId,
            mutationId: mut.mutationId,
            payloadHash,
            responseJson: JSON.stringify(entityData),
            createdAt: new Date(),
          });

          results.push({ mutationId: mut.mutationId, entityId: mut.entityId, status: 'applied', version: note.version, entity: entityData });
        } else if (mut.action === 'delete') {
          const note = defaultStore.findNote(userId, mut.entityId);
          if (note) {
            if (note.version !== mut.baseVersion) {
              results.push({ mutationId: mut.mutationId, entityId: mut.entityId, status: 'conflict', version: note.version, error: { code: 'VERSION_CONFLICT', message: 'Xung đột phiên bản' } });
              continue;
            }
            note.deletedAt = new Date();
            note.version += 1;
            note.updatedAt = new Date();
            defaultStore.updateNote(note);
          }
          results.push({ mutationId: mut.mutationId, entityId: mut.entityId, status: 'applied', version: note ? note.version : 1 });
        }
      } else if (mut.entityType === 'tasks') {
        if (mut.action === 'create') {
          const now = new Date();
          const task = defaultStore.createTask({
            id: mut.entityId,
            userId,
            title: mut.payload.title,
            description: mut.payload.description || null,
            plannedDate: mut.payload.plannedDate || null,
            dueAt: mut.payload.dueAt ? new Date(mut.payload.dueAt) : null,
            priority: mut.payload.priority || 'normal',
            status: mut.payload.status || 'pending',
            completedAt: mut.payload.status === 'completed' ? new Date() : null,
            noteId: mut.payload.noteId || null,
            version: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          });

          const entityData = { ...task, createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString(), deletedAt: null };
          defaultStore.saveProcessedMutation({
            userId,
            mutationId: mut.mutationId,
            payloadHash,
            responseJson: JSON.stringify(entityData),
            createdAt: now,
          });

          results.push({ mutationId: mut.mutationId, entityId: mut.entityId, status: 'applied', version: 1, entity: entityData });
        } else if (mut.action === 'update') {
          const task = defaultStore.findTask(userId, mut.entityId);
          if (!task) {
            results.push({ mutationId: mut.mutationId, entityId: mut.entityId, status: 'conflict', error: { code: 'NOT_FOUND', message: 'Công việc không tồn tại' } });
            continue;
          }
          if (task.version !== mut.baseVersion) {
            results.push({ mutationId: mut.mutationId, entityId: mut.entityId, status: 'conflict', version: task.version, error: { code: 'VERSION_CONFLICT', message: 'Xung đột phiên bản' } });
            continue;
          }

          if (mut.payload.title !== undefined) task.title = mut.payload.title;
          if (mut.payload.status !== undefined) {
            task.status = mut.payload.status;
            task.completedAt = mut.payload.status === 'completed' ? new Date() : null;
          }
          task.version += 1;
          task.updatedAt = new Date();
          defaultStore.updateTask(task);

          const entityData = { ...task, createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString(), deletedAt: null };
          defaultStore.saveProcessedMutation({
            userId,
            mutationId: mut.mutationId,
            payloadHash,
            responseJson: JSON.stringify(entityData),
            createdAt: new Date(),
          });

          results.push({ mutationId: mut.mutationId, entityId: mut.entityId, status: 'applied', version: task.version, entity: entityData });
        } else if (mut.action === 'delete') {
          const task = defaultStore.findTask(userId, mut.entityId);
          if (task) {
            task.deletedAt = new Date();
            task.version += 1;
            task.updatedAt = new Date();
            defaultStore.updateTask(task);
          }
          results.push({ mutationId: mut.mutationId, entityId: mut.entityId, status: 'applied', version: task ? task.version : 1 });
        }
      } else {
        // Generic fallback applied
        results.push({ mutationId: mut.mutationId, entityId: mut.entityId, status: 'applied', version: 1 });
      }
    } catch (err: any) {
      results.push({
        mutationId: mut.mutationId,
        entityId: mut.entityId,
        status: 'conflict',
        error: { code: 'MUTATION_ERROR', message: err.message },
      });
    }
  }

  res.status(200).json({
    data: { results },
    meta: { requestId: req.id },
  });
});

// POST /sync/snapshots
syncRouter.post('/snapshots', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const snapshotId = randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  // Collect current active entities
  const items: SnapshotItem[] = [];

  for (const n of defaultStore.listNotes(userId)) {
    items.push({
      entityType: 'notes',
      entityId: n.id,
      version: n.version,
      deleted: false,
      data: { ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString(), deletedAt: null },
    });
  }

  for (const t of defaultStore.listTasks(userId)) {
    items.push({
      entityType: 'tasks',
      entityId: t.id,
      version: t.version,
      deleted: false,
      data: {
        ...t,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        completedAt: t.completedAt ? t.completedAt.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        deletedAt: null,
      },
    });
  }

  for (const h of defaultStore.listHabits(userId)) {
    const sched = defaultStore.getActiveSchedule(h.id);
    items.push({
      entityType: 'habits',
      entityId: h.id,
      version: h.version,
      deleted: false,
      data: {
        ...h,
        archivedAt: h.archivedAt ? h.archivedAt.toISOString() : null,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
        deletedAt: null,
        currentSchedule: sched || undefined,
      },
    });
  }

  for (const c of defaultStore.listCategories(userId)) {
    items.push({
      entityType: 'categories',
      entityId: c.id,
      version: c.version,
      deleted: false,
      data: {
        ...c,
        archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        deletedAt: null,
      },
    });
  }

  for (const tx of defaultStore.listTransactions(userId)) {
    items.push({
      entityType: 'transactions',
      entityId: tx.id,
      version: tx.version,
      deleted: false,
      data: {
        ...tx,
        amount: tx.amount.toString(),
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
        deletedAt: null,
      },
    });
  }

  defaultStore.createSyncSnapshot({
    id: snapshotId,
    userId,
    expiresAt,
    snapshotData: JSON.stringify(items),
    createdAt: new Date(),
  });

  res.status(201).json({
    data: {
      snapshotId,
      expiresAt: expiresAt.toISOString(),
      totalCount: items.length,
    },
    meta: { requestId: req.id },
  });
});

function getParamId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

// GET /sync/snapshots/:id
syncRouter.get('/snapshots/:id', (req: Request, res: Response) => {
  const snapshot = defaultStore.getSyncSnapshot(req.user!.id, getParamId(req));
  if (!snapshot) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND_OR_EXPIRED', message: 'Snapshot không tồn tại hoặc đã hết hạn' },
      meta: { requestId: req.id },
    });
  }

  const items: SnapshotItem[] = JSON.parse(snapshot.snapshotData);
  const limit = Number(req.query.limit) || 50;
  const cursor = Number(req.query.cursor) || 0;

  const pageItems = items.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < items.length ? String(cursor + limit) : undefined;

  res.status(200).json({
    data: {
      snapshotId: snapshot.id,
      items: pageItems,
      hasMore: !!nextCursor,
      nextCursor,
    },
    meta: { requestId: req.id, nextCursor },
  });
});
