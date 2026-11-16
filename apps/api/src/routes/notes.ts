import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  CreateNoteSchema,
  UpdateNoteSchema,
  ListNotesQuerySchema,
} from '@dingdong/contracts';
import { defaultStore } from '../store/inMemoryStore.js';
import { requireAuth } from '../middleware/auth.js';

export const notesRouter = Router();
notesRouter.use(requireAuth);

function getParamId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

// GET /notes
notesRouter.get('/', (req: Request, res: Response) => {
  const query = ListNotesQuerySchema.parse(req.query || {});

  const notes = defaultStore.listNotes(req.user!.id, {
    q: query.q,
    pinned: query.pinned,
    limit: query.limit,
    cursor: query.cursor,
  });

  res.status(200).json({
    data: notes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
      deletedAt: n.deletedAt ? n.deletedAt.toISOString() : null,
    })),
    meta: { requestId: req.id },
  });
});

// POST /notes
notesRouter.post('/', (req: Request, res: Response) => {
  const parseResult = CreateNoteSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu ghi chú không hợp lệ',
        fields: parseResult.error.flatten().fieldErrors,
      },
      meta: { requestId: req.id },
    });
  }

  const { id = randomUUID(), title = '', body = '', pinned = false } = parseResult.data;
  const now = new Date();

  const note = defaultStore.createNote({
    id,
    userId: req.user!.id,
    title,
    body,
    pinned,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  res.status(201).json({
    data: {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      deletedAt: null,
    },
    meta: { requestId: req.id },
  });
});

// GET /notes/:id
notesRouter.get('/:id', (req: Request, res: Response) => {
  const note = defaultStore.findNote(req.user!.id, getParamId(req));
  if (!note) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy ghi chú' },
      meta: { requestId: req.id },
    });
  }

  res.status(200).json({
    data: {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      deletedAt: null,
    },
    meta: { requestId: req.id },
  });
});

// PATCH /notes/:id
notesRouter.patch('/:id', (req: Request, res: Response) => {
  const note = defaultStore.findNote(req.user!.id, getParamId(req));
  if (!note) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy ghi chú' },
      meta: { requestId: req.id },
    });
  }

  const parseResult = UpdateNoteSchema.safeParse(req.body);
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

  const { baseVersion, title, body, pinned } = parseResult.data;

  // BaseVersion check
  if (note.version !== baseVersion) {
    return res.status(409).json({
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Dữ liệu đã thay đổi trên máy chủ',
        details: { currentVersion: note.version },
      },
      meta: { requestId: req.id },
    });
  }

  note.title = title !== undefined ? title : note.title;
  note.body = body !== undefined ? body : note.body;
  note.pinned = pinned !== undefined ? pinned : note.pinned;
  note.version += 1;
  note.updatedAt = new Date();

  defaultStore.updateNote(note);

  res.status(200).json({
    data: {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      deletedAt: null,
    },
    meta: { requestId: req.id },
  });
});

// DELETE /notes/:id
notesRouter.delete('/:id', (req: Request, res: Response) => {
  const note = defaultStore.findNote(req.user!.id, getParamId(req));
  if (!note) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy ghi chú' },
      meta: { requestId: req.id },
    });
  }

  const baseVersion = Number(req.body?.baseVersion || req.query?.baseVersion);
  if (baseVersion && note.version !== baseVersion) {
    return res.status(409).json({
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Dữ liệu đã thay đổi trên máy chủ',
        details: { currentVersion: note.version },
      },
      meta: { requestId: req.id },
    });
  }

  note.deletedAt = new Date();
  note.version += 1;
  note.updatedAt = new Date();
  defaultStore.updateNote(note);

  // Unlink from any tasks: note_id -> null
  for (const task of defaultStore.tasks.values()) {
    if (task.userId === req.user!.id && task.noteId === note.id) {
      task.noteId = null;
      task.version += 1;
      task.updatedAt = new Date();
    }
  }

  res.status(200).json({
    data: {
      id: note.id,
      version: note.version,
      deleted: true,
    },
    meta: { requestId: req.id },
  });
});
