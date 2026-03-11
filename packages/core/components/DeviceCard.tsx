/**
 * DeviceCard - devtype별 컴포넌트 분기 렌더링
 *
 * | devtype 패턴 | 컴포넌트 | 빠른 제어 |
 * |-------------|----------|----------|
 * | *IRAC*, *AC* | AcRemoteCard | 전원 토글 + 온도 ± + 모드/풍량 순환 |
 * | *BLIND*, *CURT*, *P_SW* | BlindCard | 열기/정지/닫기 + 위치 슬라이더 |
 * | *SPOT*, *LIGHT*, *RGBW* | LightCard | 전원 토글 + 밝기 + 색온도 |
 * | SL_NATURE (3구) | BlendSwitchCard | 채널 1/2/3 토글 |
 */

import React from 'react';
import type { DeviceRow } from '../types/device.types';
import { getDeviceCategory } from '../types/device.types';
import type { LocalGateway } from '../services/LocalGateway';
import { AcRemoteCard } from './AcRemoteCard';
import { BlindCard } from './BlindCard';
import { LightCard } from './LightCard';
import { BlendSwitchCard } from './BlendSwitchCard';

interface DeviceCardProps {
  device: DeviceRow;
  /** LocalGateway 인스턴스 (장치 제어용) */
  gateway?: LocalGateway | null;
  /** 삭제 모드일 때 삭제 버튼 오버레이 표시 */
  deleteMode?: boolean;
  onDelete?: (device: DeviceRow) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  gateway = null,
  deleteMode = false,
  onDelete,
}) => {
  const category = getDeviceCategory(device.dev_type);

  switch (category) {
    case 'ac':
      return (
        <AcRemoteCard
          device={device}
          gateway={gateway}
          deleteMode={deleteMode}
          onDelete={onDelete}
        />
      );
    case 'blind':
      return (
        <BlindCard
          device={device}
          gateway={gateway}
          deleteMode={deleteMode}
          onDelete={onDelete}
        />
      );
    case 'light':
      return (
        <LightCard
          device={device}
          gateway={gateway}
          deleteMode={deleteMode}
          onDelete={onDelete}
        />
      );
    case 'switch3':
      return (
        <BlendSwitchCard
          device={device}
          gateway={gateway}
          deleteMode={deleteMode}
          onDelete={onDelete}
        />
      );
    default:
      return (
        <UnknownCard
          device={device}
          deleteMode={deleteMode}
          onDelete={onDelete}
        />
      );
  }
};

/** 미지원 장치 카드 */
const UnknownCard: React.FC<{
  device: DeviceRow;
  deleteMode?: boolean;
  onDelete?: (device: DeviceRow) => void;
}> = ({ device, deleteMode, onDelete }) => (
  <div className="relative bg-white rounded-xl shadow hover:shadow-md transition-shadow p-4 border border-gray-100">
    {deleteMode && (
      <button
        onClick={() => onDelete?.(device)}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs
          flex items-center justify-center hover:bg-red-600 shadow z-10"
      >
        ✕
      </button>
    )}
    <div className="mb-2">
      <span className="text-xs text-gray-400 font-medium">{device.dev_type}</span>
    </div>
    <h3 className="text-sm font-semibold text-gray-800 truncate">{device.name}</h3>
    <div className="mt-2 text-xs text-gray-400">제어 미지원</div>
  </div>
);
