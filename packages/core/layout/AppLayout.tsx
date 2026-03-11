/**
 * AppLayout - 전체 레이아웃 (Sidebar + 콘텐츠 영역)
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  appName?: string;
  themeColor?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  appName,
  themeColor,
}) => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar appName={appName} themeColor={themeColor} />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
