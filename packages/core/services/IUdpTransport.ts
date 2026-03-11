import type { UdpSendOptions, UdpResponse } from '../types/protocol.types';

/**
 * UDP 통신 플랫폼 추상화 인터페이스
 * - Android: Capacitor 커스텀 플러그인
 * - Windows: Electron IPC → Node.js dgram
 */
export interface IUdpTransport {
  /** 단발성 요청/응답 (GET, SET) */
  sendAndReceive(options: UdpSendOptions): Promise<UdpResponse>;

  /** UDP Broadcast 전송 후 다수 응답 수집 (Discovery) */
  broadcast(
    port: number,
    data: Uint8Array,
    listenPort: number,
    timeoutMs: number,
  ): Promise<UdpResponse[]>;

  /** 이벤트 수신 Listen 시작 */
  startListen(
    port: number,
    onMessage: (resp: UdpResponse) => void,
  ): Promise<void>;

  /** Listen 종료 */
  stopListen(): Promise<void>;
}
