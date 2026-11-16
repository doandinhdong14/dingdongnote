/**
 * Calculate habit progress for a 7-day period according to Spec section 2.3:
 * "Tỷ lệ tuần lấy số ngày hoàn thành chia số ngày đã đến hạn trong lịch tuần, loại ngày nghỉ và ngày trước khi bắt đầu."
 */
export interface HabitProgressInput {
  startDate: string; // YYYY-MM-DD
  weekdays: number[]; // 1=Mon .. 7=Sun
  completions: string[]; // array of completed YYYY-MM-DD dates
  evalDates: string[]; // list of 7 dates in window (up to today, excluding future)
}

export interface HabitProgressResult {
  completedCount: number;
  scheduledDueCount: number;
  ratePercentage: number; // 0 to 100
}

export function calculateHabitWeeklyProgress(input: HabitProgressInput): HabitProgressResult {
  let completedCount = 0;
  let scheduledDueCount = 0;

  const completionSet = new Set(input.completions);

  for (const dateStr of input.evalDates) {
    // Rule: Exclude days before start date
    if (dateStr < input.startDate) {
      continue;
    }

    const d = new Date(dateStr);
    const day = d.getDay();
    const isoWeekday = day === 0 ? 7 : day;

    // Rule: Check if day is a scheduled day
    if (!input.weekdays.includes(isoWeekday)) {
      continue; // Exclude non-scheduled / rest days
    }

    scheduledDueCount += 1;
    if (completionSet.has(dateStr)) {
      completedCount += 1;
    }
  }

  const ratePercentage = scheduledDueCount > 0
    ? Math.round((completedCount / scheduledDueCount) * 100)
    : 0;

  return {
    completedCount,
    scheduledDueCount,
    ratePercentage,
  };
}

/**
 * BigInt math for VND currency strings to avoid JavaScript float precision issues
 */
export function calculateVndTotals(
  transactions: { type: 'income' | 'expense'; amount: string }[]
): { totalIncome: string; totalExpense: string; netDifference: string } {
  let income = 0n;
  let expense = 0n;

  for (const tx of transactions) {
    const val = BigInt(tx.amount);
    if (tx.type === 'income') {
      income += val;
    } else {
      expense += val;
    }
  }

  const diff = income - expense;

  return {
    totalIncome: income.toString(),
    totalExpense: expense.toString(),
    netDifference: diff.toString(),
  };
}
