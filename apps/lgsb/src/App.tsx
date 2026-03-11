import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  LoginScreen,
  ProtectedRoute,
  AppInitializer,
  useAuthStore,
  useStationStore,
} from '@localcontrol/core';
import { APP_CONFIG } from './config/appConfig';

/** 임시 대시보드 (Phase 6에서 실제 구현) */
function DashboardPlaceholder() {
  const { user, logout } = useAuthStore();
  const { stations, activeStation } = useStationStore();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto space-y-4">
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

        {/* Station 정보 */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Station 상태</h2>
          {activeStation ? (
            <p className="text-sm text-green-600">
              ● {activeStation.name ?? activeStation.lsid} ({activeStation.ip}:{activeStation.port})
            </p>
          ) : (
            <p className="text-sm text-gray-400">Station이 연결되지 않았습니다</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            발견된 Station: {stations.length}개
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppInitializer>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <LoginScreen
                appName={APP_CONFIG.brand.appName}
                themeColor="bg-green-600"
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
    </AppInitializer>
  );
}

export default App;
