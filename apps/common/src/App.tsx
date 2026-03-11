import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  LoginScreen,
  ProtectedRoute,
  AppInitializer,
  AppLayout,
  DashboardScreen,
  GroupScreen,
  GroupSettingsScreen,
} from '@localcontrol/core';
import { APP_CONFIG } from './config/appConfig';

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
                themeColor="bg-blue-600"
              />
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout
                  appName={APP_CONFIG.brand.appName}
                  themeColor="bg-blue-600"
                />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardScreen />} />
            <Route path="controls/:groupId" element={<GroupScreen />} />
            <Route
              path="settings/groups"
              element={
                <ProtectedRoute requiredLevel={5}>
                  <GroupSettingsScreen />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppInitializer>
  );
}

export default App;
