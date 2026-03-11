/**
 * 플랫폼 추상화 레이어
 *
 * 런타임에 Electron / Capacitor(Android) 를 감지하여
 * 적절한 IUdpTransport / ISqliteRepository 구현체를 제공한다.
 */

import type { IUdpTransport } from '../services/IUdpTransport';
import type { ISqliteRepository } from '../services/ISqliteRepository';

/** 현재 플랫폼 감지 */
export type Platform = 'electron' | 'android' | 'web';

export function detectPlatform(): Platform {
  // Electron: window 에 electronAPI 가 주입되어 있음
  if (
    typeof window !== 'undefined' &&
    (window as unknown as Record<string, unknown>).electronAPI
  ) {
    return 'electron';
  }

  // Capacitor: window.Capacitor 존재
  if (
    typeof window !== 'undefined' &&
    (window as unknown as Record<string, unknown>).Capacitor
  ) {
    return 'android';
  }

  return 'web';
}

/** 플랫폼 구현체 레지스트리 */
let _udpTransport: IUdpTransport | null = null;
let _sqliteRepository: ISqliteRepository | null = null;

export function registerUdpTransport(transport: IUdpTransport): void {
  _udpTransport = transport;
}

export function registerSqliteRepository(repo: ISqliteRepository): void {
  _sqliteRepository = repo;
}

export function getUdpTransport(): IUdpTransport {
  if (!_udpTransport) {
    throw new Error(
      'UdpTransport not registered. Call registerUdpTransport() first.',
    );
  }
  return _udpTransport;
}

export function getSqliteRepository(): ISqliteRepository {
  if (!_sqliteRepository) {
    throw new Error(
      'SqliteRepository not registered. Call registerSqliteRepository() first.',
    );
  }
  return _sqliteRepository;
}
