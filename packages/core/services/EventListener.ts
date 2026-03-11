/**
 * EventListener - UDP NOTIFY 이벤트 수신 서비스
 *
 * Smart Station이 장치 상태 변경을 앱으로 Push할 때
 * 포트 12346에서 수신한 NOTIFY 패킷을 파싱하여 콜백을 호출한다.
 */

import type { IUdpTransport } from './IUdpTransport';
import { parseLocalPacket } from './PacketBuilder';
import { PkgType } from '../types/protocol.types';

export interface DeviceEvent {
  me: string;
  stat: Record<string, unknown>;
}

export class EventListener {
  private isListening = false;

  constructor(private readonly transport: IUdpTransport) {}

  /**
   * 이벤트 수신 시작
   * @param port - 수신 포트 (기본 12346)
   * @param onEvent - 장치 상태 변경 이벤트 콜백
   */
  async start(
    port: number = 12346,
    onEvent: (event: DeviceEvent) => void,
  ): Promise<void> {
    if (this.isListening) return;

    this.isListening = true;

    await this.transport.startListen(port, (resp) => {
      try {
        const parsed = parseLocalPacket(resp.data);
        if (parsed.pkgType === PkgType.NOTIFY) {
          const body = parsed.body as Record<string, unknown>;
          const args = body.args as Record<string, unknown> | undefined;
          if (args?.me) {
            onEvent({
              me: args.me as string,
              stat: args,
            });
          }
        }
      } catch {
        // 파싱 실패  패킷은 무시
      }
    });
  }

  /** 이벤트 수신 중지 */
  async stop(): Promise<void> {
    if (!this.isListening) return;
    this.isListening = false;
    await this.transport.stopListen();
  }
}
