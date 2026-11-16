import { authStorage } from './authStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api/v1';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await authStorage.getRefreshToken();
      if (!refreshToken) return null;

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        await authStorage.clearAll();
        return null;
      }

      const body = (await res.json()) as any;
      const newAccessToken = body.data.accessToken;
      const newRefreshToken = body.data.refreshToken;

      authStorage.setAccessToken(newAccessToken);
      await authStorage.setRefreshToken(newRefreshToken);

      return newAccessToken;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: any; status: number }> {
  let token = authStorage.getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    let response = await fetch(url, { ...options, headers });

    // Handle 401 token refresh single-flight
    if (response.status === 401 && token) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        headers['Authorization'] = `Bearer ${refreshedToken}`;
        response = await fetch(url, { ...options, headers });
      }
    }

    const json = await response.json();
    return { data: json.data, error: json.error, status: response.status };
  } catch (err: any) {
    return {
      status: 0,
      error: { code: 'NETWORK_ERROR', message: err.message || 'Mất kết nối mạng' },
    };
  }
}
