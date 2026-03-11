/**
 * useDeviceStore - 장치 상태 관리 (Zustand)
 *
 * - Station에서 조회한 전체 장치 목록
 * - 대시보드/구역별 장치 목록 관리
 * - 장치 상태 업데이트
 */

import { create } from 'zustand';
import type { DeviceRow } from '../types/device.types';
import type { ISqliteRepository } from '../services/ISqliteRepository';

interface DeviceStore {
  // ─── State ─────────────────────────────────────────────
  /** Station에서 발견된 전체 장치 */
  allDevices: DeviceRow[];
  db: ISqliteRepository | null;

  // ─── Actions ───────────────────────────────────────────
  initStore: (db: ISqliteRepository) => void;

  /** Station의 전체 장치 목록 로드 (DB에서) */
  loadDevices: (stationId: number) => Promise<void>;

  /** eps GET 응답 파싱 결과를 DB에 upsert 후 다시 로드 */
  upsertDevicesFromStation: (
    stationId: number,
    devices: Array<{
      me: string;
      agt?: string;
      name: string;
      devtype: string;
      stat?: unknown;
    }>,
  ) => Promise<void>;

  /** 장치 상태 업데이트 (NOTIFY 수신 시) */
  updateDeviceStatus: (me: string, stat: unknown) => Promise<void>;

  // ─── Dashboard 장치 ────────────────────────────────────
  /** 대시보드에 표시할 장치 로드 */
  getDashboardDevices: (userId: number) => Promise<DeviceRow[]>;

  /** 대시보드에 장치 추가 */
  addDeviceToDashboard: (userId: number, deviceId: number) => Promise<void>;

  /** 대시보드에서 장치 삭제 */
  removeDeviceFromDashboard: (userId: number, deviceId: number) => Promise<void>;

  // ─── Group 장치 ────────────────────────────────────────
  /** 구역별 장치 로드 */
  getGroupDevices: (groupId: number) => Promise<DeviceRow[]>;

  /** 구역에 장치 추가 */
  addDeviceToGroup: (groupId: number, deviceId: number) => Promise<void>;

  /** 구역에서 장치 삭제 */
  removeDeviceFromGroup: (groupId: number, deviceId: number) => Promise<void>;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  allDevices: [],
  db: null,

  initStore: (db: ISqliteRepository) => {
    set({ db });
  },

  loadDevices: async (stationId: number) => {
    const { db } = get();
    if (!db) return;

    const devices = await db.getDevices(stationId);
    set({ allDevices: devices });
  },

  upsertDevicesFromStation: async (stationId, devices) => {
    const { db } = get();
    if (!db) return;

    for (const dev of devices) {
      await db.upsertDevice({
        station_id: stationId,
        me: dev.me,
        agt: dev.agt ?? null,
        name: dev.name,
        dev_type: dev.devtype,
        attribute: null,
        last_stat: dev.stat ? JSON.stringify(dev.stat) : null,
      });
    }

    await get().loadDevices(stationId);
  },

  updateDeviceStatus: async (me: string, stat: unknown) => {
    const { db } = get();
    if (!db) return;

    await db.updateDeviceStatus(me, JSON.stringify(stat));

    // 로컬 상태도 갱신
    set((state) => ({
      allDevices: state.allDevices.map((d) =>
        d.me === me ? { ...d, last_stat: JSON.stringify(stat) } : d,
      ),
    }));
  },

  getDashboardDevices: async (userId: number) => {
    const { db } = get();
    if (!db) return [];
    return db.getDashboardDevices(userId);
  },

  addDeviceToDashboard: async (userId: number, deviceId: number) => {
    const { db } = get();
    if (!db) return;
    await db.addDeviceToDashboard(userId, deviceId);
  },

  removeDeviceFromDashboard: async (userId: number, deviceId: number) => {
    const { db } = get();
    if (!db) return;
    await db.removeDeviceFromDashboard(userId, deviceId);
  },

  getGroupDevices: async (groupId: number) => {
    const { db } = get();
    if (!db) return [];
    return db.getDevicesByGroup(groupId);
  },

  addDeviceToGroup: async (groupId: number, deviceId: number) => {
    const { db } = get();
    if (!db) return;
    await db.addDeviceToGroup(groupId, deviceId);
  },

  removeDeviceFromGroup: async (groupId: number, deviceId: number) => {
    const { db } = get();
    if (!db) return;
    await db.removeDeviceFromGroup(groupId, deviceId);
  },
}));
