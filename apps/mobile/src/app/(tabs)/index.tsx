import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TodaySummaryResponse, Task, HabitTodayItem } from '@dingdong/contracts';
import { Colors, Radius, Spacing, Typography, Layout } from '../../theme/tokens';
import {
  Button,
  TextField,
  MoneyInput,
  SyncStatus,
  SyncState,
  formatVndDisplay,
} from '../../components';
import { apiRequest } from '../../services/apiClient';
import { syncEngine } from '../../services/syncEngine';
import { localDb } from '../../services/database';

export default function HomeScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<TodaySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [pendingCount, setPendingCount] = useState(0);

  // Quick Add Modal State
  const [quickAddModal, setQuickAddModal] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'task' | 'note' | 'expense' | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    const outboxCount = localDb.getPendingOutboxCount();
    setPendingCount(outboxCount);
    setSyncState(outboxCount > 0 ? 'pending' : 'synced');

    const res = await apiRequest<TodaySummaryResponse>(`/summary/today?date=${todayStr}`);
    if (res.data) {
      setSummary(res.data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncEngine.syncAll();
    await loadData();
  };

  // Toggle Task Status
  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await apiRequest(`/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus, baseVersion: task.version }),
    });
    loadData();
  };

  // Toggle Habit completion for today
  const handleToggleHabit = async (item: HabitTodayItem) => {
    const habitId = item.habit.id;
    if (item.completed) {
      await apiRequest(`/habits/${habitId}/completions/${todayStr}`, { method: 'DELETE' });
    } else {
      await apiRequest(`/habits/${habitId}/completions/${todayStr}`, { method: 'PUT' });
    }
    loadData();
  };

  // Quick Create Handlers
  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    await apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: taskTitle.trim(), plannedDate: todayStr }),
    });
    setTaskTitle('');
    setQuickAddModal(false);
    loadData();
  };

  const handleCreateNote = async () => {
    if (!noteTitle.trim() && !noteBody.trim()) return;
    await apiRequest('/notes', {
      method: 'POST',
      body: JSON.stringify({ title: noteTitle.trim(), body: noteBody.trim() }),
    });
    setNoteTitle('');
    setNoteBody('');
    setQuickAddModal(false);
    loadData();
  };

  const handleCreateExpense = async () => {
    if (!expenseAmount.trim()) return;
    // Get first category or create default
    const catRes = await apiRequest('/categories');
    let catId = catRes.data?.find((c: any) => c.type === 'expense')?.id;
    if (!catId) {
      const newCat = await apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Chi tiêu chung', type: 'expense' }),
      });
      catId = newCat.data?.id;
    }

    if (catId) {
      await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: catId,
          type: 'expense',
          amount: expenseAmount,
          transactionDate: todayStr,
          note: expenseNote.trim() || null,
        }),
      });
    }
    setExpenseAmount('');
    setExpenseNote('');
    setQuickAddModal(false);
    loadData();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
            })}
          </Text>
          <Text style={styles.appName}>DingDongNote</Text>
        </View>
        <View style={styles.topActions}>
          <SyncStatus state={syncState} pendingCount={pendingCount} />
          <Pressable
            style={styles.avatarButton}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Mở Cài đặt"
          >
            <Text style={styles.avatarText}>Đ</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Việc chính hôm nay (Daily Focus) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>⭐ VIỆC CHÍNH HÔM NAY</Text>
            {summary?.mainFocusTask ? (
              <Text style={styles.focusBadge}>Ưu tiên số 1</Text>
            ) : null}
          </View>

          {summary?.mainFocusTask ? (
            <Pressable
              style={styles.focusTaskRow}
              onPress={() => handleToggleTask(summary.mainFocusTask!)}
            >
              <View
                style={[
                  styles.checkbox,
                  summary.mainFocusTask.status === 'completed' && styles.checkboxCompleted,
                ]}
              >
                {summary.mainFocusTask.status === 'completed' ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
              </View>
              <Text
                style={[
                  styles.focusTaskTitle,
                  summary.mainFocusTask.status === 'completed' && styles.taskDoneText,
                ]}
              >
                {summary.mainFocusTask.title}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.emptyCardBox}>
              <Text style={styles.emptyText}>Chưa có việc chính nào được chọn</Text>
              <Button
                title="+ Chọn việc chính"
                variant="outline"
                size="sm"
                onPress={() => router.push('/(tabs)/tasks')}
                style={styles.selectFocusBtn}
              />
            </View>
          )}
        </View>

        {/* Thói quen hôm nay (Habits Today) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚡ THÓI QUEN HÔM NAY</Text>
          {summary?.habits && summary.habits.length > 0 ? (
            summary.habits.map((item) => (
              <Pressable
                key={item.habit.id}
                style={styles.habitRow}
                onPress={() => handleToggleHabit(item)}
              >
                <View
                  style={[
                    styles.habitCheck,
                    item.completed && styles.habitCheckDone,
                  ]}
                >
                  {item.completed ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text
                  style={[
                    styles.habitName,
                    item.completed && styles.taskDoneText,
                  ]}
                >
                  {item.habit.name}
                </Text>
                {item.habit.currentSchedule?.reminderTime ? (
                  <Text style={styles.timeTag}>
                    ⏰ {item.habit.currentSchedule.reminderTime}
                  </Text>
                ) : null}
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>Không có thói quen nào cần làm hôm nay</Text>
          )}
        </View>

        {/* Chi tiêu hôm nay */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 CHI TIÊU HÔM NAY</Text>
          <Text style={styles.financeAmount}>
            {summary?.todayTotalExpense
              ? formatVndDisplay(summary.todayTotalExpense)
              : '0'}{' '}
            ₫
          </Text>
          <Text style={styles.financeSub}>Tổng các khoản chi trong ngày</Text>
        </View>

        {/* Việc còn lại trong ngày */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            ✓ CÔNG VIỆC CẦN LÀM ({summary?.pendingTasks.length || 0})
          </Text>
          {summary?.pendingTasks && summary.pendingTasks.length > 0 ? (
            summary.pendingTasks.map((t) => (
              <Pressable
                key={t.id}
                style={styles.taskItem}
                onPress={() => handleToggleTask(t)}
              >
                <View style={styles.checkbox}>
                  {t.status === 'completed' ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : null}
                </View>
                <Text style={styles.taskTitle}>{t.title}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>Đã hoàn thành hết công việc!</Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <Pressable
        style={styles.fab}
        onPress={() => {
          setQuickAddType(null);
          setQuickAddModal(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Thêm nhanh"
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      {/* Modal Thêm nhanh */}
      <Modal visible={quickAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {quickAddType === 'task'
                  ? 'Thêm công việc'
                  : quickAddType === 'note'
                  ? 'Ghi chú nhanh'
                  : quickAddType === 'expense'
                  ? 'Ghi chi tiêu'
                  : 'Ghi nhanh'}
              </Text>
              <Pressable onPress={() => setQuickAddModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            {quickAddType === null ? (
              <View style={styles.quickAddOptions}>
                <Button
                  title="✓ Công việc"
                  variant="outline"
                  onPress={() => setQuickAddType('task')}
                />
                <Button
                  title="📝 Ghi chú"
                  variant="outline"
                  onPress={() => setQuickAddType('note')}
                />
                <Button
                  title="💰 Chi tiêu"
                  variant="outline"
                  onPress={() => setQuickAddType('expense')}
                />
              </View>
            ) : quickAddType === 'task' ? (
              <View>
                <TextField
                  label="Tiêu đề việc cần làm"
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  placeholder="Ví dụ: Gọi điện cho khách hàng..."
                />
                <Button title="Lưu công việc" onPress={handleCreateTask} />
              </View>
            ) : quickAddType === 'note' ? (
              <View>
                <TextField
                  label="Tiêu đề (tuỳ chọn)"
                  value={noteTitle}
                  onChangeText={setNoteTitle}
                  placeholder="Tiêu đề ghi chú"
                />
                <TextField
                  label="Nội dung"
                  value={noteBody}
                  onChangeText={setNoteBody}
                  placeholder="Ý tưởng hoặc nội dung ghi chú..."
                  multiline
                  numberOfLines={4}
                />
                <Button title="Lưu ghi chú" onPress={handleCreateNote} />
              </View>
            ) : (
              <View>
                <MoneyInput
                  label="Số tiền chi (VND)"
                  value={expenseAmount}
                  onChangeValue={setExpenseAmount}
                />
                <TextField
                  label="Ghi chú chi tiêu"
                  value={expenseNote}
                  onChangeText={setExpenseNote}
                  placeholder="Ví dụ: Cà phê, ăn trưa..."
                />
                <Button title="Lưu chi tiêu" onPress={handleCreateExpense} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dateText: {
    ...Typography.caption,
    textTransform: 'capitalize',
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  focusBadge: {
    ...Typography.caption,
    color: Colors.warning,
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    fontSize: 11,
  },
  focusTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  focusTaskTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  emptyCardBox: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  emptyText: {
    ...Typography.bodyMedium,
    color: Colors.textMuted,
    marginVertical: Spacing.xs,
  },
  selectFocusBtn: {
    marginTop: Spacing.xs,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  habitCheck: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  habitCheckDone: {
    backgroundColor: Colors.primary,
  },
  habitName: {
    ...Typography.bodyLarge,
    flex: 1,
    color: Colors.text,
  },
  timeTag: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  financeAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  financeSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  checkboxCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  taskTitle: {
    ...Typography.bodyLarge,
    color: Colors.text,
    flex: 1,
  },
  taskDoneText: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 32, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.titleMedium,
  },
  closeBtn: {
    fontSize: 20,
    color: Colors.textSecondary,
    padding: Spacing.xs,
  },
  quickAddOptions: {
    gap: Spacing.md,
  },
});
