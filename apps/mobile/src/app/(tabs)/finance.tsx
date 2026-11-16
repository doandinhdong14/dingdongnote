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
import { Transaction, Category, FinanceSummaryResponse } from '@dingdong/contracts';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import {
  Button,
  TextField,
  MoneyInput,
  TransactionRow,
  EmptyState,
  ConfirmDialog,
  formatVndDisplay,
} from '../../components';
import { apiRequest } from '../../services/apiClient';

export default function FinanceScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<FinanceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Month selector YYYY-MM
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Modal Add Transaction
  const [modalVisible, setModalVisible] = useState(false);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txNote, setTxNote] = useState('');

  // Modal Add Category
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  // Delete Dialog
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  const loadFinanceData = useCallback(async () => {
    // 1. Transactions
    const txRes = await apiRequest<Transaction[]>(`/transactions?from=${selectedMonth}-01&to=${selectedMonth}-31`);
    if (txRes.data) {
      setTransactions(txRes.data);
    }

    // 2. Categories
    const catRes = await apiRequest<Category[]>('/categories');
    if (catRes.data) {
      setCategories(catRes.data);
      if (!selectedCategoryId && catRes.data.length > 0) {
        const defaultCat = catRes.data.find((c) => c.type === txType) || catRes.data[0];
        setSelectedCategoryId(defaultCat.id);
      }
    }

    // 3. Month Summary
    const summaryRes = await apiRequest<FinanceSummaryResponse>(`/summary/finance?month=${selectedMonth}`);
    if (summaryRes.data) {
      setSummary(summaryRes.data);
    }

    setLoading(false);
  }, [selectedMonth, txType, selectedCategoryId]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const handleOpenAddTx = () => {
    setAmount('');
    setTxNote('');
    setTxDate(new Date().toISOString().split('T')[0]);
    const matchedCat = categories.find((c) => c.type === txType);
    if (matchedCat) setSelectedCategoryId(matchedCat.id);
    setModalVisible(true);
  };

  const handleSaveTx = async () => {
    if (!amount.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Lỗi', 'Vui lòng chọn hoặc tạo danh mục');
      return;
    }

    const res = await apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: selectedCategoryId,
        type: txType,
        amount,
        transactionDate: txDate,
        note: txNote.trim() || null,
      }),
    });

    if (res.error) {
      Alert.alert('Lỗi', res.error.message || 'Không thể lưu giao dịch');
      return;
    }

    setModalVisible(false);
    loadFinanceData();
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    const res = await apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: newCatName.trim(),
        type: newCatType,
      }),
    });

    if (res.data) {
      setSelectedCategoryId(res.data.id);
      setCatModalVisible(false);
      setNewCatName('');
      loadFinanceData();
    }
  };

  const confirmDeleteTx = () => {
    if (!txToDelete) return;
    apiRequest(`/transactions/${txToDelete.id}`, {
      method: 'DELETE',
      body: JSON.stringify({ baseVersion: txToDelete.version }),
    }).then(() => {
      setDeleteDialogVisible(false);
      setTxToDelete(null);
      loadFinanceData();
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tài chính</Text>
        <Button title="+ Ghi thu chi" size="sm" onPress={handleOpenAddTx} />
      </View>

      {/* Month Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryMonth}>Tháng {selectedMonth}</Text>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Thu nhập</Text>
            <Text style={[styles.summaryAmount, styles.incomeColor]}>
              +{formatVndDisplay(summary?.totalIncome || '0')} ₫
            </Text>
          </View>
          <View>
            <Text style={styles.summaryLabel}>Chi tiêu</Text>
            <Text style={[styles.summaryAmount, styles.expenseColor]}>
              -{formatVndDisplay(summary?.totalExpense || '0')} ₫
            </Text>
          </View>
        </View>

        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Chênh lệch kỳ:</Text>
          <Text
            style={[
              styles.netAmount,
              Number(summary?.netDifference || 0) >= 0 ? styles.incomeColor : styles.expenseColor,
            ]}
          >
            {formatVndDisplay(summary?.netDifference || '0')} ₫
          </Text>
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const cat = categories.find((c) => c.id === item.categoryId);
          return (
            <TransactionRow
              transaction={item}
              categoryName={cat?.name || 'Chung'}
              onPress={() => {
                setTxToDelete(item);
                setDeleteDialogVisible(true);
              }}
            />
          );
        }}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              icon="💰"
              title="Chưa có giao dịch trong tháng"
              description="Bấm ghi thu chi để quản lý tài chính cá nhân không sai số"
              actionTitle="+ Thêm giao dịch"
              onAction={handleOpenAddTx}
            />
          )
        }
      />

      {/* Modal Thêm Giao Dịch */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalTopBar}>
            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Hủy</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Ghi giao dịch</Text>
            <Pressable onPress={handleSaveTx}>
              <Text style={styles.modalSave}>Lưu</Text>
            </Pressable>
          </View>

          <View style={styles.modalForm}>
            {/* Loại giao dịch Thu / Chi */}
            <View style={styles.typeSelector}>
              <Pressable
                style={[
                  styles.typeBtn,
                  txType === 'expense' && styles.typeBtnExpenseActive,
                ]}
                onPress={() => {
                  setTxType('expense');
                  const match = categories.find((c) => c.type === 'expense');
                  if (match) setSelectedCategoryId(match.id);
                }}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    txType === 'expense' && styles.typeTextActive,
                  ]}
                >
                  ↑ Khoản Chi
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.typeBtn,
                  txType === 'income' && styles.typeBtnIncomeActive,
                ]}
                onPress={() => {
                  setTxType('income');
                  const match = categories.find((c) => c.type === 'income');
                  if (match) setSelectedCategoryId(match.id);
                }}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    txType === 'income' && styles.typeTextActive,
                  ]}
                >
                  ↓ Khoản Thu
                </Text>
              </Pressable>
            </View>

            <MoneyInput
              label="Số tiền"
              value={amount}
              onChangeValue={setAmount}
            />

            {/* Chọn danh mục */}
            <View style={styles.categorySelectHeader}>
              <Text style={styles.categoryLabel}>Danh mục:</Text>
              <Pressable onPress={() => setCatModalVisible(true)}>
                <Text style={styles.addCategoryText}>+ Thêm danh mục</Text>
              </Pressable>
            </View>

            <View style={styles.categoriesPills}>
              {categories
                .filter((c) => c.type === txType)
                .map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.catPill,
                      selectedCategoryId === cat.id && styles.catPillActive,
                    ]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    <Text
                      style={[
                        styles.catPillText,
                        selectedCategoryId === cat.id && styles.catPillTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
            </View>

            <TextField
              label="Ngày giao dịch (YYYY-MM-DD)"
              value={txDate}
              onChangeText={setTxDate}
            />

            <TextField
              label="Ghi chú (tuỳ chọn)"
              value={txNote}
              onChangeText={setTxNote}
              placeholder="Ví dụ: Cà phê sáng với bạn..."
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Thêm Danh Mục */}
      <Modal visible={catModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Thêm danh mục mới</Text>
            <TextField
              label="Tên danh mục"
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="Ví dụ: Xăng xe, Mua sắm..."
            />
            <View style={styles.dialogActions}>
              <Button
                title="Hủy"
                variant="outline"
                size="sm"
                onPress={() => setCatModalVisible(false)}
              />
              <Button
                title="Tạo"
                size="sm"
                onPress={handleCreateCategory}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Xóa giao dịch?"
        message="Giao dịch này sẽ bị xóa và cập nhật lại số dư kỳ tức thì."
        confirmText="Xóa"
        danger
        onConfirm={confirmDeleteTx}
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
  summaryCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  summaryMonth: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  incomeColor: {
    color: Colors.success,
  },
  expenseColor: {
    color: Colors.error,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  netLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text,
  },
  netAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
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
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  typeBtnExpenseActive: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  typeBtnIncomeActive: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  typeBtnText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  typeTextActive: {
    color: Colors.text,
  },
  categorySelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  categoryLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text,
  },
  addCategoryText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
  categoriesPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  catPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  catPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catPillText: {
    ...Typography.caption,
    color: Colors.text,
  },
  catPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 32, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialogCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  dialogTitle: {
    ...Typography.titleMedium,
    marginBottom: Spacing.md,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
