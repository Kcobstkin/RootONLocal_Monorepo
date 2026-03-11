/**
 * useAuthStore - Zustand 기반 인증 상태 관리
 *
 * - 로그인/로그아웃 상태
 * - 현재 사용자 정보
 * - localStorage 세션 복원
 * - 권한 확인 유틸
 */

import { create } from 'zustand';
import type { UserRow, AuthResult } from '../types/auth.types';
import { UserLevel, isAdmin } from '../types/auth.types';
import { AuthService } from '../services/AuthService';
import type { ISqliteRepository } from '../services/ISqliteRepository';

interface AuthStore {
  // ─── State ─────────────────────────────────────────────
  isAuthenticated: boolean;
  user: Omit<UserRow, 'password'> | null;
  isLoading: boolean;
  error: string | null;
  authService: AuthService | null;

  // ─── Actions ───────────────────────────────────────────
  /** AuthService 초기화 (DB 연결 후 호출) */
  initAuth: (db: ISqliteRepository) => void;

  /** 로그인 */
  login: (loginId: string, password: string) => Promise<AuthResult>;

  /** 로그아웃 */
  logout: () => void;

  /** 저장된 세션 복원 (앱 시작 시 호출) */
  restoreSession: () => Promise<void>;

  /** 관리자 권한 확인 (user_level ≤ 5) */
  isAdminUser: () => boolean;

  /** 특정 레벨 이상인지 확인 */
  hasLevel: (requiredLevel: number) => boolean;

  /** 에러 초기화 */
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  authService: null,

  initAuth: (db: ISqliteRepository) => {
    const authService = new AuthService(db);
    set({ authService });
  },

  login: async (loginId: string, password: string): Promise<AuthResult> => {
    const { authService } = get();
    if (!authService) {
      return { success: false, error: 'AuthService가 초기화되지 않았습니다' };
    }

    set({ isLoading: true, error: null });

    const result = await authService.login(loginId, password);

    if (result.success && result.user) {
      set({
        isAuthenticated: true,
        user: result.user,
        isLoading: false,
        error: null,
      });
    } else {
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: result.error ?? '로그인에 실패했습니다',
      });
    }

    return result;
  },

  logout: () => {
    const { authService } = get();
    authService?.logout();
    set({
      isAuthenticated: false,
      user: null,
      error: null,
    });
  },

  restoreSession: async () => {
    const { authService } = get();
    if (!authService) return;

    set({ isLoading: true });

    const user = await authService.restoreSession();

    if (user) {
      set({
        isAuthenticated: true,
        user,
        isLoading: false,
      });
    } else {
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    }
  },

  isAdminUser: () => {
    const { user } = get();
    if (!user) return false;
    return isAdmin(user.user_level);
  },

  hasLevel: (requiredLevel: number) => {
    const { user } = get();
    if (!user) return false;
    return user.user_level <= requiredLevel;
  },

  clearError: () => {
    set({ error: null });
  },
}));
