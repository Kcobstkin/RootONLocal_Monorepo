/**
 * UDP 패킷 직렬화/역직렬화
 *
 * 패킷 구조: 10-byte 헤더 + UTF-8 JSON 바디
 * ┌────┬─────────┬──────────┬─────────────┬──────────────────────────┐
 * │ 2B │   1B    │   1B     │    5B       │  N bytes (JSON)          │
 * │ JL │ version │ pkg_type │  pkg_size   │  UTF-8 JSON body         │
 * └────┴─────────┴──────────┴─────────────┴──────────────────────────┘
 */

import type { ParsedPacket } from '../types/protocol.types';

const HEADER_MAGIC = [0x4a, 0x4c]; // 'JL'
const HEADER_VERSION = 0;
const HEADER_SIZE = 10;

/**
 * JSON 바디 문자열을 UDP 전송용 패킷으로 직렬화한다.
 * @param pkgType - 패킷 타입 (1=GET, 2=GET_REPLY, 3=SET, 4=SET_REPLY, 9=NOTIFY)
 * @param jsonBody - JSON 문자열
 * @returns 직렬화된 Uint8Array 패킷
 */
export function buildLocalPacket(
  pkgType: number,
  jsonBody: string,
): Uint8Array {
  const bodyBytes = new TextEncoder().encode(jsonBody);
  const header = new Uint8Array(HEADER_SIZE);

  // Magic bytes: 'JL'
  header[0] = HEADER_MAGIC[0];
  header[1] = HEADER_MAGIC[1];

  // Version
  header[2] = HEADER_VERSION;

  // Package type
  header[3] = pkgType;

  // Package size (5 bytes, Big-Endian)
  const size = bodyBytes.length;
  header[4] = (size >>> 32) & 0xff;
  header[5] = (size >>> 24) & 0xff;
  header[6] = (size >>> 16) & 0xff;
  header[7] = (size >>> 8) & 0xff;
  header[8] = size & 0xff;

  // Reserved
  header[9] = 0x00;

  // 헤더 + 바디 결합
  const packet = new Uint8Array(HEADER_SIZE + bodyBytes.length);
  packet.set(header, 0);
  packet.set(bodyBytes, HEADER_SIZE);

  return packet;
}

/**
 * 수신된 UDP 패킷을 역직렬화한다.
 * @param raw - 수신된 Uint8Array 패킷
 * @returns 패킷 타입과 파싱된 JSON body
 */
export function parseLocalPacket(raw: Uint8Array): ParsedPacket {
  if (raw.length < HEADER_SIZE) {
    throw new Error(
      `Invalid packet: too short (${raw.length} bytes, minimum ${HEADER_SIZE})`,
    );
  }

  // Magic 검증
  if (raw[0] !== HEADER_MAGIC[0] || raw[1] !== HEADER_MAGIC[1]) {
    throw new Error('Invalid packet: wrong magic bytes');
  }

  const pkgType = raw[3];
  const bodyBytes = raw.slice(HEADER_SIZE);
  const bodyStr = new TextDecoder().decode(bodyBytes);

  let body: unknown;
  try {
    body = JSON.parse(bodyStr);
  } catch {
    throw new Error(`Invalid packet: failed to parse JSON body: ${bodyStr}`);
  }

  return { pkgType, body };
}
