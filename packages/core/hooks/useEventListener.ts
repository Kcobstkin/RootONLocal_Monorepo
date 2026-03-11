/**
 * useEventListener - UDP NOTIFY 이벤트 수신 훅
 *
 * 1. config SET으로 이벤트 수신 등록 (Station에 앱 IP/Port 알려줌)
 * 2. 포트 12346에서 NOTIFY 패킷 수신 대기
 * 3. 수신 시 useDeviceStore.updateDeviceStatus로 상태 반영
 * 4. 컴포넌트 언마운트 시 리스너 정리
 */

import { useEffect, useRef, useCallback } from 'react';
import { EventListener } from '../services/EventListener';
import { useDeviceStore } from '../store/useDeviceStore';
import type { IUdpTransport } from '../services/IUdpTransport';
import type { LocalGateway } from '../services/LocalGateway';
import type { DeviceEvent } from '../services/EventListener';

interface UseEventListenerOptions {
  /** UDP Transport 인스턴스 */
  transport: IUdpTransport | null;
  /** Gateway 인스턴스 (config SET 호출용) */
  gateway: LocalGateway | null;
  /** 앱이 실행 중인 IP (config SET에 전달) */
  appIp: string;
  /** 이벤트 수신 포트 (기본 12346) */
  listenPort?: number;
  /** 이벤트 수신 활성화 여부 */
  enabled?: boolean;
}

export function useEventListener({
  transport,
  gateway,
  appIp,
  listenPort = 12346,
  enabled = true,
}: UseEventListenerOptions) {
  const listenerRef = useRef<EventListener | null>(null);
  const updateDeviceStatus = useDeviceStore((s) => s.updateDeviceStatus);

  const handleEvent = useCallback(
    (event: DeviceEvent) => {
      console.log('[useEventListener] NOTIFY:', event.me, event.stat);
      updateDeviceStatus(event.me, event.stat);
    },
    [updateDeviceStatus],
  );

  useEffect(() => {
    if (!enabled || !transport || !gateway || !appIp) return;

    let cancelled = false;
    const listener = new EventListener(transport);
    listenerRef.current = listener;

    const setup = async () => {
      try {
        // 1. config SET으로 이벤트 수신 등록
        await gateway.registerEventListener(appIp, listenPort);
        console.log('[useEventListener] 이벤트 수신 등록 완료');

        if (cancelled) return;

        // 2. NOTIFY 수신 대기 시작
        await listener.start(listenPort, handleEvent);
        console.log(`[useEventListener] 포트 ${listenPort} 수신 대기 시작`);
      } catch (error) {
        console.error('[useEventListener] 설정 실패:', error);
      }
    };

    setup();

    return () => {
      cancelled = true;
      listener.stop().catch(console.error);
      listenerRef.current = null;
      console.log('[useEventListener] 이벤트 수신 정리');
    };
  }, [enabled, transport, gateway, appIp, listenPort, handleEvent]);

  return {
    /** 현재 리스너 인스턴스 */
    listener: listenerRef.current,
  };
}
