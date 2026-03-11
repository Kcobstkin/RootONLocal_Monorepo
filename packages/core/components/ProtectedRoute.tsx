/**
 * ProtectedRoute - 인증 가드 컴포넌트
 *
 * - 미인증 시 /login 으로 리다이렉트
 * - 권한 레벨 검사 (선택)
 * - 세션 복원 중 로딩 표시
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** 접근에 필요한 최소 권한 레벨 (낮을수록 높은 권한) */
  requiredLevel?: number;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredLevel,
}) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  // 세션 복원 중 로딩 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin h-8 w-8 text-blue-600"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm text-gray-500">인증 확인 중...</span>
        </div>
      </div>
    );
  }

  // 미인증 → 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 권한 레벨 검사
  if (requiredLevel !== undefined && user) {
    if (user.user_level > requiredLevel) {
      // 권한 부족 → 대시보드로 리다이렉트
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
