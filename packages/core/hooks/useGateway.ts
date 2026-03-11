/**
 * useGateway - LocalGateway 인스턴스 관리 훅
 *
 * - activeStation이 변경되면 새 Gateway 인스턴스 생성
 * - appConfig에서 model/token을 주입
 * - Station IP는 DB (useStationStore)에서 조회
 */

import { useMemo } from 'react';
import { LocalGateway } from '../services/LocalGateway';
import type { StationConfig } from '../services/LocalGateway';
import { useStationStore } from '../store/useStationStore';
import type { IUdpTransport } from '../services/IUdpTransport';

interface UseGatewayOptions {
  transport: IUdpTransport | null;
  model: string;
  token: string;
}

export function useGateway({ transport, model, token }: UseGatewayOptions) {
  const activeStation = useStationStore((s) => s.activeStation);

  const gateway = useMemo(() => {
    if (!transport || !activeStation) return null;

    const config: StationConfig = {
      ip: activeStation.ip,
      port: activeStation.port,
      model,
      token,
    };

    return new LocalGateway(transport, config);
  }, [transport, activeStation, model, token]);

  return {
    gateway,
    isReady: gateway !== null,
    stationIp: activeStation?.ip ?? null,
    stationName: activeStation?.name ?? null,
  };
}
