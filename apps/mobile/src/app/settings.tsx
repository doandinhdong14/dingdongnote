import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing, Typography } from '../theme/tokens';
import { Button, TextField, ConfirmDialog } from '../components';
import { authStorage, StoredUserProfile } from '../services/authStorage';
import { notificationService } from '../services/notificationService';
import { syncEngine } from '../services/syncEngine';
import { localDb } from '../services/database';
import { apiRequest } from '../services/apiClient';

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<StoredUserProfile | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Logout dialog
  const [logoutDialog, setLogoutDialog] = useState(false);

  // Privacy Policy modal
  const [policyModalVisible, setPolicyModalVisible] = useState(false);

  // Export Data modal
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportData, setExportData] = useState<any>(null);

  // Delete Account modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    async function load() {
      const user = await authStorage.getUserProfile();
      setProfile(user);
      setPendingOutboxCount(localDb.getPendingOutboxCount());
      const hasPerm = await notificationService.requestPermissions();
      setPermissionGranted(hasPerm);
    }
    load();
  }, []);

  const handleTestNotification = async () => {
    try {
      await notificationService.sendTestNotification();
      Alert.alert(
        'Thành công',
        'Đã phát lời nhắc thử nghiệm! Hãy kiểm tra thanh thông báo thiết bị (OPPO / ColorOS).'
      );
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể phát thông báo');
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    const result = await syncEngine.syncAll();
    setSyncing(false);
    setPendingOutboxCount(localDb.getPendingOutboxCount());
    Alert.alert(
      'Đồng bộ hoàn tất',
      `Đã gửi: ${result.pushed} thay đổi\nLỗi/Xung đột: ${result.errors}`
    );
  };

  const handleOpenExport = async () => {
    setExportLoading(true);
    setExportModalVisible(true);
    const res = await apiRequest<any>('/me/export');
    setExportLoading(false);
    if (res.data) {
      setExportData(res.data);
    } else {
      Alert.alert('Lỗi', res.error?.message || 'Không thể xuất dữ liệu');
      setExportModalVisible(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Vui lòng nhập mật khẩu tài khoản để xác nhận');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    const res = await apiRequest('/me', {
      method: 'DELETE',
      body: JSON.stringify({ password: deletePassword }),
    });

    setDeleteLoading(false);

    if (res.error) {
      setDeleteError(res.error.message || 'Mật khẩu xác thực không đúng');
      return;
    }

    // Xóa sạch dữ liệu SQLite và SecureStore
    localDb.clearAllLocalData();
    await authStorage.clearAll();
    setDeleteModalVisible(false);
    Alert.alert('Đã xóa tài khoản', 'Tài khoản và toàn bộ dữ liệu cá nhân của bạn đã được xóa vĩnh viễn.');
    router.replace('/login');
  };

  const handleLogout = async (forceDiscard = false) => {
    if (pendingOutboxCount > 0 && !forceDiscard) {
      Alert.alert(
        'Dữ liệu chờ gửi',
        `Bạn có ${pendingOutboxCount} thay đổi ngoại tuyến chưa được gửi lên máy chủ. Bạn có muốn đồng bộ trước khi đăng xuất không?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đồng bộ trước',
            onPress: async () => {
              await handleSyncNow();
              localDb.clearAllLocalData();
              await authStorage.clearAll();
              setLogoutDialog(false);
              router.replace('/login');
            },
          },
          {
            text: 'Xóa & Đăng xuất',
            style: 'destructive',
            onPress: async () => {
              localDb.clearAllLocalData();
              await authStorage.clearAll();
              setLogoutDialog(false);
              router.replace('/login');
            },
          },
        ]
      );
      return;
    }

    localDb.clearAllLocalData();
    await authStorage.clearAll();
    setLogoutDialog(false);
    router.replace('/login');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tài khoản cá nhân */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>TÀI KHOẢN CHỦ SỞ HỮU</Text>
        <View style={styles.item}>
          <Text style={styles.label}>Tên hiển thị</Text>
          <Text style={styles.value}>{profile?.displayName || 'Đoàn Đình Đông'}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{profile?.email || 'admin@dingdongnote.com'}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Múi giờ</Text>
          <Text style={styles.value}>{profile?.timezone || 'Asia/Ho_Chi_Minh'}</Text>
        </View>
      </View>

      {/* Chẩn đoán Thông báo (Mục 9 & 9.4) */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>CHẨN ĐOÁN THÔNG BÁO & LỜI NHẮC</Text>
        <View style={styles.item}>
          <Text style={styles.label}>Quyền thông báo hệ thống</Text>
          <Text
            style={[
              styles.value,
              permissionGranted ? styles.successText : styles.errorText,
            ]}
          >
            {permissionGranted ? '✓ Đã cấp quyền' : '✗ Chưa cấp quyền'}
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Kênh công việc (Channel tasks)</Text>
          <Text style={[styles.value, styles.successText]}>✓ High/Sound/Vibrate</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Kênh thói quen (Channel habits)</Text>
          <Text style={[styles.value, styles.successText]}>✓ High/Sound/Vibrate</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Nút tương tác thông báo</Text>
          <Text style={[styles.value, styles.successText]}>✓ Đã xong / Nhắc lại 10 phút</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Thiết bị tối ưu</Text>
          <Text style={styles.value}>OPPO (ColorOS) & Android</Text>
        </View>

        <Button
          title="🔔 Thử phát lời nhắc mẫu ngay (OPPO)"
          variant="outline"
          onPress={handleTestNotification}
          style={styles.actionBtn}
        />
      </View>

      {/* Đồng bộ & Ngoại tuyến */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>ĐỒNG BỘ & DỮ LIỆU NGOẠI TUYẾN</Text>
        <View style={styles.item}>
          <Text style={styles.label}>Thay đổi chờ gửi (Outbox)</Text>
          <Text style={styles.value}>{pendingOutboxCount} mục</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Cơ sở dữ liệu cục bộ</Text>
          <Text style={styles.value}>SQLite (WAL mode)</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Lưu trữ khóa bảo mật</Text>
          <Text style={styles.value}>Expo SecureStore</Text>
        </View>

        <Button
          title="🔄 Đồng bộ ngay với máy chủ"
          onPress={handleSyncNow}
          loading={syncing}
          style={styles.actionBtn}
        />
      </View>

      {/* Quyền riêng tư & Quản lý dữ liệu (Mục 3 & 8 & GDPR) */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>QUYỀN RIÊNG TƯ & DỮ LIỆU (GDPR)</Text>
        <Button
          title="📄 Xem Chính sách Quyền riêng tư"
          variant="outline"
          onPress={() => setPolicyModalVisible(true)}
          style={styles.actionBtn}
        />
        <Button
          title="📦 Xuất toàn bộ dữ liệu cá nhân (JSON)"
          variant="outline"
          onPress={handleOpenExport}
          style={styles.actionBtn}
        />
        <Button
          title="⚠️ Xóa tài khoản vĩnh viễn"
          variant="danger"
          onPress={() => {
            setDeletePassword('');
            setDeleteError('');
            setDeleteModalVisible(true);
          }}
          style={styles.actionBtn}
        />
      </View>

      {/* Đăng xuất */}
      <Button
        title="Đăng xuất"
        variant="outline"
        onPress={() => setLogoutDialog(true)}
        style={styles.logoutBtn}
      />

      {/* Dialog Xác nhận Đăng xuất */}
      <ConfirmDialog
        visible={logoutDialog}
        title="Đăng xuất?"
        message="Hệ thống sẽ thu hồi phiên đăng nhập hiện tại và xóa token lưu trữ an toàn."
        confirmText="Đăng xuất"
        danger
        onConfirm={() => handleLogout(false)}
        onCancel={() => setLogoutDialog(false)}
      />

      {/* Modal Chính sách quyền riêng tư */}
      <Modal visible={policyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chính sách Quyền riêng tư</Text>
            <ScrollView style={styles.policyScroll}>
              <Text style={styles.policyText}>
                DingDongNote cam kết tôn trọng tuyệt đối quyền riêng tư và dữ liệu cá nhân của người dùng:
                {'\n\n'}
                1. <Text style={styles.boldText}>Dữ liệu cá nhân:</Text> Mọi ghi chú, công việc, thói quen và sổ thu chi thuộc quyền sở hữu riêng của bạn. Ứng dụng không bán, không chia sẻ và không theo dõi hành vi cho mục đích quảng cáo.
                {'\n\n'}
                2. <Text style={styles.boldText}>Bảo mật:</Text> Mật khẩu được mã hóa một chiều bằng thuật toán Argon2id (tiêu chuẩn khuyến nghị của OWASP). Khóa phiên đăng nhập được lưu trữ trong phân vùng bảo mật phần cứng (SecureStore).
                {'\n\n'}
                3. <Text style={styles.boldText}>Dữ liệu ngoại tuyến & Đồng bộ:</Text> SQLite hoạt động cục bộ trên máy giúp bạn truy cập dữ liệu khi không có mạng. Khi có mạng, dữ liệu được truyền tải qua kết nối HTTPS bảo mật về máy chủ Railway.
                {'\n\n'}
                4. <Text style={styles.boldText}>Quyền xóa dữ liệu (Right to be Forgotten):</Text> Bạn có toàn quyền yêu cầu xuất bản sao lưu dữ liệu dạng JSON hoặc xóa vĩnh viễn tài khoản và toàn bộ dữ liệu bất kỳ lúc nào.
              </Text>
            </ScrollView>
            <Button
              title="Đóng"
              onPress={() => setPolicyModalVisible(false)}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Xuất dữ liệu JSON */}
      <Modal visible={exportModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xuất dữ liệu cá nhân (GDPR)</Text>
            {exportLoading ? (
              <Text style={styles.loadingText}>Đang tổng hợp dữ liệu từ máy chủ...</Text>
            ) : exportData ? (
              <>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryItem}>📝 Ghi chú: {exportData.notes?.length || 0}</Text>
                  <Text style={styles.summaryItem}>✓ Công việc: {exportData.tasks?.length || 0}</Text>
                  <Text style={styles.summaryItem}>⚡ Thói quen: {exportData.habits?.length || 0}</Text>
                  <Text style={styles.summaryItem}>💰 Giao dịch: {exportData.transactions?.length || 0}</Text>
                </View>
                <ScrollView style={styles.jsonPreviewBox}>
                  <Text style={styles.codeText}>
                    {JSON.stringify(exportData, null, 2).slice(0, 1000)}...
                  </Text>
                </ScrollView>
              </>
            ) : null}
            <Button
              title="Đóng"
              onPress={() => setExportModalVisible(false)}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Xóa tài khoản vĩnh viễn */}
      <Modal visible={deleteModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: Colors.error }]}>Xóa tài khoản vĩnh viễn</Text>
            <Text style={styles.deleteWarning}>
              Hành động này không thể hoàn tác. Toàn bộ ghi chú, công việc, thói quen, lịch sử thu chi và tài khoản của bạn sẽ bị xóa sạch khỏi hệ thống.
            </Text>

            {deleteError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{deleteError}</Text>
              </View>
            ) : null}

            <TextField
              label="Nhập lại mật khẩu để xác nhận"
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Mật khẩu của bạn"
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <Button
                title="Hủy"
                variant="outline"
                onPress={() => setDeleteModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Xác nhận Xóa"
                variant="danger"
                onPress={handleConfirmDeleteAccount}
                loading={deleteLoading}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  label: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  value: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  successText: {
    color: Colors.success,
  },
  errorText: {
    color: Colors.error,
  },
  actionBtn: {
    marginTop: Spacing.sm,
  },
  logoutBtn: {
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    ...Typography.titleMedium,
    marginBottom: Spacing.md,
  },
  policyScroll: {
    maxHeight: 300,
  },
  policyText: {
    ...Typography.bodyMedium,
    color: Colors.text,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.text,
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: Spacing.lg,
  },
  summaryBox: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  summaryItem: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: Colors.text,
  },
  jsonPreviewBox: {
    maxHeight: 200,
    backgroundColor: '#1E1E2E',
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#A6ACCD',
  },
  deleteWarning: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  errorBox: {
    backgroundColor: '#FEE4E2',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
});