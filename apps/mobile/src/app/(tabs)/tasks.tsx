import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Task } from '@dingdong/contracts';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import {
  Button,
  TextField,
  TaskRow,
  EmptyState,
  ConfirmDialog,
} from '../../components';
import { apiRequest } from '../../services/apiClient';
import { notificationService } from '../../services/notificationService';

type TaskTab = 'today' | 'upcoming' | 'backlog' | 'completed';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<TaskTab>('today');
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Create / Edit Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [reminderTime, setReminderTime] = useState('');

  // Delete Dialog
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadTasks = useCallback(async () => {
    const res = await apiRequest<Task[]>('/tasks');
    if (res.data) {
      setTasks(res.data);
    }

    // Load today's focus task
    const focusRes = await apiRequest(`/focus/${todayStr}`);
    if (focusRes.data?.taskId) {
      setFocusTaskId(focusRes.data.taskId);
    } else {
      setFocusTaskId(null);
    }
    setLoading(false);
  }, [todayStr]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'completed') return t.status === 'completed';
    if (t.status === 'completed') return false;

    if (activeTab === 'today') {
      return t.plannedDate === todayStr;
    }
    if (activeTab === 'upcoming') {
      return t.plannedDate && t.plannedDate > todayStr;
    }
    if (activeTab === 'backlog') {
      return !t.plannedDate || t.plannedDate < todayStr;
    }
    return true;
  });

  const handleOpenCreate = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPlannedDate(activeTab === 'today' ? todayStr : '');
    setPriority('normal');
    setReminderTime('');
    setModalVisible(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPlannedDate(task.plannedDate || '');
    setPriority(task.priority);
    setReminderTime('');
    setModalVisible(true);
  };

  const handleSaveTask = async () => {
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Tiêu đề công việc không được để trống');
      return;
    }

    if (editingTask) {
      await apiRequest(`/tasks/${editingTask.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          plannedDate: plannedDate || null,
          priority,
          baseVersion: editingTask.version,
        }),
      });

      if (reminderTime) {
        await notificationService.scheduleTaskReminder({
          id: editingTask.id,
          title: title.trim(),
          scheduledAt: `${plannedDate || todayStr}T${reminderTime}:00Z`,
          userId: editingTask.userId,
        });
      }
    } else {
      const createRes = await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          plannedDate: plannedDate || null,
          priority,
        }),
      });

      if (createRes.data && reminderTime) {
        await notificationService.scheduleTaskReminder({
          id: createRes.data.id,
          title: title.trim(),
          scheduledAt: `${plannedDate || todayStr}T${reminderTime}:00Z`,
          userId: createRes.data.userId,
        });
      }
    }

    setModalVisible(false);
    loadTasks();
  };

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await apiRequest(`/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus, baseVersion: task.version }),
    });

    if (newStatus === 'completed') {
      await notificationService.cancelTaskReminder(task.id);
    }
    loadTasks();
  };

  const handleToggleFocus = async (task: Task) => {
    if (focusTaskId === task.id) {
      await apiRequest(`/focus/${todayStr}`, { method: 'DELETE' });
      setFocusTaskId(null);
    } else {
      await apiRequest(`/focus/${todayStr}`, {
        method: 'PUT',
        body: JSON.stringify({ taskId: task.id }),
      });
      setFocusTaskId(task.id);
    }
    loadTasks();
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    apiRequest(`/tasks/${taskToDelete.id}`, {
      method: 'DELETE',
      body: JSON.stringify({ baseVersion: taskToDelete.version }),
    }).then(() => {
      notificationService.cancelTaskReminder(taskToDelete.id);
      setDeleteDialogVisible(false);
      setTaskToDelete(null);
      setModalVisible(false);
      loadTasks();
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Công việc</Text>
        <Button title="+ Thêm việc" size="sm" onPress={handleOpenCreate} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {(['today', 'upcoming', 'backlog', 'completed'] as TaskTab[]).map((tab) => {
          const tabLabel =
            tab === 'today'
              ? 'Hôm nay'
              : tab === 'upcoming'
              ? 'Sắp tới'
              : tab === 'backlog'
              ? 'Chờ xếp'
              : 'Đã xong';
          const isActive = activeTab === tab;

          return (
            <Pressable
              key={tab}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tabLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            isDailyFocus={focusTaskId === item.id}
            onToggleStatus={handleToggleStatus}
            onToggleFocus={handleToggleFocus}
            onPress={handleOpenEdit}
          />
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              icon="✓"
              title="Không có công việc nào"
              description={
                activeTab === 'today'
                  ? 'Bạn chưa có việc nào lên lịch hôm nay'
                  : 'Danh mục này đang trống'
              }
              actionTitle="+ Thêm việc mới"
              onAction={handleOpenCreate}
            />
          )
        }
      />

      {/* Modal Thêm/Sửa Công việc */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalTopBar}>
            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Hủy</Text>
            </Pressable>
            <Text style={styles.modalTitle}>
              {editingTask ? 'Sửa công việc' : 'Công việc mới'}
            </Text>
            <Pressable onPress={handleSaveTask}>
              <Text style={styles.modalSave}>Lưu</Text>
            </Pressable>
          </View>

          <View style={styles.modalForm}>
            <TextField
              label="Tiêu đề việc cần làm"
              value={title}
              onChangeText={setTitle}
              placeholder="Ví dụ: Hoàn thành báo cáo tuần..."
            />

            <TextField
              label="Mô tả chi tiết (tuỳ chọn)"
              value={description}
              onChangeText={setDescription}
              placeholder="Chi tiết hoặc ghi chú thêm..."
              multiline
              numberOfLines={3}
            />

            <TextField
              label="Ngày thực hiện (YYYY-MM-DD)"
              value={plannedDate}
              onChangeText={setPlannedDate}
              placeholder={todayStr}
            />

            <TextField
              label="Giờ nhắc hẹn (HH:mm - tuỳ chọn)"
              value={reminderTime}
              onChangeText={setReminderTime}
              placeholder="09:00"
            />

            {/* Mức độ ưu tiên */}
            <View style={styles.priorityRow}>
              <Text style={styles.priorityLabel}>Mức ưu tiên:</Text>
              <Pressable
                style={[
                  styles.priorityBtn,
                  priority === 'normal' && styles.priorityBtnActive,
                ]}
                onPress={() => setPriority('normal')}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === 'normal' && styles.priorityTextActive,
                  ]}
                >
                  Bình thường
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.priorityBtn,
                  priority === 'high' && styles.priorityBtnHighActive,
                ]}
                onPress={() => setPriority('high')}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === 'high' && styles.priorityHighText,
                  ]}
                >
                  🔴 Ưu tiên cao
                </Text>
              </Pressable>
            </View>

            {editingTask ? (
              <Button
                title="Xóa công việc"
                variant="danger"
                onPress={() => {
                  setTaskToDelete(editingTask);
                  setDeleteDialogVisible(true);
                }}
                style={styles.deleteBtn}
              />
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Xóa công việc?"
        message="Công việc sẽ bị xóa và hủy toàn bộ lịch nhắc hẹn đã cài đặt."
        confirmText="Xóa"
        danger
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  title: {
    ...Typography.titleLarge,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tabBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalCancel: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
  },
  modalTitle: {
    ...Typography.titleMedium,
  },
  modalSave: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalForm: {
    padding: Spacing.lg,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  priorityLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text,
  },
  priorityBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  priorityBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  priorityBtnHighActive: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  priorityText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  priorityTextActive: {
    color: Colors.primary,
  },
  priorityHighText: {
    color: Colors.error,
  },
  deleteBtn: {
    marginTop: Spacing.xl,
  },
});
