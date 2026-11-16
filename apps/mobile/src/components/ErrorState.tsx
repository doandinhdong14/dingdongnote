import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Typography } from '../theme/tokens';
import { Button } from './Button';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  message = 'Đã có lỗi xảy ra. Vui lòng thử lại.',
  onRetry,
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>Không thể tải dữ liệu</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button
          title="Thử lại"
          onPress={onRetry}
          variant="primary"
          size="sm"
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 44,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.titleMedium,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 280,
  },
  button: {
    marginTop: Spacing.xs,
  },
});
