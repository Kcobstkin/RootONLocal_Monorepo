/**
 * LightCard - 조명 제어 카드
 *
 * - 전원 토글 (ON/OFF)
 * - 밝기 슬라이더 (1~100%)
 * - 색온도 슬라이더 (2700~6500K) - 지원 장치만
 *
 * ep SET: idx=0, type="0x01", val=power/brightness/colortemp
 */

import React, { useState, useCallback } from 'react';
import type { DeviceRow } from '../types/device.types';
import type { LocalGateway } from '../services/LocalGateway';

interface LightCardProps {
  device: DeviceRow;
  gateway: LocalGateway | null;
  deleteMode?: boolean;
  onDelete?: (device: DeviceRow) => void;
}

interface LightState {
  power: number;
  brightness: number;
  colortemp: number;
}

function supportsColorTemp(devType: string): boolean {
  const upper = devType.toUpperCase();
  return upper.includes('RGBW') || upper.includes('COLOR') || upper.includes('CT');
}

function parseLightState(lastStat: string | null): LightState {
  if (!lastStat) return { power: 0, brightness: 100, colortemp: 4000 };
  try {
    const s = JSON.parse(lastStat);
    return {
      power: s.power ?? 0,
      brightness: s.brightness ?? 100,
      colortemp: s.colortemp ?? 4000,
    };
  } catch {
    return { power: 0, brightness: 100, colortemp: 4000 };
  }
}

export const LightCard: React.FC<LightCardProps> = ({
  device,
  gateway,
  deleteMode = false,
  onDelete,
}) => {
  const [state, setState] = useState<LightState>(() => parseLightState(device.last_stat));
  const [isSending, setIsSending] = useState(false);
  const hasColorTemp = supportsColorTemp(device.dev_type);

  const sendCommand = useCallback(
    async (args: Record<string, unknown>) => {
      if (!gateway) return;
      setIsSending(true);
      try {
        await gateway.setDevice(device.me, {
          idx: 0,
          type: '0x01',
          ...args,
        });
      } catch (error) {
        console.error('[LightCard] 명령 전송 실패:', error);
      } finally {
        setIsSending(false);
      }
    },
    [gateway, device.me],
  );

  const togglePower = () => {
    const newPower = state.power === 1 ? 0 : 1;
    setState((s) => ({ ...s, power: newPower }));
    sendCommand({ val: newPower });
  };

  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const brightness = Number(e.target.value);
    setState((s) => ({ ...s, brightness }));
  };

  const handleBrightnessRelease = () => {
    sendCommand({ val: 1, brightness: state.brightness });
  };

  const handleColorTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const colortemp = Number(e.target.value);
    setState((s) => ({ ...s, colortemp }));
  };

  const handleColorTempRelease = () => {
    sendCommand({ val: 1, colortemp: state.colortemp });
  };

  const isOn = state.power === 1;

  return (
    <div className={`relative bg-white rounded-xl shadow hover:shadow-md transition-all p-4 border
      ${isOn ? 'border-yellow-200' : 'border-gray-100'}
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-yellow-600 font-medium">조명</span>
          <span className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">
            {device.name}
          </span>
        </div>
        {/* 전원 버튼 */}
        <button
          onClick={togglePower}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
            ${isOn
              ? 'bg-yellow-400 text-white hover:bg-yellow-500'
              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
        >
          💡
        </button>
      </div>

      {/* 밝기 슬라이더 */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>밝기</span>
          <span className={isOn ? 'text-yellow-600 font-medium' : ''}>
            {state.brightness}%
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={state.brightness}
          onChange={handleBrightnessChange}
          onMouseUp={handleBrightnessRelease}
          onTouchEnd={handleBrightnessRelease}
          disabled={!isOn}
          className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer
            disabled:opacity-30 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-yellow-500 [&::-webkit-slider-thumb]:shadow"
        />
      </div>

      {/* 색온도 슬라이더 (지원 장치만) */}
      {hasColorTemp && (
        <div>
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>색온도</span>
            <span className={isOn ? 'text-orange-500 font-medium' : ''}>
              {state.colortemp}K
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={2700}
              max={6500}
              value={state.colortemp}
              onChange={handleColorTempChange}
              onMouseUp={handleColorTempRelease}
              onTouchEnd={handleColorTempRelease}
              disabled={!isOn}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                disabled:opacity-30 disabled:cursor-not-allowed
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:shadow"
              style={{
                background: `linear-gradient(to right, #FF8C00, #FFF5E1, #E0E8FF)`,
              }}
            />
            <div className="flex justify-between text-[9px] text-gray-300 mt-0.5">
              <span>따뜻한</span>
              <span>시원한</span>
            </div>
          </div>
        </div>
      )}

      {/* 상태 표시줄 */}
      <div className={`mt-3 text-center text-[10px] ${isOn ? 'text-yellow-500' : 'text-gray-300'}`}>
        {isOn
          ? `밝기 ${state.brightness}%${hasColorTemp ? ` · ${state.colortemp}K` : ''}`
          : '꺼짐'}
      </div>
    </div>
  );
};
