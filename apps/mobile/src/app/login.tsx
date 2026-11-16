import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Typography } from '../theme/tokens';
import { Button, TextField } from '../components';
import { apiRequest } from '../services/apiClient';
import { authStorage } from '../services/authStorage';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('user.a@example.com');
  const [password, setPassword] = useState('password123456');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });

    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error.message || 'Email hoặc mật khẩu không chính xác');
      return;
    }

    if (res.data?.accessToken && res.data?.refreshToken) {
      authStorage.setAccessToken(res.data.accessToken);
      await authStorage.setRefreshToken(res.data.refreshToken);
      await authStorage.setUserProfile(res.data.user);
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>DingDongNote 💜</Text>
          <Text style={styles.subtitle}>Ghi chú, công việc, thói quen & thu chi</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đăng nhập</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="admin@dingdongnote.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextField
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            placeholder="Tối thiểu 12 ký tự"
            secureTextEntry
          />

          <Button
            title="Đăng nhập"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />
        </View>

        {/* Hướng dẫn khôi phục tài khoản cá nhân (Mục 3 & 8) */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Khôi phục tài khoản cá nhân</Text>
          <Text style={styles.infoText}>
            Bản MVP cá nhân tắt tính năng đăng ký công khai. Nếu quên mật khẩu, hãy chạy lệnh quản trị backend trên Railway:
          </Text>
          <Text style={styles.codeText}>npm run admin:reset</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    ...Typography.titleMedium,
    marginBottom: Spacing.md,
  },
  loginBtn: {
    marginTop: Spacing.sm,
  },
  errorBox: {
    backgroundColor: Colors.errorLight,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '600',
  },
  infoBox: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: '#F3EFFF',
    borderRadius: Radius.md,
  },
  infoTitle: {
    ...Typography.caption,
    color: Colors.primaryDark,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  codeText: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
});
