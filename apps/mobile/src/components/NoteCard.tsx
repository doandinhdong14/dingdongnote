import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Note } from '@dingdong/contracts';
import { Colors, Radius, Spacing, Typography, Layout } from '../theme/tokens';

export interface NoteCardProps {
  note: Note;
  onPress: (note: Note) => void;
  onTogglePin?: (note: Note) => void;
}

export function NoteCard({ note, onPress, onTogglePin }: NoteCardProps) {
  const displayTitle = note.title.trim()
    ? note.title
    : note.body.split('\n')[0] || 'Ghi chú không có tiêu đề';

  const previewBody = note.title.trim()
    ? note.body
    : note.body.split('\n').slice(1).join('\n').trim();

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress(note)}
      accessibilityRole="button"
      accessibilityLabel={`Ghi chú: ${displayTitle}`}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {displayTitle}
        </Text>
        {onTogglePin ? (
          <Pressable
            style={styles.pinButton}
            onPress={() => onTogglePin(note)}
            accessibilityRole="button"
            accessibilityLabel={note.pinned ? 'Bỏ ghim' : 'Ghim ghi chú'}
          >
            <Text style={[styles.pinIcon, note.pinned && styles.pinIconActive]}>
              📌
            </Text>
          </Pressable>
        ) : note.pinned ? (
          <Text style={styles.pinIconActive}>📌</Text>
        ) : null}
      </View>

      {previewBody ? (
        <Text style={styles.body} numberOfLines={3}>
          {previewBody}
        </Text>
      ) : null}

      <Text style={styles.date}>
        {new Date(note.updatedAt).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </Pressable>
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
    minHeight: Layout.minTouchTarget,
  },
  pressed: {
    backgroundColor: '#F7F6F2',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  pinButton: {
    padding: Spacing.xs,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinIcon: {
    fontSize: 16,
    opacity: 0.3,
  },
  pinIconActive: {
    fontSize: 16,
    opacity: 1,
  },
  body: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  date: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 12,
  },
});
