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
import { Habit } from '@dingdong/contracts';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import {
  Button,
  TextField,
  HabitRow,
  HabitDayStatus,
  EmptyState,
} from '../../components';
import { apiRequest } from '../../services/apiClient';

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completionsMap, setCompletionsMap] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);

  // Modal Create / Edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [name, setName] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [reminderTime, setReminderTime] = useState('');

  // 7-day window generation
  const generateSevenDays = (): { date: string; dayLabel: string; isToday: boolean; isFuture: boolean }[] => {
    const days = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayNum = d.getDay(); // 0 is Sun, 1 is Mon
      const isoDay = dayNum === 0 ? 7 : dayNum;
      const dayLabel = isoDay === 7 ? 'CN' : `T${isoDay + 1}`;

      days.push({
        date: dateStr,
        dayLabel,
        isToday: dateStr === todayStr,
        isFuture: false,
      });
    }
    return days;
  };

  const sevenDaysList = generateSevenDays();

  const loadHabits = useCallback(async () => {
    const res = await apiRequest<Habit[]>('/habits');
    if (res.data) {
      setHabits(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const handleOpenCreate = () => {
    setEditingHabit(null);
    setName('');
    setSelectedWeekdays([1, 2, 3, 4, 5]);
    setReminderTime('07:00');
    setModalVisible(true);
  };

  const handleOpenEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setName(habit.name);
    setSelectedWeekdays(habit.currentSchedule?.weekdays || [1, 2, 3, 4, 5]);
    setReminderTime(habit.currentSchedule?.reminderTime || '');
    setModalVisible(true);
  };

  const toggleWeekday = (day: number) => {
    if (selectedWeekdays.includes(day)) {
      if (selectedWeekdays.length === 1) {
        Alert.alert('Lưu ý', 'Thói quen phải có ít nhất một ngày trong tuần');
        return;
      }
      setSelectedWeekdays(selectedWeekdays.filter((d) => d !== day));
    } else {
      setSelectedWeekdays([...selectedWeekdays, day].sort());
    }
  };

  const handleSaveHabit = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Tên thói quen không được để trống');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (editingHabit) {
      await apiRequest(`/habits/${editingHabit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), baseVersion: editingHabit.version }),
      });

      await apiRequest(`/habits/${editingHabit.id}/schedule`, {
        method: 'PUT',
        body: JSON.stringify({
          weekdays: selectedWeekdays,
          reminderTime: reminderTime || null,
          timezone: 'Asia/Ho_Chi_Minh',
        }),
      });
    } else {
      await apiRequest('/habits', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          startDate: todayStr,
          weekdays: selectedWeekdays,
          reminderTime: reminderTime || null,
          timezone: 'Asia/Ho_Chi_Minh',
        }),
      });
    }

    setModalVisible(false);
    loadHabits();
  };

  const handleToggleHabitDate = async (habit: Habit, date: string) => {
    const isCompleted = completionsMap[habit.id]?.[date];
    if (isCompleted) {
      await apiRequest(`/habits/${habit.id}/completions/${date}`, { method: 'DELETE' });
      setCompletionsMap((prev) => ({
        ...prev,
        [habit.id]: { ...(prev[habit.id] || {}), [date]: false },
      }));
    } else {
      await apiRequest(`/habits/${habit.id}/completions/${date}`, { method: 'PUT' });
      setCompletionsMap((prev) => ({
        ...prev,
        [habit.id]: { ...(prev[habit.id] || {}), [date]: true },
      }));
    }
  };

  const handleArchiveHabit = async () => {
    if (!editingHabit) return;
    await apiRequest(`/habits/${editingHabit.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: true, baseVersion: editingHabit.version }),
    });
    setModalVisible(false);
    loadHabits();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Thói quen</Text>
        <Button title="+ Thói quen mới" size="sm" onPress={handleOpenCreate} />
      </View>

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const habitDays: HabitDayStatus[] = sevenDaysList.map((d) => {
            const dayOfWeek = new Date(d.date).getDay();
            const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
            const isScheduled = item.currentSchedule?.weekdays.includes(isoDay) ?? true;
            const completed = !!completionsMap[item.id]?.[d.date];

            return {
              date: d.date,
              dayLabel: d.dayLabel,
              completed,
              isToday: d.isToday,
              isFuture: false,
              isScheduled,
            };
          });

          return (
            <HabitRow
              habit={item}
              days={habitDays}
              onToggleDate={handleToggleHabitDate}
              onPress={handleOpenEdit}
            />
          );
        }}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              icon="⚡"
              title="Chưa có thói quen nào"
              description="Tạo thói quen rèn luyện hàng ngày và theo dõi tiến trình 7 ngày"
              actionTitle="+ Tạo thói quen ngay"
              onAction={handleOpenCreate}
            />
          )
        }
      />

      {/* Modal Thêm/Sửa Thói quen */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalTopBar}>
            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Hủy</Text>
            </Pressable>
            <Text style={styles.modalTitle}>
              {editingHabit ? 'Sửa thói quen' : 'Thói quen mới'}
            </Text>
            <Pressable onPress={handleSaveHabit}>
              <Text style={styles.modalSave}>Lưu</Text>
            </Pressable>
          </View>

          <View style={styles.modalForm}>
            <TextField
              label="Tên thói quen (tối đa 120 ký tự)"
              value={name}
              onChangeText={setName}
              maxLength={120}
              placeholder="Ví dụ: Đọc sách 20 phút, Tập gym..."
            />

            <TextField
              label="Giờ nhắc hẹn mỗi ngày (HH:mm)"
              value={reminderTime}
              onChangeText={setReminderTime}
              placeholder="06:30"
            />

            {/* Chọn thứ trong tuần */}
            <Text style={styles.weekdaysLabel}>Lịch lặp trong tuần:</Text>
            <View style={styles.weekdaysRow}>
              {[
                { day: 1, label: 'T2' },
                { day: 2, label: 'T3' },
                { day: 3, label: 'T4' },
                { day: 4, label: 'T5' },
                { day: 5, label: 'T6' },
                { day: 6, label: 'T7' },
                { day: 7, label: 'CN' },
              ].map(({ day, label }) => {
                const isSelected = selectedWeekdays.includes(day);
                return (
                  <Pressable
                    key={day}
                    style={[
                      styles.weekdayBtn,
                      isSelected && styles.weekdayBtnActive,
                    ]}
                    onPress={() => toggleWeekday(day)}
                  >
                    <Text
                      style={[
                        styles.weekdayText,
                        isSelected && styles.weekdayTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {editingHabit ? (
              <Button
                title="Lưu trữ thói quen (Dừng nhắc)"
                variant="outline"
                onPress={handleArchiveHabit}
                style={styles.archiveBtn}
              />
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>
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
  weekdaysLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  weekdayBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  weekdayText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  weekdayTextActive: {
    color: '#FFFFFF',
  },
  archiveBtn: {
    marginTop: Spacing.xl,
  },
});
