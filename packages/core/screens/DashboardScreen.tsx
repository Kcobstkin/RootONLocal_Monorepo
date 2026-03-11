/**
 * DashboardScreen - 사용자별 장치 대시보드
 *
 * - dashboard_devices 테이블 기준 장치 표시
 * - 반응형 3열 카드 그리드 (모바일 2열)
 * - [장치 추가] / [장치 삭제] 버튼 (관리자 권한 user_level ≤ 5)
 * - 장치 삭제: 토글 모드 → 카드 삭제 버튼 오버레이
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useDeviceStore } from '../store/useDeviceStore';
import { usePermission } from '../hooks/usePermission';
import { DeviceCard } from '../components/DeviceCard';
import { AddDeviceModal } from '../modals/AddDeviceModal';
import type { DeviceRow } from '../types/device.types';

export const DashboardScreen: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const { canManageDevices } = usePermission();
  const getDashboardDevices = useDeviceStore((s) => s.getDashboardDevices);
  const removeDeviceFromDashboard = useDeviceStore((s) => s.removeDeviceFromDashboard);

  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    const list = await getDashboardDevices(user.id);
    setDevices(list);
  }, [user, getDashboardDevices]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleDeleteDevice = async (device: DeviceRow) => {
    if (!user) return;
    if (!device.id) return;
    await removeDeviceFromDashboard(user.id, device.id);
    await loadDashboard();
  };

  const existingDeviceIds = devices.map((d) => d.id ?? 0);

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

        {/* 관리자 버튼 */}
        {canManageDevices && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDeleteMode(false);
                setShowAddModal(true);
              }}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg
                hover:bg-blue-700 transition-colors"
            >
              + 장치 추가
            </button>
            <button
              onClick={() => setDeleteMode((prev) => !prev)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors
                ${deleteMode
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              {deleteMode ? '삭제 완료' : '- 삭제'}
            </button>
          </div>
        )}
      </div>

      {/* 장치 카드 그리드 */}
      {devices.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">
          등록된 장치가 없습니다
          <br />
          <span className="text-xs">[장치 추가] 버튼으로 장치를 등록하세요</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {devices.map((device) => (
            <DeviceCard
              key={device.id ?? device.me}
              device={device}
              deleteMode={deleteMode}
              onDelete={handleDeleteDevice}
            />
          ))}
        </div>
      )}

      {/* AddDeviceModal */}
      {user && (
        <AddDeviceModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          targetType="dashboard"
          targetId={user.id}
          existingDeviceIds={existingDeviceIds}
          onAdded={loadDashboard}
        />
      )}
    </div>
  );
};
