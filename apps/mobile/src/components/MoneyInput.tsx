import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, Typography, Layout } from '../theme/tokens';

export interface MoneyInputProps {
  label?: string;
  value: string; // raw digits string (e.g. "35000")
  onChangeValue: (value: string) => void;
  error?: string;
  containerStyle?: ViewStyle;
}

export function formatVndDisplay(digits: string): string {
  if (!digits) return '';
  const cleanDigits = digits.replace(/\D/g, '');
  if (!cleanDigits) return '';
  return cleanDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function MoneyInput({
  label = 'Số tiền (VND)',
  value,
  onChangeValue,
  error,
  containerStyle,
}: MoneyInputProps) {
  const handleChangeText = (text: string) => {
    const rawDigits = text.replace(/\D/g, '');
    // limit max 12 digits (999.999.999.999)
    if (rawDigits.length <= 12) {
      onChangeValue(rawDigits);
    }
  };

  const displayValue = formatVndDisplay(value);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, !!error && styles.inputRowError]}>
        <TextInput
          value={displayValue}
          onChangeText={handleChangeText}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
          style={styles.input}
          accessibilityLabel={label}
        />
        <Text style={styles.currencyBadge}>₫</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.caption,
    color: Colors.text,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    minHeight: Layout.minTouchTarget,
  },
  inputRowError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  currencyBadge: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
