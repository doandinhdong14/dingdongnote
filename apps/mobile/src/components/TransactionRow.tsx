import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Transaction } from '@dingdong/contracts';
import { Colors, Radius, Spacing, Typography, Layout } from '../theme/tokens';
import { formatVndDisplay } from './MoneyInput';

export interface TransactionRowProps {
  transaction: Transaction;
  categoryName?: string;
  onPress: (transaction: Transaction) => void;
}

export function TransactionRow({
  transaction,
  categoryName = 'Chung',
  onPress,
}: TransactionRowProps) {
  const isIncome = transaction.type === 'income';
  const formattedAmount = formatVndDisplay(transaction.amount);

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress(transaction)}
      accessibilityRole="button"
      accessibilityLabel={`Giao dịch ${isIncome ? 'Thu' : 'Chi'}: ${formattedAmount} đồng, danh mục ${categoryName}`}
    >
      <View
        style={[
          styles.typeIconBox,
          isIncome ? styles.incomeIconBox : styles.expenseIconBox,
        ]}
      >
        <Text style={[styles.typeIcon, isIncome ? styles.incomeText : styles.expenseText]}>
          {isIncome ? '↓' : '↑'}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {categoryName}
          </Text>
          <Text
            style={[
              styles.amount,
              isIncome ? styles.incomeText : styles.expenseText,
            ]}
          >
            {isIncome ? `+${formattedAmount} ₫` : `-${formattedAmount} ₫`}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.date}>{transaction.transactionDate}</Text>
          {transaction.note ? (
            <Text style={styles.note} numberOfLines={1}>
              {transaction.note}
            </Text>
          ) : null}
        </View>
      </View>
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
  typeIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  incomeIconBox: {
    backgroundColor: Colors.successLight,
  },
  expenseIconBox: {
    backgroundColor: Colors.errorLight,
  },
  typeIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  incomeText: {
    color: Colors.success,
  },
  expenseText: {
    color: Colors.error,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  amount: {
    ...Typography.bodyLarge,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  date: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  note: {
    ...Typography.caption,
    color: Colors.textSecondary,
    maxWidth: 160,
  },
});
