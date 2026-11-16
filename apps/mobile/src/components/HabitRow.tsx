import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Habit } from '@dingdong/contracts';
import { Colors, Radius, Spacing, Typography, Layout } from '../theme/tokens';

export interface HabitDayStatus {
  date: string; // YYYY-MM-DD
  dayLabel: string; // T2, T3, T4...
  completed: boolean;
  isToday: boolean;
  isFuture: boolean;
  isScheduled: boolean;
}

export interface HabitRowProps {
  habit: Habit;
  days: HabitDayStatus[];
  onToggleDate: (habit: Habit, date: string) => void;
  onPress: (habit: Habit) => void;
}

export function HabitRow({
  habit,
  days,
  onToggleDate,
  onPress,
}: HabitRowProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => onPress(habit)}
        accessibilityRole="button"
        accessibilityLabel={`Thói quen: ${habit.name}`}
      >
        <Text style={styles.name} numberOfLines={1}>
          {habit.name}
        </Text>
        {habit.currentSchedule?.reminderTime ? (
          <Text style={styles.reminderBadge}>
            ⏰ {habit.currentSchedule.reminderTime}
          </Text>
        ) : null}
      </Pressable>

      {/* 7-day checkboxes */}
      <View style={styles.daysRow}>
        {days.map((item) => {
          const disabled = item.isFuture || !item.isScheduled;

          return (
            <View key={item.date} style={styles.dayCol}>
              <Text
                style={[
                  styles.dayLabel,
                  item.isToday && styles.todayLabel,
                  disabled && styles.disabledLabel,
                ]}
              >
                {item.dayLabel}
              </Text>
              <Pressable
                disabled={disabled}
                onPress={() => onToggleDate(habit, item.date)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.completed, disabled }}
                accessibilityLabel={`${item.dayLabel} ${item.date}`}
                style={[
                  styles.dayBox,
                  item.completed && styles.dayBoxCompleted,
                  item.isToday && !item.completed && styles.dayBoxToday,
                  disabled && styles.dayBoxDisabled,
                ]}
              >
                {item.completed ? (
                  <Text style={styles.dayCheck}>✓</Text>
                ) : item.isToday ? (
                  <View style={styles.todayDot} />
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    minHeight: 32,
  },
  name: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  reminderBadge: {
    ...Typography.caption,
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  todayLabel: {
    color: Colors.primary,
  },
  disabledLabel: {
    color: Colors.borderStrong,
  },
  dayBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBoxToday: {
    borderColor: Colors.primary,
  },
  dayBoxCompleted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayBoxDisabled: {
    backgroundColor: '#F5F5F3',
    borderColor: '#ECEAE4',
  },
  dayCheck: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
});
