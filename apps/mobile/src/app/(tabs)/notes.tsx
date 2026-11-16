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
import { Note } from '@dingdong/contracts';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import {
  Button,
  TextField,
  NoteCard,
  EmptyState,
  ConfirmDialog,
} from '../../components';
import { apiRequest } from '../../services/apiClient';

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit / Create Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);

  // Confirm Delete Dialog
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const loadNotes = useCallback(async () => {
    const queryParam = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : '';
    const res = await apiRequest<Note[]>(`/notes${queryParam}`);
    if (res.data) {
      setNotes(res.data);
    }
    setLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleOpenCreate = () => {
    setEditingNote(null);
    setTitle('');
    setBody('');
    setPinned(false);
    setModalVisible(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setBody(note.body);
    setPinned(note.pinned);
    setModalVisible(true);
  };

  const handleSaveNote = async () => {
    if (!title.trim() && !body.trim()) {
      Alert.alert('Lỗi', 'Ghi chú phải có tiêu đề hoặc nội dung');
      return;
    }

    if (editingNote) {
      // Update
      await apiRequest(`/notes/${editingNote.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          pinned,
          baseVersion: editingNote.version,
        }),
      });
    } else {
      // Create
      await apiRequest('/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          pinned,
        }),
      });
    }

    setModalVisible(false);
    loadNotes();
  };

  const handleTogglePin = async (note: Note) => {
    await apiRequest(`/notes/${note.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ pinned: !note.pinned, baseVersion: note.version }),
    });
    loadNotes();
  };

  // Convert note to task (Mục 2.1)
  const handleConvertToTask = async () => {
    if (!editingNote) return;
    const taskTitle = editingNote.title.trim()
      ? editingNote.title
      : editingNote.body.split('\n')[0] || 'Việc cần làm từ ghi chú';

    await apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: taskTitle,
        description: editingNote.body,
        noteId: editingNote.id,
      }),
    });

    setModalVisible(false);
    Alert.alert('Thành công', 'Đã chuyển ghi chú thành công việc mới!');
  };

  const confirmDeleteNote = () => {
    if (!noteToDelete) return;
    apiRequest(`/notes/${noteToDelete.id}`, {
      method: 'DELETE',
      body: JSON.stringify({ baseVersion: noteToDelete.version }),
    }).then(() => {
      setDeleteDialogVisible(false);
      setNoteToDelete(null);
      setModalVisible(false);
      loadNotes();
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Search & Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ghi chú</Text>
        <Button title="+ Tạo ghi chú" size="sm" onPress={handleOpenCreate} />
      </View>

      <View style={styles.searchContainer}>
        <TextField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="🔍 Tìm kiếm theo tiêu đề hoặc nội dung..."
          containerStyle={styles.searchField}
        />
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={handleOpenEdit}
            onTogglePin={handleTogglePin}
          />
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              icon="📝"
              title="Chưa có ghi chú nào"
              description="Bấm tạo ghi chú để lưu lại ý tưởng hoặc thông tin quan trọng"
              actionTitle="+ Tạo ghi chú ngay"
              onAction={handleOpenCreate}
            />
          )
        }
      />

      {/* Modal Tạo/Sửa Ghi chú */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalTopBar}>
            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Hủy</Text>
            </Pressable>
            <Text style={styles.modalTitle}>
              {editingNote ? 'Sửa ghi chú' : 'Ghi chú mới'}
            </Text>
            <Pressable onPress={handleSaveNote}>
              <Text style={styles.modalSave}>Lưu</Text>
            </Pressable>
          </View>

          <View style={styles.modalForm}>
            <TextField
              label="Tiêu đề (Tối đa 200 ký tự)"
              value={title}
              onChangeText={setTitle}
              maxLength={200}
              placeholder="Tiêu đề hoặc để trống lấy dòng đầu..."
            />

            <TextField
              label="Nội dung"
              value={body}
              onChangeText={setBody}
              maxLength={50000}
              placeholder="Nhập nội dung ghi chú ở đây..."
              multiline
              numberOfLines={8}
              style={styles.bodyInput}
            />

            <View style={styles.optionsRow}>
              <Pressable
                style={styles.pinToggle}
                onPress={() => setPinned(!pinned)}
              >
                <Text style={styles.pinToggleText}>
                  {pinned ? '📌 Đang ghim lên đầu' : '📌 Ghim lên đầu'}
                </Text>
              </Pressable>

              {editingNote ? (
                <Pressable
                  style={styles.convertBtn}
                  onPress={handleConvertToTask}
                >
                  <Text style={styles.convertText}>✓ Chuyển thành công việc</Text>
                </Pressable>
              ) : null}
            </View>

            {editingNote ? (
              <Button
                title="Xóa ghi chú"
                variant="danger"
                onPress={() => {
                  setNoteToDelete(editingNote);
                  setDeleteDialogVisible(true);
                }}
                style={styles.deleteBtn}
              />
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Xóa ghi chú?"
        message="Ghi chú sẽ bị xóa khỏi danh sách. Các công việc liên kết với ghi chú này vẫn được giữ nguyên."
        confirmText="Xóa"
        danger
        onConfirm={confirmDeleteNote}
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
  },
  searchField: {
    marginBottom: Spacing.sm,
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
  bodyInput: {
    minHeight: 180,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.md,
  },
  pinToggle: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pinToggleText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  convertBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
  },
  convertText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  deleteBtn: {
    marginTop: Spacing.xl,
  },
});
