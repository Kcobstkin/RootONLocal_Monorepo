/**
 * DiscoveryService - Smart Station 탐색
 *
 * Z-SEARCH 브로드캐스트를 전송하고 응답을 파싱하여
 * Station 목록을 반환한다.
 */

import type { IUdpTransport } from './IUdpTransport';
import type { DiscoveryResult } from '../types/protocol.types';

const Z_SEARCH_MSG = 'Z-SEARCH * \r\n';
const DISCOVERY_PORT = 12345;
const DISCOVERY_TIMEOUT_MS = 3000;

export class DiscoveryService {
  constructor(private readonly transport: IUdpTransport) {}

  /**
   * UDP 브로드캐스트로 LAN 내 Smart Station 을 탐색한다.
   * @param listenPort - 응답 수신 포트 (기본 12346)
   * @param timeoutMs - 탐색 대기 시간 (기본 3000ms)
   * @returns 발견된 Station 목록
   */
  async discover(
    listenPort: number = 12346,
    timeoutMs: number = DISCOVERY_TIMEOUT_MS,
  ): Promise<DiscoveryResult[]> {
    const data = new TextEncoder().encode(Z_SEARCH_MSG);

    const responses = await this.transport.broadcast(
      DISCOVERY_PORT,
      data,
      listenPort,
      timeoutMs,
    );

    const stations: DiscoveryResult[] = [];

    for (const resp of responses) {
      const text = new TextDecoder().decode(resp.data);
      const parsed = this.parseDiscoveryResponse(text, resp.remoteIp);
      if (parsed) {
        stations.push(parsed);
      }
    }

    return stations;
  }

  /**
   * Discovery 응답 문자열을 파싱한다.
   *
   * 응답 형식:
   *   LSID=xxxx
   *   MGAMOD=xxxx
   *   WLAN=xxxx
   *   NAME=xxxx
   */
  private parseDiscoveryResponse(
    text: string,
    remoteIp: string,
  ): DiscoveryResult | null {
    const lines = text.split('\n').map((l) => l.trim());
    const fields: Record<string, string> = {};

    for (const line of lines) {
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.substring(0, eqIdx).trim();
        const value = line.substring(eqIdx + 1).trim();
        fields[key] = value;
      }
    }

    const lsid = fields['LSID'];
    if (!lsid) return null;

    return {
      lsid,
      ip: remoteIp,
      port: 12348,
      name: fields['NAME'],
      mgamod: fields['MGAMOD'],
      wlan: fields['WLAN'],
    };
  }
}
