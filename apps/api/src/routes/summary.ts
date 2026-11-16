import { Router, Request, Response } from 'express';
import {
  TodaySummaryQuerySchema,
  FinanceSummaryQuerySchema,
} from '@dingdong/contracts';
import { defaultStore } from '../store/inMemoryStore.js';
import { requireAuth } from '../middleware/auth.js';

export const summaryRouter = Router();
summaryRouter.use(requireAuth);

// GET /summary/today?date=YYYY-MM-DD
summaryRouter.get('/today', (req: Request, res: Response) => {
  const parseResult = TodaySummaryQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Tham số ngày không hợp lệ (YYYY-MM-DD)',
      },
      meta: { requestId: req.id },
    });
  }

  const { date } = parseResult.data;
  const userId = req.user!.id;

  // 1. Daily Focus
  const focusRecord = defaultStore.getDailyFocus(userId, date);
  const mainFocusTask = focusRecord ? defaultStore.findTask(userId, focusRecord.taskId) : null;

  // 2. Tasks
  const allTasks = defaultStore.listTasks(userId);
  const pendingTasks = allTasks.filter(
    (t) => t.status === 'pending' && (t.plannedDate === date || !t.plannedDate)
  );
  const completedTasksCount = allTasks.filter(
    (t) => t.status === 'completed' && t.completedAt && t.completedAt.toISOString().startsWith(date)
  ).length;

  // 3. Habits
  const allHabits = defaultStore.listHabits(userId, { archived: false });
  const habitCompletions = defaultStore.listCompletionsForDate(userId, date);
  const completionMap = new Map(habitCompletions.map((c) => [c.habitId, c]));

  const habits = allHabits.map((h) => {
    const schedule = defaultStore.getActiveSchedule(h.id);
    const comp = completionMap.get(h.id);
    return {
      habit: {
        ...h,
        archivedAt: h.archivedAt ? h.archivedAt.toISOString() : null,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
        deletedAt: null,
        currentSchedule: schedule || undefined,
      },
      completed: !!comp,
      completedAt: comp ? comp.completedAt.toISOString() : null,
    };
  });

  // 4. Today Expense Total
  const transactions = defaultStore.listTransactions(userId, { from: date, to: date, type: 'expense' });
  let expenseSum = 0n;
  for (const tx of transactions) {
    expenseSum += tx.amount;
  }

  res.status(200).json({
    data: {
      date,
      mainFocusTask: mainFocusTask
        ? {
            ...mainFocusTask,
            dueAt: mainFocusTask.dueAt ? mainFocusTask.dueAt.toISOString() : null,
            completedAt: mainFocusTask.completedAt ? mainFocusTask.completedAt.toISOString() : null,
            createdAt: mainFocusTask.createdAt.toISOString(),
            updatedAt: mainFocusTask.updatedAt.toISOString(),
            deletedAt: null,
          }
        : null,
      pendingTasks: pendingTasks.map((t) => ({
        ...t,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        completedAt: t.completedAt ? t.completedAt.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        deletedAt: null,
      })),
      completedTasksCount,
      habits,
      todayTotalExpense: expenseSum.toString(),
    },
    meta: { requestId: req.id },
  });
});

// GET /summary/finance?month=YYYY-MM
summaryRouter.get('/finance', (req: Request, res: Response) => {
  const parseResult = FinanceSummaryQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Tham số tháng không hợp lệ (YYYY-MM)',
      },
      meta: { requestId: req.id },
    });
  }

  const { month } = parseResult.data;
  const userId = req.user!.id;

  const from = `${month}-01`;
  const to = `${month}-31`;

  const txs = defaultStore.listTransactions(userId, { from, to });
  let totalIncome = 0n;
  let totalExpense = 0n;

  const categoryMap = new Map<
    string,
    { categoryId: string; categoryName: string; type: 'income' | 'expense'; totalAmount: bigint; count: number }
  >();

  for (const tx of txs) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }

    const cat = defaultStore.findCategory(userId, tx.categoryId);
    const catName = cat ? cat.name : 'Khác';

    const existing = categoryMap.get(tx.categoryId);
    if (existing) {
      existing.totalAmount += tx.amount;
      existing.count += 1;
    } else {
      categoryMap.set(tx.categoryId, {
        categoryId: tx.categoryId,
        categoryName: catName,
        type: tx.type,
        totalAmount: tx.amount,
        count: 1,
      });
    }
  }

  const netDiff = totalIncome - totalExpense;

  res.status(200).json({
    data: {
      month,
      totalIncome: totalIncome.toString(),
      totalExpense: totalExpense.toString(),
      netDifference: netDiff.toString(),
      categories: Array.from(categoryMap.values()).map((c) => ({
        ...c,
        totalAmount: c.totalAmount.toString(),
      })),
    },
    meta: { requestId: req.id },
  });
});
