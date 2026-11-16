import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  ListTasksQuerySchema,
  SetTaskReminderSchema,
} from '@dingdong/contracts';
import { defaultStore } from '../store/inMemoryStore.js';
import { requireAuth } from '../middleware/auth.js';

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

function getParamId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

// GET /tasks
tasksRouter.get('/', (req: Request, res: Response) => {
  const query = ListTasksQuerySchema.parse(req.query || {});

  const tasks = defaultStore.listTasks(req.user!.id, {
    status: query.status,
    plannedDate: query.plannedDate,
    from: query.from,
    to: query.to,
    limit: query.limit,
  });

  res.status(200).json({
    data: tasks.map((t) => ({
      ...t,
      dueAt: t.dueAt ? t.dueAt.toISOString() : null,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      deletedAt: t.deletedAt ? t.deletedAt.toISOString() : null,
    })),
    meta: { requestId: req.id },
  });
});

// POST /tasks
tasksRouter.post('/', (req: Request, res: Response) => {
  const parseResult = CreateTaskSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu công việc không hợp lệ',
        fields: parseResult.error.flatten().fieldErrors,
      },
      meta: { requestId: req.id },
    });
  }

  const {
    id = randomUUID(),
    title,
    description = null,
    plannedDate = null,
    dueAt = null,
    priority = 'normal',
    noteId = null,
  } = parseResult.data;

  // Validate noteId ownership if provided
  if (noteId) {
    const note = defaultStore.findNote(req.user!.id, noteId);
    if (!note) {
      return res.status(400).json({
        error: { code: 'INVALID_NOTE_ID', message: 'Ghi chú liên kết không tồn tại' },
        meta: { requestId: req.id },
      });
    }
  }

  const now = new Date();
  const task = defaultStore.createTask({
    id,
    userId: req.user!.id,
    title,
    description,
    plannedDate,
    dueAt: dueAt ? new Date(dueAt) : null,
    priority,
    status: 'pending',
    completedAt: null,
    noteId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  res.status(201).json({
    data: {
      ...task,
      dueAt: task.dueAt ? task.dueAt.toISOString() : null,
      completedAt: null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      deletedAt: null,
    },
    meta: { requestId: req.id },
  });
});

// GET /tasks/:id
tasksRouter.get('/:id', (req: Request, res: Response) => {
  const task = defaultStore.findTask(req.user!.id, getParamId(req));
  if (!task) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy công việc' },
      meta: { requestId: req.id },
    });
  }

  const reminder = defaultStore.getTaskReminder(req.user!.id, task.id);

  res.status(200).json({
    data: {
      ...task,
      dueAt: task.dueAt ? task.dueAt.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      deletedAt: null,
      reminder: reminder && reminder.enabled ? {
        ...reminder,
        scheduledAt: reminder.scheduledAt.toISOString(),
      } : null,
    },
    meta: { requestId: req.id },
  });
});

// PATCH /tasks/:id
tasksRouter.patch('/:id', (req: Request, res: Response) => {
  const task = defaultStore.findTask(req.user!.id, getParamId(req));
  if (!task) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy công việc' },
      meta: { requestId: req.id },
    });
  }

  const parseResult = UpdateTaskSchema.safeParse(req.body);
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

  const { baseVersion, title, description, plannedDate, dueAt, priority, status, noteId } = parseResult.data;

  // BaseVersion check
  if (task.version !== baseVersion) {
    return res.status(409).json({
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Dữ liệu đã thay đổi trên máy chủ',
        details: { currentVersion: task.version },
      },
      meta: { requestId: req.id },
    });
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (plannedDate !== undefined) task.plannedDate = plannedDate;
  if (dueAt !== undefined) task.dueAt = dueAt ? new Date(dueAt) : null;
  if (priority !== undefined) task.priority = priority;

  if (status !== undefined) {
    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
      // Hoàn thành trước giờ nhắc -> hủy nhắc
      defaultStore.removeTaskReminder(req.user!.id, task.id);
    } else {
      task.completedAt = null;
    }
  }

  if (noteId !== undefined) {
    if (noteId) {
      const note = defaultStore.findNote(req.user!.id, noteId);
      if (!note) {
        return res.status(400).json({
          error: { code: 'INVALID_NOTE_ID', message: 'Ghi chú liên kết không tồn tại' },
          meta: { requestId: req.id },
        });
      }
    }
    task.noteId = noteId;
  }

  task.version += 1;
  task.updatedAt = new Date();
  defaultStore.updateTask(task);

  res.status(200).json({
    data: {
      ...task,
      dueAt: task.dueAt ? task.dueAt.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      deletedAt: null,
    },
    meta: { requestId: req.id },
  });
});

// DELETE /tasks/:id
tasksRouter.delete('/:id', (req: Request, res: Response) => {
  const task = defaultStore.findTask(req.user!.id, getParamId(req));
  if (!task) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy công việc' },
      meta: { requestId: req.id },
    });
  }

  const baseVersion = Number(req.body?.baseVersion || req.query?.baseVersion);
  if (baseVersion && task.version !== baseVersion) {
    return res.status(409).json({
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Dữ liệu đã thay đổi trên máy chủ',
        details: { currentVersion: task.version },
      },
      meta: { requestId: req.id },
    });
  }

  task.deletedAt = new Date();
  task.version += 1;
  task.updatedAt = new Date();
  defaultStore.updateTask(task);
  defaultStore.removeTaskReminder(req.user!.id, task.id);

  res.status(200).json({
    data: {
      id: task.id,
      version: task.version,
      deleted: true,
    },
    meta: { requestId: req.id },
  });
});

// PUT /tasks/:id/reminder
tasksRouter.put('/:id/reminder', (req: Request, res: Response) => {
  const task = defaultStore.findTask(req.user!.id, getParamId(req));
  if (!task) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy công việc' },
      meta: { requestId: req.id },
    });
  }

  const parseResult = SetTaskReminderSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu nhắc hẹn không hợp lệ',
        fields: parseResult.error.flatten().fieldErrors,
      },
      meta: { requestId: req.id },
    });
  }

  const { scheduledAt, timezone, mode } = parseResult.data;
  const existing = defaultStore.getTaskReminder(req.user!.id, task.id);
  const now = new Date();

  if (existing) {
    existing.scheduledAt = new Date(scheduledAt);
    existing.timezone = timezone;
    existing.mode = mode;
    existing.enabled = true;
    existing.version += 1;
    existing.updatedAt = now;
    defaultStore.setTaskReminder(existing);

    return res.status(200).json({
      data: {
        ...existing,
        scheduledAt: existing.scheduledAt.toISOString(),
      },
      meta: { requestId: req.id },
    });
  }

  const reminder = defaultStore.setTaskReminder({
    id: randomUUID(),
    userId: req.user!.id,
    taskId: task.id,
    scheduledAt: new Date(scheduledAt),
    timezone,
    mode,
    enabled: true,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  res.status(200).json({
    data: {
      ...reminder,
      scheduledAt: reminder.scheduledAt.toISOString(),
    },
    meta: { requestId: req.id },
  });
});

// DELETE /tasks/:id/reminder
tasksRouter.delete('/:id/reminder', (req: Request, res: Response) => {
  defaultStore.removeTaskReminder(req.user!.id, getParamId(req));
  res.status(200).json({
    data: { success: true },
    meta: { requestId: req.id },
  });
});
