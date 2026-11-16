import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Task } from '@dingdong/contracts';
import { Colors, Radius, Spacing, Typography, Layout } from '../theme/tokens';

export interface TaskRowProps {
  task: Task;
  isDailyFocus?: boolean;
  onToggleStatus: (task: Task) => void;
  onToggleFocus?: (task: Task) => void;
  onPress: (task: Task) => void;
}

export function TaskRow({
  task,
  isDailyFocus = false,
  onToggleStatus,
  onToggleFocus,
  onPress,
}: TaskRowProps) {
  const isCompleted = task.status === 'completed';

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress(task)}
      accessibilityRole="button"
      accessibilityLabel={`Công việc: ${task.title}, trạng thái ${isCompleted ? 'đã hoàn thành' : 'chưa hoàn thành'}`}
    >
      {/* Checkbox */}
      <Pressable
        style={styles.checkboxTouch}
        onPress={() => onToggleStatus(task)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isCompleted }}
        accessibilityLabel={`Đánh dấu ${task.title}`}
      >
        <View style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}>
          {isCompleted ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
      </Pressable>

      {/* Task Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          {task.priority === 'high' ? (
            <Text style={styles.highPriorityBadge}>🔴</Text>
          ) : null}
          <Text
            style={[styles.title, isCompleted && styles.titleCompleted]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
        </View>

        <View style={styles.metaRow}>
          {task.plannedDate ? (
            <Text style={styles.metaText}>📅 {task.plannedDate}</Text>
          ) : null}
          {task.dueAt ? (
            <Text style={[styles.metaText, styles.dueText]}>
              ⏰ Hạn: {new Date(task.dueAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Daily Focus Star Button */}
      {onToggleFocus ? (
        <Pressable
          style={styles.focusTouch}
          onPress={() => onToggleFocus(task)}
          accessibilityRole="button"
          accessibilityLabel={isDailyFocus ? 'Bỏ chọn việc chính' : 'Chọn làm việc chính'}
        >
          <Text style={[styles.focusStar, isDailyFocus && styles.focusStarActive]}>
            {isDailyFocus ? '⭐' : '☆'}
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    minHeight: Layout.minTouchTarget,
  },
  pressed: {
    backgroundColor: '#F7F6F2',
  },
  checkboxTouch: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  checkboxCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingVertical: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  highPriorityBadge: {
    fontSize: 10,
    marginRight: 4,
  },
  title: {
    ...Typography.bodyLarge,
    color: Colors.text,
    flex: 1,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 2,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  dueText: {
    color: Colors.warning,
  },
  focusTouch: {
    padding: Spacing.xs,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusStar: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  focusStarActive: {
    color: '#EAAA08',
  },
});
