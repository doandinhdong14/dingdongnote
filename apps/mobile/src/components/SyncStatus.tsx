import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../theme/tokens';

export type SyncState = 'synced' | 'pending' | 'syncing' | 'conflict' | 'offline';

export interface SyncStatusProps {
  state: SyncState;
  pendingCount?: number;
}

export function SyncStatus({ state, pendingCount = 0 }: SyncStatusProps) {
  let text = 'Đã đồng bộ';
  let bgColor: string = Colors.successLight;
  let textColor: string = Colors.success;
  let icon = '●';

  if (state === 'pending') {
    text = `Chờ gửi (${pendingCount})`;
    bgColor = Colors.warningLight;
    textColor = Colors.warning;
    icon = '⏳';
  } else if (state === 'syncing') {
    text = 'Đang đồng bộ...';
    bgColor = Colors.primaryLight;
    textColor = Colors.primary;
    icon = '🔄';
  } else if (state === 'conflict') {
    text = 'Có xung đột';
    bgColor = Colors.errorLight;
    textColor = Colors.error;
    icon = '⚠️';
  } else if (state === 'offline') {
    text = 'Ngoại tuyến';
    bgColor = Colors.border;
    textColor = Colors.textSecondary;
    icon = '☁️';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]} accessibilityLabel={`Trạng thái đồng bộ: ${text}`}>
      <Text style={[styles.icon, { color: textColor }]}>{icon}</Text>
      <Text style={[styles.text, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  icon: {
    fontSize: 10,
    marginRight: 4,
  },
  text: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
});
