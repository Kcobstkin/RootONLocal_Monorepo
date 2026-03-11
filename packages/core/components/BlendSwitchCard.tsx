/**
 * BlendSwitchCard - 3구 스위치 제어 카드
 *
 * - 채널 1/2/3 개별 ON/OFF 토글 버튼
 * - ep GET으로 채널별 상태 파싱 (idx=0,1,2)
 *
 * ep SET: idx=0/1/2, type="0x01", val=0|1
 */

import React, { useState, useCallback } from 'react';
import type { DeviceRow } from '../types/device.types';
import type { LocalGateway } from '../services/LocalGateway';

interface BlendSwitchCardProps {
  device: DeviceRow;
  gateway: LocalGateway | null;
  deleteMode?: boolean;
  onDelete?: (device: DeviceRow) => void;
}

function parseChannels(lastStat: string | null): [number, number, number] {
  if (!lastStat) return [0, 0, 0];
  try {
    const s = JSON.parse(lastStat);
    if (Array.isArray(s.channels) && s.channels.length >= 3) {
      return [s.channels[0] ?? 0, s.channels[1] ?? 0, s.channels[2] ?? 0];
    }
    // 또는 ch1/ch2/ch3 키 형태
    return [s.ch1 ?? s.P1 ?? 0, s.ch2 ?? s.P2 ?? 0, s.ch3 ?? s.P3 ?? 0];
  } catch {
    return [0, 0, 0];
  }
}

const CHANNEL_LABELS = ['채널 1', '채널 2', '채널 3'] as const;

export const BlendSwitchCard: React.FC<BlendSwitchCardProps> = ({
  device,
  gateway,
  deleteMode = false,
  onDelete,
}) => {
  const [channels, setChannels] = useState<[number, number, number]>(() =>
    parseChannels(device.last_stat),
  );
  const [sendingIdx, setSendingIdx] = useState<number | null>(null);

  const toggleChannel = useCallback(
    async (idx: number) => {
      if (!gateway) return;
      const newVal = channels[idx] === 1 ? 0 : 1;
      setSendingIdx(idx);
      try {
        await gateway.setDevice(device.me, {
          idx,
          type: '0x01',
          val: newVal,
        });
        setChannels((prev) => {
          const next = [...prev] as [number, number, number];
          next[idx] = newVal;
          return next;
        });
      } catch (error) {
        console.error('[BlendSwitchCard] 명령 전송 실패:', error);
      } finally {
        setSendingIdx(null);
      }
    },
    [gateway, device.me, channels],
  );

  const anyOn = channels.some((c) => c === 1);

  return (
    <div className={`relative bg-white rounded-xl shadow hover:shadow-md transition-all p-4 border
      ${anyOn ? 'border-purple-200' : 'border-gray-100'}`}
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
          <span className="text-xs text-purple-600 font-medium">스위치 3구</span>
          <h3 className="text-sm font-semibold text-gray-800 truncate">{device.name}</h3>
        </div>
      </div>

      {/* 3개 채널 토글 버튼 */}
      <div className="flex gap-2">
        {channels.map((val, idx) => {
          const isOn = val === 1;
          const isBusy = sendingIdx === idx;

          return (
            <button
              key={idx}
              onClick={() => toggleChannel(idx)}
              disabled={isBusy}
              className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all
                ${isBusy ? 'opacity-50 pointer-events-none' : ''}
                ${isOn
                  ? 'bg-purple-500 text-white shadow-sm hover:bg-purple-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              <div className="text-center">
                <div className={`w-3 h-3 rounded-full mx-auto mb-1
                  ${isOn ? 'bg-white' : 'bg-gray-300'}`}
                />
                <span className="text-[10px]">{CHANNEL_LABELS[idx]}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 상태 표시줄 */}
      <div className="mt-3 flex justify-center gap-1.5">
        {channels.map((val, idx) => (
          <span
            key={idx}
            className={`w-2 h-2 rounded-full ${val === 1 ? 'bg-purple-500' : 'bg-gray-300'}`}
          />
        ))}
      </div>
    </div>
  );
};
