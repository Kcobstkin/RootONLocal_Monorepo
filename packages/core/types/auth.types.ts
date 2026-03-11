/** 인증 관련 타입 정의 */

export interface UserRow {
  id: number;
  login_id: string;
  password: string;
  name: string;
  user_level: number;
  permissions: string | null;  // JSON string
  created_at?: string;
  updated_at?: string;
}

export interface AuthResult {
  success: boolean;
  user?: Omit<UserRow, 'password'>;
  error?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: Omit<UserRow, 'password'> | null;
  login: (loginId: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

/** 권한 레벨 상수 */
export const UserLevel = {
  SUPER_ADMIN: 1,
  ADMIN: 5,
  USER: 10,
  INACTIVE: 99,
} as const;

/** 관리자 여부 확인 */
export function isAdmin(userLevel: number): boolean {
  return userLevel <= UserLevel.ADMIN;
}
