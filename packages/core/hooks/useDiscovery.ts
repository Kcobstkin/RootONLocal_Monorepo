/**
 * useDiscovery - Smart Station 탐색 훅
 *
 * - Z-SEARCH 브로드캐스트 → Station 발견 → DB upsert
 * - 앱 시작 시 자동 탐색
 * - 수동 재탐색 지원
 */

import { useCallback, useEffect, useRef } from 'react';
import { DiscoveryService } from '../services/DiscoveryService';
import { useStationStore } from '../store/useStationStore';
import type { IUdpTransport } from '../services/IUdpTransport';

interface UseDiscoveryOptions {
  /** UDP 전송 객체 */
  transport: IUdpTransport | null;
  /** 응답 수신 포트 (기본 12346) */
  listenPort?: number;
  /** 탐색 대기 시간 (기본 3000ms) */
  timeoutMs?: number;
  /** 앱 시작 시 자동 탐색 여부 (기본 true) */
  autoDiscover?: boolean;
}

export function useDiscovery({
  transport,
  listenPort = 12346,
  timeoutMs = 3000,
  autoDiscover = true,
}: UseDiscoveryOptions) {
  const {
    stations,
    activeStation,
    isDiscovering,
    lastDiscoveryAt,
    upsertDiscoveredStations,
    setDiscovering,
  } = useStationStore();

  const hasDiscoveredRef = useRef(false);

  /**
   * Station 탐색 실행
   */
  const discover = useCallback(async () => {
    if (!transport || isDiscovering) return;

    setDiscovering(true);

    try {
      const service = new DiscoveryService(transport);
      const results = await service.discover(listenPort, timeoutMs);

      if (results.length > 0) {
        await upsertDiscoveredStations(results);
        console.log(`[Discovery] ${results.length}개 Station 발견`);
      } else {
        console.log('[Discovery] Station을 찾지 못했습니다');
      }

      return results;
    } catch (error) {
      console.error('[Discovery] 탐색 실패:', error);
      return [];
    } finally {
      setDiscovering(false);
    }
  }, [transport, isDiscovering, listenPort, timeoutMs, upsertDiscoveredStations, setDiscovering]);

  /**
   * 앱 시작 시 자동 탐색
   */
  useEffect(() => {
    if (autoDiscover && transport && !hasDiscoveredRef.current) {
      hasDiscoveredRef.current = true;
      discover();
    }
  }, [autoDiscover, transport, discover]);

  return {
    stations,
    activeStation,
    isDiscovering,
    lastDiscoveryAt,
    discover,
  };
}
