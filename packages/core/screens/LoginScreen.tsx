/**
 * LoginScreen - 로컬 SQLite 인증 로그인 화면
 *
 * - 아이디 + 비밀번호 입력
 * - 자동 로그인 체크박스 (localStorage)
 * - SHA-256 해시 비교 → 인증 성공 시 대시보드로 이동
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface LoginScreenProps {
  /** 앱 로고 이미지 경로 (선택) */
  logoSrc?: string;
  /** 앱 이름 */
  appName?: string;
  /** 테마 컬러 클래스 (예: 'bg-blue-600', 'bg-green-600') */
  themeColor?: string;
}

const AUTO_LOGIN_KEY = 'localcontrol_auto_login';
const SAVED_LOGIN_ID_KEY = 'localcontrol_saved_login_id';

export const LoginScreen: React.FC<LoginScreenProps> = ({
  logoSrc,
  appName = 'Local Control',
  themeColor = 'bg-blue-600',
}) => {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, clearError } = useAuthStore();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [autoLogin, setAutoLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 자동 로그인 상태 복원
  useEffect(() => {
    const savedAutoLogin = localStorage.getItem(AUTO_LOGIN_KEY) === 'true';
    const savedLoginId = localStorage.getItem(SAVED_LOGIN_ID_KEY);
    if (savedAutoLogin && savedLoginId) {
      setAutoLogin(true);
      setLoginId(savedLoginId);
    }
  }, []);

  // 이미 인증된 경우 대시보드로 이동
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!loginId.trim() || !password.trim()) {
      return;
    }

    const result = await login(loginId.trim(), password);

    if (result.success) {
      // 자동 로그인 설정 저장
      if (autoLogin) {
        localStorage.setItem(AUTO_LOGIN_KEY, 'true');
        localStorage.setItem(SAVED_LOGIN_ID_KEY, loginId.trim());
      } else {
        localStorage.removeItem(AUTO_LOGIN_KEY);
        localStorage.removeItem(SAVED_LOGIN_ID_KEY);
      }
      navigate('/', { replace: true });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm">
        {/* 로고 & 앱 이름 */}
        <div className="text-center mb-8">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={appName}
              className="mx-auto h-16 w-16 mb-4"
            />
          ) : (
            <div
              className={`mx-auto h-16 w-16 rounded-xl ${themeColor} flex items-center justify-center mb-4`}
            >
              <span className="text-white text-2xl font-bold">
                {appName.charAt(0)}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-800">{appName}</h1>
          <p className="text-sm text-gray-500 mt-1">로컬 장치 제어 시스템</p>
        </div>

        {/* 로그인 폼 */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg p-6 space-y-5"
        >
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* 아이디 */}
          <div>
            <label
              htmlFor="loginId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              아이디
            </label>
            <input
              id="loginId"
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="admin@local"
              autoComplete="username"
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              비밀번호
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  text-gray-900 placeholder-gray-400 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                {showPassword ? '숨기기' : '보기'}
              </button>
            </div>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={isLoading || !loginId.trim() || !password.trim()}
            className={`w-full py-2.5 rounded-lg text-white font-semibold
              ${themeColor} hover:opacity-90 transition-opacity
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
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
                로그인 중...
              </span>
            ) : (
              '로그인'
            )}
          </button>

          {/* 자동 로그인 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoLogin}
              onChange={(e) => setAutoLogin(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">자동 로그인</span>
          </label>
        </form>

        {/* 하단 안내 */}
        <p className="text-center text-xs text-gray-400 mt-6">
          계정은 관리자에게 문의하세요
        </p>
      </div>
    </div>
  );
};
