/**
 * usePermission - 권한 기반 UI 제어 훅
 *
 * user_level에 따라 UI 요소 가시성을 결정
 * | user_level | 구역설정 | 장치 추가/삭제 | 장치 제어 |
 * |------------|----------|---------------|----------|
 * | 1 (슈퍼관리자) | O | O | O |
 * | 5 (관리자) | O | O | O |
 * | 10 (일반) | X | X | O |
 * | 99 (비활성) | 로그인 차단 | - | - |
 */

import { useAuthStore } from '../store/useAuthStore';
import { UserLevel } from '../types/auth.types';

export interface Permissions {
  /** 구역 설정 가능 여부 */
  canManageGroups: boolean;
  /** 장치 추가/삭제 가능 여부 */
  canManageDevices: boolean;
  /** 장치 제어 가능 여부 */
  canControlDevices: boolean;
  /** 현재 사용자의 권한 레벨 */
  userLevel: number;
  /** 관리자 여부 */
  isAdmin: boolean;
}

export function usePermission(): Permissions {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return {
      canManageGroups: false,
      canManageDevices: false,
      canControlDevices: false,
      userLevel: UserLevel.INACTIVE,
      isAdmin: false,
    };
  }

  const level = user.user_level;

  return {
    canManageGroups: level <= UserLevel.ADMIN,
    canManageDevices: level <= UserLevel.ADMIN,
    canControlDevices: level <= UserLevel.USER,
    userLevel: level,
    isAdmin: level <= UserLevel.ADMIN,
  };
}
