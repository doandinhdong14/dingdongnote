import { Router, Request, Response } from 'express';
import { SetDailyFocusSchema, IsoDateSchema } from '@dingdong/contracts';
import { defaultStore } from '../store/inMemoryStore.js';
import { requireAuth } from '../middleware/auth.js';

export const focusRouter = Router();
focusRouter.use(requireAuth);

// PUT /focus/:date
focusRouter.put('/:date', (req: Request, res: Response) => {
  const dateResult = IsoDateSchema.safeParse(req.params.date);
  if (!dateResult.success) {
    return res.status(400).json({
      error: { code: 'INVALID_DATE', message: 'Ngày không đúng định dạng YYYY-MM-DD' },
      meta: { requestId: req.id },
    });
  }

  const parseResult = SetDailyFocusSchema.safeParse(req.body);
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

  const { taskId } = parseResult.data;
  const task = defaultStore.findTask(req.user!.id, taskId);
  if (!task) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy công việc để chọn làm việc chính' },
      meta: { requestId: req.id },
    });
  }

  const focus = defaultStore.setDailyFocus(req.user!.id, dateResult.data, taskId);

  res.status(200).json({
    data: {
      userId: focus.userId,
      localDate: focus.localDate,
      taskId: focus.taskId,
    },
    meta: { requestId: req.id },
  });
});

// DELETE /focus/:date
focusRouter.delete('/:date', (req: Request, res: Response) => {
  const dateResult = IsoDateSchema.safeParse(req.params.date);
  if (!dateResult.success) {
    return res.status(400).json({
      error: { code: 'INVALID_DATE', message: 'Ngày không đúng định dạng YYYY-MM-DD' },
      meta: { requestId: req.id },
    });
  }

  defaultStore.removeDailyFocus(req.user!.id, dateResult.data);

  res.status(200).json({
    data: { success: true },
    meta: { requestId: req.id },
  });
});
