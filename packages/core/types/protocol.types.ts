/** UDP 프로토콜 관련 타입 정의 */

/** 패킷 타입 열거 */
export const PkgType = {
  GET: 1,
  GET_REPLY: 2,
  SET: 3,
  SET_REPLY: 4,
  NOTIFY: 9,
} as const;

export type PkgTypeValue = (typeof PkgType)[keyof typeof PkgType];

/** UDP 전송 옵션 */
export interface UdpSendOptions {
  host: string;
  port: number;
  data: Uint8Array;
  timeoutMs?: number;
}

/** UDP 응답 */
export interface UdpResponse {
  data: Uint8Array;
  remoteIp: string;
  remotePort: number;
}

/** JSON Body 공통 구조 */
export interface LocalRequestBody {
  sys: {
    ver: number;
    sign: string;
    model: string;
    ts: number;
  };
  obj: string;
  args: Record<string, unknown>;
  id: number;
}

/** 파싱된 패킷 */
export interface ParsedPacket {
  pkgType: number;
  body: unknown;
}

/** Discovery 응답 파싱 결과 */
export interface DiscoveryResult {
  lsid: string;
  ip: string;
  port: number;
  name?: string;
  mgamod?: string;
  wlan?: string;
}
