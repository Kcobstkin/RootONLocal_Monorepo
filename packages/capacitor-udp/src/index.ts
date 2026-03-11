/**
 * Capacitor UDP Plugin - TypeScript 인터페이스
 *
 * Android에서 DatagramSocket을 사용하여 UDP 통신을 수행한다.
 * LifeSmart Local Protocol의 sendAndReceive, broadcast, listen을 지원한다.
 */

import { registerPlugin } from '@capacitor/core';
import type { Plugin } from '@capacitor/core';

export interface UdpSendOptions {
  host: string;
  port: number;
  data: number[];
  timeoutMs?: number;
}

export interface UdpResponse {
  data: number[];
  remoteIp: string;
  remotePort: number;
}

export interface UdpBroadcastOptions {
  broadcastPort: number;
  data: number[];
  listenPort: number;
  timeoutMs?: number;
}

export interface UdpBroadcastResult {
  results: UdpResponse[];
}

export interface UdpListenOptions {
  port: number;
}

export interface UdpPluginInterface extends Plugin {
  /** 단발성 UDP 요청/응답 */
  sendAndReceive(options: UdpSendOptions): Promise<UdpResponse>;
  /** UDP Broadcast 후 다수 응답 수집 */
  broadcast(options: UdpBroadcastOptions): Promise<UdpBroadcastResult>;
  /** UDP 수신 시작 (NOTIFY 이벤트 용) */
  startListen(options: UdpListenOptions): Promise<void>;
  /** UDP 수신 중지 */
  stopListen(): Promise<void>;
}

const UdpPlugin = registerPlugin<UdpPluginInterface>('UdpPlugin');

export default UdpPlugin;
export { UdpPlugin };
