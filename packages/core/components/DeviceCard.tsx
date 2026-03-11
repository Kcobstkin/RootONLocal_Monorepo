/**
 * DeviceCard - devtype별 컴포넌트 분기 렌더링
 *
 * | devtype 패턴 | 컴포넌트 | 빠른 제어 |
 * |-------------|----------|----------|
 * | *IRAC*, *AC* | AcRemoteCard | 전원 토글 + 온도 표시 |
 * | *BLIND*, *CURT*, *P_SW* | BlindCard | 열기/정지/닫기 |
 * | *SPOT*, *LIGHT*, *RGBW* | LightCard | 전원 토글 + 밝기 |
 * | SL_NATURE (3구) | BlendSwitchCard | 채널 토글 |
 */

import React from 'react';
import type { DeviceRow, DeviceCategory } from '../types/device.types';
import { getDeviceCategory } from '../types/device.types';

interface DeviceCardProps {
  device: DeviceRow;
  /** 삭제 모드일 때 삭제 버튼 오버레이 표시 */
  deleteMode?: boolean;
  onDelete?: (device: DeviceRow) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  deleteMode = false,
  onDelete,
}) => {
  const category = getDeviceCategory(device.dev_type);
  const stat = device.last_stat ? JSON.parse(device.last_stat) : {};

  return (
    <div className="relative bg-white rounded-xl shadow hover:shadow-md transition-shadow p-4 border border-gray-100">
      {/* 삭제 모드 오버레이 */}
      {deleteMode && (
        <button
          onClick={() => onDelete?.(device)}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs
            flex items-center justify-center hover:bg-red-600 shadow z-10"
        >
          ✕
        </button>
      )}

      {/* 카테고리별 렌더링 */}
      {category === 'ac' && <AcCardPreview device={device} stat={stat} />}
      {category === 'blind' && <BlindCardPreview device={device} stat={stat} />}
      {category === 'light' && <LightCardPreview device={device} stat={stat} />}
      {category === 'switch3' && <SwitchCardPreview device={device} stat={stat} />}
      {category === 'unknown' && <UnknownCardPreview device={device} />}
    </div>
  );
};

/** 에어컨 미리보기 (Phase 7에서 전체 구현) */
const AcCardPreview: React.FC<{ device: DeviceRow; stat: Record<string, unknown> }> = ({
  device,
  stat,
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-blue-600 font-medium">에어컨</span>
      <span
        className={`w-2 h-2 rounded-full ${stat.power === 1 ? 'bg-green-400' : 'bg-gray-300'}`}
      />
    </div>
    <h3 className="text-sm font-semibold text-gray-800 truncate">{device.name}</h3>
    <div className="mt-2 text-xs text-gray-500">
      {stat.power === 1 ? (
        <span>{String(stat.temp ?? '--')}°C · {getModeLabel(stat.mode as number)}</span>
      ) : (
        <span>꺼짐</span>
      )}
    </div>
  </div>
);

/** 블라인드 미리보기 (Phase 8에서 전체 구현) */
const BlindCardPreview: React.FC<{ device: DeviceRow; stat: Record<string, unknown> }> = ({
  device,
  stat,
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-amber-600 font-medium">블라인드</span>
    </div>
    <h3 className="text-sm font-semibold text-gray-800 truncate">{device.name}</h3>
    <div className="mt-2">
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-amber-500 h-1.5 rounded-full"
          style={{ width: `${(stat.position as number) ?? 0}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 mt-1 block">
        {(stat.position as number) ?? 0}%
      </span>
    </div>
  </div>
);

/** 조명 미리보기 (Phase 9에서 전체 구현) */
const LightCardPreview: React.FC<{ device: DeviceRow; stat: Record<string, unknown> }> = ({
  device,
  stat,
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-yellow-600 font-medium">조명</span>
      <span
        className={`w-2 h-2 rounded-full ${stat.power === 1 ? 'bg-yellow-400' : 'bg-gray-300'}`}
      />
    </div>
    <h3 className="text-sm font-semibold text-gray-800 truncate">{device.name}</h3>
    <div className="mt-2 text-xs text-gray-500">
      {stat.power === 1 ? (
        <span>밝기 {(stat.brightness as number) ?? '--'}%</span>
      ) : (
        <span>꺼짐</span>
      )}
    </div>
  </div>
);

/** 3구 스위치 미리보기 (Phase 10에서 전체 구현) */
const SwitchCardPreview: React.FC<{ device: DeviceRow; stat: Record<string, unknown> }> = ({
  device,
  stat,
}) => {
  const channels = (stat.channels as number[]) ?? [0, 0, 0];
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-purple-600 font-medium">스위치 3구</span>
      </div>
      <h3 className="text-sm font-semibold text-gray-800 truncate">{device.name}</h3>
      <div className="flex gap-2 mt-2">
        {channels.map((ch, i) => (
          <span
            key={i}
            className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center
              ${ch === 1 ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-500'}`}
          >
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
};

/** 미지원 장치 */
const UnknownCardPreview: React.FC<{ device: DeviceRow }> = ({ device }) => (
  <div>
    <div className="mb-2">
      <span className="text-xs text-gray-400 font-medium">{device.dev_type}</span>
    </div>
    <h3 className="text-sm font-semibold text-gray-800 truncate">{device.name}</h3>
    <div className="mt-2 text-xs text-gray-400">제어 미지원</div>
  </div>
);

function getModeLabel(mode: number | undefined): string {
  switch (mode) {
    case 0: return '자동';
    case 1: return '냉방';
    case 2: return '제습';
    case 3: return '송풍';
    case 4: return '난방';
    default: return '--';
  }
}
