/**
 * useStationStore - Smart Station 상태 관리 (Zustand)
 *
 * - Discovery로 발견된 Station 목록 관리
 * - 활성 Station 선택
 * - DB 연동 (stations 테이블)
 */

import { create } from 'zustand';
import type { StationRow } from '../types/db.types';
import type { DiscoveryResult } from '../types/protocol.types';
import type { ISqliteRepository } from '../services/ISqliteRepository';

interface StationStore {
  // ─── State ─────────────────────────────────────────────
  stations: StationRow[];
  activeStation: StationRow | null;
  isDiscovering: boolean;
  lastDiscoveryAt: string | null;
  db: ISqliteRepository | null;

  // ─── Actions ───────────────────────────────────────────
  /** DB 연결 설정 */
  initStore: (db: ISqliteRepository) => void;

  /** DB에서 Station 목록 로드 */
  loadStations: () => Promise<void>;

  /** Discovery 결과를 DB에 upsert 후 새로고침 */
  upsertDiscoveredStations: (results: DiscoveryResult[]) => Promise<void>;

  /** 활성 Station 설정 */
  setActiveStation: (stationId: number) => Promise<void>;

  /** Discovery 상태 설정 */
  setDiscovering: (value: boolean) => void;
}

export const useStationStore = create<StationStore>((set, get) => ({
  stations: [],
  activeStation: null,
  isDiscovering: false,
  lastDiscoveryAt: null,
  db: null,

  initStore: (db: ISqliteRepository) => {
    set({ db });
  },

  loadStations: async () => {
    const { db } = get();
    if (!db) return;

    const stations = await db.getStations();
    const active = stations.find((s) => s.is_active === 1) ?? stations[0] ?? null;
    set({ stations, activeStation: active });
  },

  upsertDiscoveredStations: async (results: DiscoveryResult[]) => {
    const { db } = get();
    if (!db) return;

    for (const result of results) {
      await db.upsertStation({
        lsid: result.lsid,
        name: result.name ?? null,
        ip: result.ip,
        port: result.port,
        is_active: 1,
      });
    }

    // DB에서 다시 로드
    await get().loadStations();
    set({ lastDiscoveryAt: new Date().toISOString() });
  },

  setActiveStation: async (stationId: number) => {
    const { db } = get();
    if (!db) return;

    await db.setActiveStation(stationId);
    await get().loadStations();
  },

  setDiscovering: (value: boolean) => {
    set({ isDiscovering: value });
  },
}));
