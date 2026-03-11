/**
 * GroupScreen - 구역별 장치 제어 화면
 *
 * - group_devices 테이블 기준 장치 표시
 * - 반응형 3열 카드 그리드 (모바일 2열)
 * - [장치 추가] / [장치 삭제] 버튼 (관리자 권한 user_level ≤ 5)
 * - 장치 삭제: 토글 모드 → 카드 삭제 버튼 오버레이 (group_devices DELETE, devices 원본 유지)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useGroupStore } from '../store/useGroupStore';
import { useDeviceStore } from '../store/useDeviceStore';
import { usePermission } from '../hooks/usePermission';
import { DeviceCard } from '../components/DeviceCard';
import { AddDeviceModal } from '../modals/AddDeviceModal';
import type { DeviceRow } from '../types/device.types';

export const GroupScreen: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { groups } = useGroupStore();
  const { canManageDevices } = usePermission();
  const getGroupDevices = useDeviceStore((s) => s.getGroupDevices);
  const removeDeviceFromGroup = useDeviceStore((s) => s.removeDeviceFromGroup);

  const numericGroupId = Number(groupId);
  const group = groups.find((g) => g.group_id === numericGroupId);

  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadGroupDevices = useCallback(async () => {
    if (!numericGroupId) return;
    const list = await getGroupDevices(numericGroupId);
    setDevices(list);
  }, [numericGroupId, getGroupDevices]);

  useEffect(() => {
    loadGroupDevices();
    // 구역 변경 시 삭제 모드 해제
    setDeleteMode(false);
  }, [loadGroupDevices]);

  const handleDeleteDevice = async (device: DeviceRow) => {
    if (!device.id) return;
    await removeDeviceFromGroup(numericGroupId, device.id);
    await loadGroupDevices();
  };

  const existingDeviceIds = devices.map((d) => d.id ?? 0);

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {group?.groupname ?? '구역'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">구역별 장치 제어</p>
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
      <AddDeviceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        targetType="group"
        targetId={numericGroupId}
        existingDeviceIds={existingDeviceIds}
        onAdded={loadGroupDevices}
      />
    </div>
  );
};
