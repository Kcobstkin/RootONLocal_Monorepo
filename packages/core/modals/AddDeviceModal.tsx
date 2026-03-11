/**
 * AddDeviceModal - Station 장치 목록에서 선택하여 추가
 *
 * targetType: 'dashboard' → dashboard_devices INSERT
 * targetType: 'group'     → group_devices INSERT
 *
 * - Station 전체 장치 목록(allDevices) 표시
 * - 이미 추가된 장치는 체크 비활성화
 * - 이름/devtype 검색 필터
 * - 다중 선택 후 일괄 추가
 */

import React, { useState, useMemo } from 'react';
import type { DeviceRow } from '../types/device.types';
import { getDeviceCategory } from '../types/device.types';
import { useDeviceStore } from '../store/useDeviceStore';

export interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 추가 대상 구분 */
  targetType: 'dashboard' | 'group';
  /** targetType === 'dashboard' 일 때 userId */
  targetId: number;
  /** 이미 추가된 장치 device_id 목록 */
  existingDeviceIds: number[];
  /** 추가 완료 후 콜백 */
  onAdded: () => void;
}

const categoryLabel: Record<string, string> = {
  ac: '에어컨',
  blind: '블라인드',
  light: '조명',
  switch3: '스위치 3구',
  unknown: '기타',
};

const categoryColor: Record<string, string> = {
  ac: 'text-blue-600 bg-blue-50',
  blind: 'text-amber-600 bg-amber-50',
  light: 'text-yellow-600 bg-yellow-50',
  switch3: 'text-purple-600 bg-purple-50',
  unknown: 'text-gray-500 bg-gray-50',
};

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  existingDeviceIds,
  onAdded,
}) => {
  const allDevices = useDeviceStore((s) => s.allDevices);
  const addDeviceToDashboard = useDeviceStore((s) => s.addDeviceToDashboard);
  const addDeviceToGroup = useDeviceStore((s) => s.addDeviceToGroup);

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // 검색 필터 적용
  const filteredDevices = useMemo(() => {
    if (!search.trim()) return allDevices;
    const term = search.toLowerCase();
    return allDevices.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        d.dev_type.toLowerCase().includes(term),
    );
  }, [allDevices, search]);

  const toggleDevice = (deviceId: number | undefined) => {
    if (!deviceId || existingDeviceIds.includes(deviceId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setIsAdding(true);

    try {
      for (const deviceId of selectedIds) {
        if (targetType === 'dashboard') {
          await addDeviceToDashboard(targetId, deviceId);
        } else {
          await addDeviceToGroup(targetId, deviceId);
        }
      }
      setSelectedIds(new Set());
      setSearch('');
      onAdded();
      onClose();
    } catch (error) {
      console.error('[AddDeviceModal] 장치 추가 실패:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearch('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            장치 추가
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {targetType === 'dashboard' ? '대시보드' : '구역'}에 장치를 추가합니다
          </p>
        </div>

        {/* 검색 */}
        <div className="px-5 py-3 border-b border-gray-50">
          <input
            type="text"
            placeholder="이름 또는 장치 유형으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
              focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
          />
        </div>

        {/* 장치 목록 */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {filteredDevices.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {allDevices.length === 0
                ? 'Station에서 발견된 장치가 없습니다'
                : '검색 결과가 없습니다'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filteredDevices.map((device) => {
                const devId = device.id ?? 0;
                const isExisting = existingDeviceIds.includes(devId);
                const isChecked = selectedIds.has(devId);
                const cat = getDeviceCategory(device.dev_type);

                return (
                  <li
                    key={devId}
                    onClick={() => toggleDevice(device.id)}
                    className={`flex items-center gap-3 py-3 px-2 rounded-lg cursor-pointer
                      ${isExisting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
                      ${isChecked && !isExisting ? 'bg-blue-50' : ''}`}
                  >
                    {/* 체크박스 */}
                    <input
                      type="checkbox"
                      checked={isChecked || isExisting}
                      disabled={isExisting}
                      readOnly
                      className="w-4 h-4 text-blue-600 rounded border-gray-300
                        disabled:opacity-50"
                    />
                    {/* 장치 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {device.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {device.me} · {device.dev_type}
                      </div>
                    </div>
                    {/* 카테고리 뱃지 */}
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryColor[cat]}`}
                    >
                      {categoryLabel[cat]}
                    </span>
                    {/* 이미 추가 표시 */}
                    {isExisting && (
                      <span className="text-[10px] text-gray-400">추가됨</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            취소
          </button>
          <button
            onClick={handleAdd}
            disabled={selectedIds.size === 0 || isAdding}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding
              ? '추가 중...'
              : `선택 항목 추가 (${selectedIds.size}개)`}
          </button>
        </div>
      </div>
    </div>
  );
};
