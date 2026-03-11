import type { UserRow } from '../types/auth.types';
import type { StationRow, GroupRow, DeviceLogRow } from '../types/db.types';
import type { DeviceRow } from '../types/device.types';

/**
 * SQLite 저장소 플랫폼 추상화 인터페이스
 * - Android: @capacitor-community/sqlite
 * - Windows: better-sqlite3 (Electron main process)
 */
export interface ISqliteRepository {
  /** DB 초기화 (테이블 생성 / 마이그레이션) */
  initialize(): Promise<void>;

  // ─── Auth (users) ─────────────────────────────────────────
  getUserByCredentials(
    loginId: string,
    passwordHash: string,
  ): Promise<UserRow | null>;
  getUserById(id: number): Promise<UserRow | null>;

  // ─── Station CRUD ─────────────────────────────────────────
  getStations(): Promise<StationRow[]>;
  upsertStation(station: Omit<StationRow, 'model' | 'token'>): Promise<void>;
  setActiveStation(id: number): Promise<void>;

  // ─── Group CRUD (2-level tree) ────────────────────────────
  getGroups(): Promise<GroupRow[]>;
  createGroup(group: Omit<GroupRow, 'group_id'>): Promise<GroupRow>;
  updateGroup(groupId: number, data: Partial<GroupRow>): Promise<void>;
  deleteGroup(groupId: number): Promise<void>;
  getSubGroups(rootId: number): Promise<GroupRow[]>;

  // ─── Device CRUD ──────────────────────────────────────────
  getDevices(stationId: number): Promise<DeviceRow[]>;
  upsertDevice(device: DeviceRow): Promise<void>;
  updateDeviceStatus(me: string, statJson: string): Promise<void>;

  // ─── Group-Device 매핑 ────────────────────────────────────
  getDevicesByGroup(groupId: number): Promise<DeviceRow[]>;
  addDeviceToGroup(groupId: number, deviceId: number): Promise<void>;
  removeDeviceFromGroup(
    groupId: number,
    deviceId: number,
  ): Promise<void>;
  isDeviceInGroup(groupId: number, deviceId: number): Promise<boolean>;

  // ─── Dashboard-Device 매핑 (사용자별) ─────────────────────
  getDashboardDevices(userId: number): Promise<DeviceRow[]>;
  addDeviceToDashboard(userId: number, deviceId: number): Promise<void>;
  removeDeviceFromDashboard(
    userId: number,
    deviceId: number,
  ): Promise<void>;
  isDeviceInDashboard(
    userId: number,
    deviceId: number,
  ): Promise<boolean>;

  // ─── Settings ─────────────────────────────────────────────
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;

  // ─── Log ──────────────────────────────────────────────────
  insertLog(log: DeviceLogRow): Promise<void>;
}
