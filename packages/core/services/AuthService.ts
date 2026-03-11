/**
 * AuthService - 로컬 SQLite 기반 인증 서비스
 *
 * - 회원가입 없음 (배포 전 관리자가 DB에 직접 INSERT)
 * - SHA-256 해시 비교로 인증
 * - localStorage에 세션 저장 (자동 로그인)
 */

import type { ISqliteRepository } from './ISqliteRepository';
import type { UserRow, AuthResult } from '../types/auth.types';
import { UserLevel } from '../types/auth.types';

const SESSION_KEY = 'localcontrol_session';

export class AuthService {
  constructor(private readonly db: ISqliteRepository) {}

  /**
   * SHA-256 해시 생성 (Web Crypto API 사용)
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 로그인
   */
  async login(loginId: string, password: string): Promise<AuthResult> {
    try {
      const passwordHash = await this.hashPassword(password);
      const user = await this.db.getUserByCredentials(loginId, passwordHash);

      if (!user) {
        return {
          success: false,
          error: '아이디 또는 비밀번호가 올바르지 않습니다',
        };
      }

      if (user.user_level === UserLevel.INACTIVE) {
        return {
          success: false,
          error: '비활성화된 계정입니다',
        };
      }

      // 세션 저장 (비밀번호 제외)
      const { password: _, ...safeUser } = user;
      this.saveSession(safeUser);

      return { success: true, user: safeUser };
    } catch (error) {
      return {
        success: false,
        error: '로그인 처리 중 오류가 발생했습니다',
      };
    }
  }

  /**
   * 로그아웃
   */
  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  /**
   * 저장된 세션에서 사용자 정보 복원
   */
  async restoreSession(): Promise<Omit<UserRow, 'password'> | null> {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;

    try {
      const userData = JSON.parse(session) as Omit<UserRow, 'password'>;
      // DB에서 사용자가 아직 유효한지 확인
      const user = await this.db.getUserById(userData.id);
      if (!user || user.user_level === UserLevel.INACTIVE) {
        this.logout();
        return null;
      }
      return userData;
    } catch {
      this.logout();
      return null;
    }
  }

  /**
   * 세션 저장
   */
  private saveSession(user: Omit<UserRow, 'password'>): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}
