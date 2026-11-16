import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  CreateHabitSchema,
  UpdateHabitSchema,
  UpdateHabitScheduleSchema,
  ListHabitsQuerySchema,
  IsoDateSchema,
} from '@dingdong/contracts';
import { defaultStore } from '../store/inMemoryStore.js';
import { requireAuth } from '../middleware/auth.js';

export const habitsRouter = Router();
habitsRouter.use(requireAuth);

function getParamId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getSevenDaysAgoString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

// GET /habits
habitsRouter.get('/', (req: Request, res: Response) => {
  const query = ListHabitsQuerySchema.parse(req.query || {});

  const habits = defaultStore.listHabits(req.user!.id, {
    archived: query.archived,
    limit: query.limit,
  });

  const habitsWithSchedule = habits.map((h) => {
    const schedule = defaultStore.getActiveSchedule(h.id);
    return {
      ...h,
      archivedAt: h.archivedAt ? h.archivedAt.toISOString() : null,
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
      deletedAt: h.deletedAt ? h.deletedAt.toISOString() : null,
      currentSchedule: schedule || undefined,
    };
  });

  res.status(200).json({
    data: habitsWithSchedule,
    meta: { requestId: req.id },
  });
});

// POST /habits
habitsRouter.post('/', (req: Request, res: Response) => {
  const parseResult = CreateHabitSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu thói quen không hợp lệ',
        fields: parseResult.error.flatten().fieldErrors,
      },
      meta: { requestId: req.id },
    });
  }

  const {
    id = randomUUID(),
    name,
    startDate,
    weekdays,
    reminderTime = null,
    timezone = 'Asia/Ho_Chi_Minh',
  } = parseResult.data;

  const now = new Date();
  const habit = defaultStore.createHabit(
    {
      id,
      userId: req.user!.id,
      name,
      startDate,
      archivedAt: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: randomUUID(),
      habitId: id,
      validFrom: startDate,
      validTo: null,
      weekdays,
      reminderTime: reminderTime || null,
      timezone,
      mode: 'notification',
      createdAt: now,
    }
  );

  const schedule = defaultStore.getActiveSchedule(habit.id);

  res.status(201).json({
    data: {
      ...habit,
      archivedAt: null,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
      deletedAt: null,
      currentSchedule: schedule || undefined,
    },
    meta: { requestId: req.id },
  });
});

// GET /habits/:id
habitsRouter.get('/:id', (req: Request, res: Response) => {
  const habit = defaultStore.findHabit(req.user!.id, getParamId(req));
  if (!habit) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy thói quen' },
      meta: { requestId: req.id },
    });
  }

  const schedule = defaultStore.getActiveSchedule(habit.id);

  res.status(200).json({
    data: {
      ...habit,
      archivedAt: habit.archivedAt ? habit.archivedAt.toISOString() : null,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
      deletedAt: null,
      currentSchedule: schedule || undefined,
    },
    meta: { requestId: req.id },
  });
});

// PATCH /habits/:id
habitsRouter.patch('/:id', (req: Request, res: Response) => {
  const habit = defaultStore.findHabit(req.user!.id, getParamId(req));
  if (!habit) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy thói quen' },
      meta: { requestId: req.id },
    });
  }

  const parseResult = UpdateHabitSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        fields: parseResult.error.flatten().fieldErrors,
      },
      meta: { requestId: req.id },
    });
  }

  const { baseVersion, name, archived } = parseResult.data;
  if (habit.version !== baseVersion) {
    return res.status(409).json({
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Dữ liệu đã thay đổi trên máy chủ',
        details: { currentVersion: habit.version },
      },
      meta: { requestId: req.id },
    });
  }

  if (name !== undefined) habit.name = name;
  if (archived !== undefined) {
    habit.archivedAt = archived ? new Date() : null;
  }

  habit.version += 1;
  habit.updatedAt = new Date();
  defaultStore.updateHabit(habit);

  const schedule = defaultStore.getActiveSchedule(habit.id);

  res.status(200).json({
    data: {
      ...habit,
      archivedAt: habit.archivedAt ? habit.archivedAt.toISOString() : null,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
      deletedAt: null,
      currentSchedule: schedule || undefined,
    },
    meta: { requestId: req.id },
  });
});

