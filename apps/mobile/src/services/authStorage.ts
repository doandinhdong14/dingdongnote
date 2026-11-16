import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'dingdong_refresh_token';
const USER_PROFILE_KEY = 'dingdong_user_profile';

let memoryAccessToken: string | null = null;

export interface StoredUserProfile {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
}

export const authStorage = {
  getAccessToken(): string | null {
    return memoryAccessToken;
  },

  setAccessToken(token: string | null): void {
    memoryAccessToken = token;
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch (e) {
      console.warn('SecureStore set error:', e);
    }
  },

  async removeRefreshToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {}
    memoryAccessToken = null;
  },

  async getUserProfile(): Promise<StoredUserProfile | null> {
    try {
      const raw = await SecureStore.getItemAsync(USER_PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setUserProfile(profile: StoredUserProfile): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch {}
  },

  async clearAll(): Promise<void> {
    await this.removeRefreshToken();
    try {
      await SecureStore.deleteItemAsync(USER_PROFILE_KEY);
    } catch {}
    memoryAccessToken = null;
  },
};
