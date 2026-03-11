/**
 * DashboardScreen - 사용자별 장치 대시보드
 *
 * 사용자가 직접 추가한 장치만 표시 (dashboard_devices)
 * Phase 6에서 실제 장치 카드를 구현
 */

import React from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const DashboardScreen: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">대시보드</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {user?.name}님의 장치
          </p>
        </div>
        {/* Phase 6에서 장치 추가/삭제 버튼 구현 */}
      </div>

      {/* 장치 카드 그리드 (Phase 6) */}
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">
        장치 카드가 여기에 표시됩니다 (Phase 6에서 구현 예정)
        <br />
        <span className="text-xs">[장치 추가] 버튼으로 장치를 등록하세요</span>
      </div>
    </div>
  );
};