// PUT /habits/:id/schedule (takes effect from next day)
habitsRouter.put('/:id/schedule', (req: Request, res: Response) => {
  const habit = defaultStore.findHabit(req.user!.id, getParamId(req));
  if (!habit) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy thói quen' },
      meta: { requestId: req.id },
    });
  }

  const parseResult = UpdateHabitScheduleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Lịch thói quen không hợp lệ',
        fields: parseResult.error.flatten().fieldErrors,
      },
      meta: { requestId: req.id },
    });
  }

  const currentSchedule = defaultStore.getActiveSchedule(habit.id);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (currentSchedule) {
    currentSchedule.validTo = tomorrowStr;
  }

  const newSchedule = defaultStore.createHabitSchedule({
    id: randomUUID(),
    habitId: habit.id,
    validFrom: tomorrowStr,
    validTo: null,
    weekdays: parseResult.data.weekdays,
    reminderTime: parseResult.data.reminderTime || null,
    timezone: parseResult.data.timezone,
    mode: 'notification',
    createdAt: new Date(),
  });

  habit.version += 1;
  habit.updatedAt = new Date();
  defaultStore.updateHabit(habit);

  res.status(200).json({
    data: newSchedule,
    meta: { requestId: req.id },
  });
});

// PUT /habits/:id/completions/:date
habitsRouter.put('/:id/completions/:date', (req: Request, res: Response) => {
  const habit = defaultStore.findHabit(req.user!.id, getParamId(req));
  if (!habit) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy thói quen' },
      meta: { requestId: req.id },
    });
  }

  const dateParam = Array.isArray(req.params.date) ? req.params.date[0] : req.params.date;
  const dateResult = IsoDateSchema.safeParse(dateParam);
  if (!dateResult.success) {
    return res.status(400).json({
      error: { code: 'INVALID_DATE', message: 'Ngày không đúng định dạng YYYY-MM-DD' },
      meta: { requestId: req.id },
    });
  }

  const date = dateResult.data;
  const today = getTodayString();
  const sevenDaysAgo = getSevenDaysAgoString();

  // Rule: Do not allow future dates
  if (date > today) {
    return res.status(400).json({
      error: { code: 'FUTURE_DATE_NOT_ALLOWED', message: 'Không thể đánh dấu hoàn thành ngày trong tương lai' },
      meta: { requestId: req.id },
    });
  }

  // Rule: Allow only past 7 days
  if (date < sevenDaysAgo) {
    return res.status(400).json({
      error: { code: 'HISTORY_WINDOW_EXCEEDED', message: 'Chỉ cho phép cập nhật lịch sử trong 7 ngày gần nhất' },
      meta: { requestId: req.id },
    });
  }

  const existing = defaultStore.getHabitCompletion(req.user!.id, habit.id, date);
  const now = new Date();

  if (existing) {
    return res.status(200).json({
      data: {
        ...existing,
        completedAt: existing.completedAt.toISOString(),
      },
      meta: { requestId: req.id },
    });
  }

  const completion = defaultStore.setHabitCompletion({
    id: randomUUID(),
    userId: req.user!.id,
    habitId: habit.id,
    localDate: date,
    completedAt: now,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  res.status(200).json({
    data: {
      ...completion,
      completedAt: completion.completedAt.toISOString(),
    },
    meta: { requestId: req.id },
  });
});

// DELETE /habits/:id/completions/:date
habitsRouter.delete('/:id/completions/:date', (req: Request, res: Response) => {
  const habit = defaultStore.findHabit(req.user!.id, getParamId(req));
  if (!habit) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy thói quen' },
      meta: { requestId: req.id },
    });
  }

  const dateParam = Array.isArray(req.params.date) ? req.params.date[0] : req.params.date;
  const dateResult = IsoDateSchema.safeParse(dateParam);
  if (!dateResult.success) {
    return res.status(400).json({
      error: { code: 'INVALID_DATE', message: 'Ngày không đúng định dạng YYYY-MM-DD' },
      meta: { requestId: req.id },
    });
  }

  defaultStore.removeHabitCompletion(req.user!.id, habit.id, dateResult.data);

  res.status(200).json({
    data: { success: true },
    meta: { requestId: req.id },
  });
});
