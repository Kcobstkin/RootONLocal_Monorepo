/**
 * BlindCard - 블라인드/커튼 제어 카드
 *
 * - 열기(Open) / 정지(Stop) / 닫기(Close) 3버튼
 * - 위치값 슬라이더 (0~100%)
 * - 커튼 타입 분기: roll, Rcurt, Lcurt, Tcurt (attribute 참조)
 *
 * ep SET: idx=0, type="0x62", val=0(열기)/1(닫기)/2(정지)/3~100(위치%)
 */

import React, { useState, useCallback } from 'react';
import type { DeviceRow } from '../types/device.types';
import type { LocalGateway } from '../services/LocalGateway';

interface BlindCardProps {
  device: DeviceRow;
  gateway: LocalGateway | null;
  deleteMode?: boolean;
  onDelete?: (device: DeviceRow) => void;
}

type BlindType = 'roll' | 'Rcurt' | 'Lcurt' | 'Tcurt' | 'unknown';

const BLIND_TYPE_LABELS: Record<BlindType, string> = {
  roll: '롤 블라인드',
  Rcurt: '오른쪽 커튼',
  Lcurt: '왼쪽 커튼',
  Tcurt: '양쪽 커튼',
  unknown: '블라인드',
};

function getBlindType(attribute: string | null): BlindType {
  if (!attribute) return 'unknown';
  try {
    const attr = JSON.parse(attribute);
    if (attr.type && ['roll', 'Rcurt', 'Lcurt', 'Tcurt'].includes(attr.type)) {
      return attr.type as BlindType;
    }
  } catch {
    // attribute가 단순 문자열일 수도 있음
    if (['roll', 'Rcurt', 'Lcurt', 'Tcurt'].includes(attribute)) {
      return attribute as BlindType;
    }
  }
  return 'unknown';
}

function parsePosition(lastStat: string | null): number {
  if (!lastStat) return 0;
  try {
    const s = JSON.parse(lastStat);
    return s.position ?? 0;
  } catch {
    return 0;
  }
}

export const BlindCard: React.FC<BlindCardProps> = ({
  device,
  gateway,
  deleteMode = false,
  onDelete,
}) => {
  const [position, setPosition] = useState(() => parsePosition(device.last_stat));
  const [isSending, setIsSending] = useState(false);
  const blindType = getBlindType(device.attribute);

  const sendCommand = useCallback(
    async (val: number) => {
      if (!gateway) return;
      setIsSending(true);
      try {
        await gateway.setDevice(device.me, {
          idx: 0,
          type: '0x62',
          val,
        });
        // 위치 명령인 경우 로컬 상태 업데이트
        if (val >= 3) {
          setPosition(val);
        }
      } catch (error) {
        console.error('[BlindCard] 명령 전송 실패:', error);
      } finally {
        setIsSending(false);
      }
    },
    [gateway, device.me],
  );

  const handleOpen = () => sendCommand(0);
  const handleClose = () => sendCommand(1);
  const handleStop = () => sendCommand(2);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setPosition(val);
  };

  const handleSliderRelease = () => {
    if (position >= 3) {
      sendCommand(position);
    }
  };

  return (
    <div className={`relative bg-white rounded-xl shadow hover:shadow-md transition-all p-4 border border-gray-100
      ${isSending ? 'opacity-70 pointer-events-none' : ''}`}
    >
      {/* 삭제 모드 */}
      {deleteMode && (
        <button
          onClick={() => onDelete?.(device)}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs
            flex items-center justify-center hover:bg-red-600 shadow z-10"
        >
          ✕
        </button>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs text-amber-600 font-medium">
            {BLIND_TYPE_LABELS[blindType]}
          </span>
          <h3 className="text-sm font-semibold text-gray-800 truncate">{device.name}</h3>
        </div>
      </div>

      {/* Open / Stop / Close 버튼 */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleOpen}
          className="flex-1 py-2 text-xs font-medium rounded-lg bg-amber-50 text-amber-700
            hover:bg-amber-100 transition-colors"
        >
          ▲ 열기
        </button>
        <button
          onClick={handleStop}
          className="flex-1 py-2 text-xs font-medium rounded-lg bg-gray-50 text-gray-700
            hover:bg-gray-100 transition-colors"
        >
          ■ 정지
        </button>
        <button
          onClick={handleClose}
          className="flex-1 py-2 text-xs font-medium rounded-lg bg-amber-50 text-amber-700
            hover:bg-amber-100 transition-colors"
        >
          ▼ 닫기
        </button>
      </div>

      {/* 위치 슬라이더 */}
      <div>
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>열림</span>
          <span>{position}%</span>
          <span>닫힘</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={handleSliderChange}
          onMouseUp={handleSliderRelease}
          onTouchEnd={handleSliderRelease}
          className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow"
        />
        {/* 위치 바 시각화 */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all"
            style={{ width: `${position}%` }}
          />
        </div>
      </div>
    </div>
  );
};
