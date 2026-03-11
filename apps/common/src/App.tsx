import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import {
  LoginScreen,
  ProtectedRoute,
  useAuthStore,
} from '@localcontrol/core';
import { APP_CONFIG } from './config/appConfig';

/** 임시 대시보드 (Phase 6에서 실제 구현) */
function DashboardPlaceholder() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {APP_CONFIG.brand.appName}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.name} (Lv.{user?.user_level})
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
          <p className="text-gray-500">
            대시보드가 여기에 표시됩니다 (Phase 6에서 구현 예정)
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { restoreSession, initAuth } = useAuthStore();

  useEffect(() => {
    // 앱 시작 시 플랫폼 초기화 및 세션 복원
    const init = async () => {
      // TODO: Phase 4에서 실제 DB 연결 후 initAuth 호출
      // 현재는 Electron preload.ts를 통해 IPC로 DB에 접근
      // initAuth(sqliteRepository);
      await restoreSession();
    };
    init();
  }, [restoreSession, initAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <LoginScreen
              appName={APP_CONFIG.brand.appName}
              themeColor="bg-blue-600"
            />
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardPlaceholder />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
