/**
 * AcRemoteCard - 에어컨 IR 리모컨 제어 카드
 *
 * - 전원 토글 (ON/OFF)
 * - 온도 ± 조절 (16~30°C)
 * - 모드 순환 (자동→냉방→제습→송풍→난방)
 * - 풍량 순환 (자동→약→중→강)
 *
 * ep SET: idx=232, type="0xCF", val=power/mode/temp/wind
 */

import React, { useState, useCallback } from 'react';
import type { DeviceRow } from '../types/device.types';
import type { LocalGateway } from '../services/LocalGateway';

interface AcRemoteCardProps {
  device: DeviceRow;
  gateway: LocalGateway | null;
  /** 삭제 모드 */
  deleteMode?: boolean;
  onDelete?: (device: DeviceRow) => void;
}

interface AcState {
  power: number;
  mode: number;
  temp: number;
  wind: number;
}

const MODE_LABELS = ['자동', '냉방', '제습', '송풍', '난방'] as const;
const MODE_ICONS = ['⟳', '❄', '💧', '🌀', '🔥'] as const;
const WIND_LABELS = ['자동', '약', '중', '강'] as const;

const MIN_TEMP = 16;
const MAX_TEMP = 30;

function parseAcState(lastStat: string | null): AcState {
  if (!lastStat) return { power: 0, mode: 0, temp: 24, wind: 0 };
  try {
    const s = JSON.parse(lastStat);
    return {
      power: s.power ?? 0,
      mode: s.mode ?? 0,
      temp: s.temp ?? 24,
      wind: s.wind ?? 0,
    };
  } catch {
    return { power: 0, mode: 0, temp: 24, wind: 0 };
  }
}

export const AcRemoteCard: React.FC<AcRemoteCardProps> = ({
  device,
  gateway,
  deleteMode = false,
  onDelete,
}) => {
  const [state, setState] = useState<AcState>(() => parseAcState(device.last_stat));
  const [isSending, setIsSending] = useState(false);

  const sendCommand = useCallback(
    async (newState: AcState) => {
      if (!gateway) return;
      setIsSending(true);
      try {
        await gateway.setDevice(device.me, {
          idx: 232,
          type: '0xCF',
          val: newState.power,
          mode: newState.mode,
          temp: newState.temp,
          wind: newState.wind,
        });
        setState(newState);
      } catch (error) {
        console.error('[AcRemoteCard] 명령 전송 실패:', error);
      } finally {
        setIsSending(false);
      }
    },
    [gateway, device.me],
  );

  const togglePower = () => {
    sendCommand({ ...state, power: state.power === 1 ? 0 : 1 });
  };

  const cycleMode = () => {
    sendCommand({ ...state, mode: (state.mode + 1) % 5 });
  };

  const cycleWind = () => {
    sendCommand({ ...state, wind: (state.wind + 1) % 4 });
  };

  const adjustTemp = (delta: number) => {
    const newTemp = Math.max(MIN_TEMP, Math.min(MAX_TEMP, state.temp + delta));
    if (newTemp !== state.temp) {
      sendCommand({ ...state, temp: newTemp });
    }
  };

  const isOn = state.power === 1;

  return (
    <div className={`relative bg-white rounded-xl shadow hover:shadow-md transition-all p-4 border
      ${isOn ? 'border-blue-200' : 'border-gray-100'}
      ${isSending ? 'opacity-70 pointer-events-none' : ''}`}
    >
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

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-600 font-medium">에어컨</span>
          <span className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">
            {device.name}
          </span>
        </div>
        {/* 전원 버튼 */}
        <button
          onClick={togglePower}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
            ${isOn
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
        >
          ⏻
        </button>
      </div>

      {/* 온도 표시 & 제어 */}
      <div className="flex items-center justify-center gap-3 my-4">
        <button
          onClick={() => adjustTemp(-1)}
          disabled={!isOn}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200
            disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
        >
          −
        </button>
        <div className="text-center">
          <span className={`text-3xl font-bold ${isOn ? 'text-blue-600' : 'text-gray-300'}`}>
            {state.temp}
          </span>
          <span className={`text-sm ${isOn ? 'text-blue-400' : 'text-gray-300'}`}>°C</span>
        </div>
        <button
          onClick={() => adjustTemp(1)}
          disabled={!isOn}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200
            disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
        >
          +
        </button>
      </div>

      {/* 모드 & 풍량 */}
      <div className="flex justify-between mt-2">
        <button
          onClick={cycleMode}
          disabled={!isOn}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-50
            hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span>{MODE_ICONS[state.mode]}</span>
          <span className="text-gray-600">{MODE_LABELS[state.mode]}</span>
        </button>
        <button
          onClick={cycleWind}
          disabled={!isOn}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-50
            hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span>🌬</span>
          <span className="text-gray-600">{WIND_LABELS[state.wind]}</span>
        </button>
      </div>

      {/* 상태 표시줄 */}
      <div className={`mt-3 text-center text-[10px] ${isOn ? 'text-blue-400' : 'text-gray-300'}`}>
        {isOn ? `${MODE_LABELS[state.mode]} · ${state.temp}°C · 풍량 ${WIND_LABELS[state.wind]}` : '꺼짐'}
      </div>
    </div>
  );
};
