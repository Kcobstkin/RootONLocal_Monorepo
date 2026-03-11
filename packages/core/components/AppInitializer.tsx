/**
 * AppInitializer - 앱 시작 시 플랫폼 초기화 컴포넌트
 *
 * 1. 플랫폼 감지 (Electron / Android)
 * 2. UDP Transport & SQLite Repository 등록
 * 3. DB 초기화
 * 4. AuthStore 초기화 + 세션 복원
 * 5. StationStore 초기화 + 자동 탐색
 */

import React, { useEffect, useState } from 'react';
import {
  detectPlatform,
  getUdpTransport,
  getSqliteRepository,
} from '../platform';
import { useAuthStore } from '../store/useAuthStore';
import { useStationStore } from '../store/useStationStore';

interface AppInitializerProps {
  children: React.ReactNode;
  /** 초기화 중 표시할 UI (선택) */
  fallback?: React.ReactNode;
}

/**
 * 앱 전체를 감싸는 초기화 컴포넌트.
 * 플랫폼 서비스가 준비될 때까지 children을 렌더링하지 않는다.
 */
export const AppInitializer: React.FC<AppInitializerProps> = ({
  children,
  fallback,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const initAuth = useAuthStore((s) => s.initAuth);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const initStationStore = useStationStore((s) => s.initStore);
  const loadStations = useStationStore((s) => s.loadStations);

  useEffect(() => {
    const init = async () => {
      try {
        const platform = detectPlatform();
        console.log(`[AppInitializer] Platform: ${platform}`);

        // 플랫폼 서비스 가져오기
        const db = getSqliteRepository();
        const transport = getUdpTransport();

        if (!db) {
          console.warn('[AppInitializer] SQLite Repository가 등록되지 않았습니다. 개발 모드로 실행합니다.');
          setIsReady(true);
          return;
        }

        // DB 초기화 (테이블 생성 + 시드)
        await db.initialize();
        console.log('[AppInitializer] DB initialized');

        // Auth 초기화 & 세션 복원
        initAuth(db);
        await restoreSession();
        console.log('[AppInitializer] Auth restored');

        // Station 스토어 초기화 & DB에서 로드
        initStationStore(db);
        await loadStations();
        console.log('[AppInitializer] Stations loaded');

        setIsReady(true);
      } catch (error) {
        console.error('[AppInitializer] Init failed:', error);
        setInitError(error instanceof Error ? error.message : '초기화 실패');
        setIsReady(true); // 에러가 있어도 로그인 화면은 보여줌
      }
    };

    init();
  }, [initAuth, restoreSession, initStationStore, loadStations]);

  if (!isReady) {
    return (
      <>
        {fallback ?? (
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
              <span className="text-sm text-gray-500">앱을 초기화하는 중...</span>
            </div>
          </div>
        )}
      </>
    );
  }

  if (initError) {
    console.warn(`[AppInitializer] 초기화 경고: ${initError}`);
  }

  return <>{children}</>;
};
