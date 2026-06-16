/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { activityLogApi } from "@/api/activityLogApi";
import { authApi, type LoginCredentials } from "@/api/authApi";
import { userApi, type ProfileUpdateRequest, type UserDTO } from "@/api/userApi";
import {
  clearStoredAuthToken,
  readStoredAuthToken,
  setAuthTokenProvider,
  writeStoredAuthToken,
} from "@/api/httpClient";

interface AuthContextValue {
  token: string | null;
  user: UserDTO | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials, remember?: boolean) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<UserDTO | null>;
  updateProfile: (request: ProfileUpdateRequest) => Promise<UserDTO | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredAuthToken());
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isInitializing, setIsInitializing] = useState(Boolean(token));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAuthTokenProvider(() => token);
  }, [token]);

  const logout = useCallback(() => {
    if (token) {
      activityLogApi.logLogout().catch(() => undefined);
    }

    clearStoredAuthToken();
    setToken(null);
    setUser(null);
    setError(null);
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      return null;
    }

    const currentUser = await userApi.getMe();
    setUser(currentUser);
    return currentUser;
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      if (!token) {
        setIsInitializing(false);
        return;
      }

      setIsInitializing(true);
      try {
        const currentUser = await userApi.getMe();
        if (!cancelled) setUser(currentUser);
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [logout, token]);

  const login = useCallback(
    async (credentials: LoginCredentials, remember = true) => {
      setIsLoading(true);
      setError(null);
      try {
        const authToken = await authApi.login(credentials);
        writeStoredAuthToken(authToken, remember);
        setToken(authToken);
        setAuthTokenProvider(() => authToken);

        const currentUser = await userApi.getMe();
        setUser(currentUser);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to sign in. Please try again.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const updateProfile = useCallback(
    async (request: ProfileUpdateRequest) => {
      await userApi.updateMe(request);
      return refreshUser();
    },
    [refreshUser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isInitializing,
      isLoading,
      error,
      login,
      logout,
      refreshUser,
      updateProfile,
    }),
    [error, isInitializing, isLoading, login, logout, refreshUser, token, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
