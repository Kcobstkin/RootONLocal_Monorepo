/**
 * Android SQLite Repository 구현 (Capacitor Plugin)
 *
 * @capacitor-community/sqlite 를 사용한다.
 * 실제 구현은 Phase 13에서 완성.
 * 여기서는 인터페이스 구현의 스켈레톤만 제공한다.
 */

import type { ISqliteRepository } from '../../services/ISqliteRepository';
import type { UserRow } from '../../types/auth.types';
import type { StationRow, GroupRow, DeviceLogRow } from '../../types/db.types';
import type { DeviceRow } from '../../types/device.types';

// Capacitor SQLite 플러그인 동적 로드
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSqlitePlugin(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Capacitor = (window as any).Capacitor;
  if (!Capacitor?.Plugins?.CapacitorSQLite) {
    throw new Error('Capacitor SQLite Plugin not available');
  }
  return Capacitor.Plugins.CapacitorSQLite;
}

export class SqliteAndroid implements ISqliteRepository {
  private dbName = 'localcontrol';

  async initialize(): Promise<void> {
    // Phase 13에서 구현
    console.log('[SqliteAndroid] initialize - to be implemented');
  }

  async getUserByCredentials(loginId: string, passwordHash: string): Promise<UserRow | null> {
    // Phase 13에서 구현
    throw new Error('Not implemented yet');
  }

  async getUserById(id: number): Promise<UserRow | null> {
    throw new Error('Not implemented yet');
  }

  async getStations(): Promise<StationRow[]> {
    throw new Error('Not implemented yet');
  }

  async upsertStation(_station: Omit<StationRow, 'model' | 'token'>): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async setActiveStation(_id: number): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async getGroups(): Promise<GroupRow[]> {
    throw new Error('Not implemented yet');
  }

  async createGroup(_group: Omit<GroupRow, 'group_id'>): Promise<GroupRow> {
    throw new Error('Not implemented yet');
  }

  async updateGroup(_groupId: number, _data: Partial<GroupRow>): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async deleteGroup(_groupId: number): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async getSubGroups(_rootId: number): Promise<GroupRow[]> {
    throw new Error('Not implemented yet');
  }

  async getDevices(_stationId: number): Promise<DeviceRow[]> {
    throw new Error('Not implemented yet');
  }

  async upsertDevice(_device: DeviceRow): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async updateDeviceStatus(_me: string, _statJson: string): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async getDevicesByGroup(_groupId: number): Promise<DeviceRow[]> {
    throw new Error('Not implemented yet');
  }

  async addDeviceToGroup(_groupId: number, _deviceId: number): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async removeDeviceFromGroup(_groupId: number, _deviceId: number): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async isDeviceInGroup(_groupId: number, _deviceId: number): Promise<boolean> {
    throw new Error('Not implemented yet');
  }

  async getDashboardDevices(_userId: number): Promise<DeviceRow[]> {
    throw new Error('Not implemented yet');
  }

  async addDeviceToDashboard(_userId: number, _deviceId: number): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async removeDeviceFromDashboard(_userId: number, _deviceId: number): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async isDeviceInDashboard(_userId: number, _deviceId: number): Promise<boolean> {
    throw new Error('Not implemented yet');
  }

  async getSetting(_key: string): Promise<string | null> {
    throw new Error('Not implemented yet');
  }

  async setSetting(_key: string, _value: string): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async insertLog(_log: DeviceLogRow): Promise<void> {
    throw new Error('Not implemented yet');
  }
}
