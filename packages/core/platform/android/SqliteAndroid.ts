/**
 * Android SQLite Repository 구현 (Capacitor Plugin)
 *
 * @capacitor-community/sqlite 를 사용한다.
 * Capacitor SQLite 플러그인의 API를 통해 SQL 쿼리를 실행한다.
 */

import type { ISqliteRepository } from '../../services/ISqliteRepository';
import type { UserRow } from '../../types/auth.types';
import type { StationRow, GroupRow, DeviceLogRow } from '../../types/db.types';
import type { DeviceRow } from '../../types/device.types';
import { SCHEMA_SQL, SEED_ADMIN_SQL } from '../../services/schema';

// Capacitor SQLite 플러그인 인터페이스
interface CapacitorSQLitePlugin {
  createConnection(options: { database: string; encrypted: boolean; mode: string; version: number }): Promise<void>;
  open(options: { database: string }): Promise<void>;
  execute(options: { database: string; statements: string }): Promise<{ changes: { changes: number } }>;
  query(options: { database: string; statement: string; values?: unknown[] }): Promise<{ values: Record<string, unknown>[] }>;
  run(options: { database: string; statement: string; values?: unknown[] }): Promise<{ changes: { changes: number; lastId: number } }>;
  close(options: { database: string }): Promise<void>;
}

function getSqlitePlugin(): CapacitorSQLitePlugin {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Capacitor = (window as any).Capacitor;
  if (!Capacitor?.Plugins?.CapacitorSQLite) {
    throw new Error('Capacitor SQLite Plugin not available');
  }
  return Capacitor.Plugins.CapacitorSQLite as CapacitorSQLitePlugin;
}

export class SqliteAndroid implements ISqliteRepository {
  private readonly dbName = 'localcontrol';
  private plugin: CapacitorSQLitePlugin | null = null;

  private getPlugin(): CapacitorSQLitePlugin {
    if (!this.plugin) {
      this.plugin = getSqlitePlugin();
    }
    return this.plugin;
  }

  private async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const p = this.getPlugin();
    const result = await p.query({ database: this.dbName, statement: sql, values: params });
    return (result.values ?? []) as T[];
  }

  private async run(sql: string, params: unknown[] = []): Promise<{ changes: number; lastId: number }> {
    const p = this.getPlugin();
    const result = await p.run({ database: this.dbName, statement: sql, values: params });
    return result.changes;
  }

  private async exec(sql: string): Promise<void> {
    const p = this.getPlugin();
    await p.execute({ database: this.dbName, statements: sql });
  }

  async initialize(): Promise<void> {
    const p = this.getPlugin();
    await p.createConnection({ database: this.dbName, encrypted: false, mode: 'no-encryption', version: 1 });
    await p.open({ database: this.dbName });
    await this.exec(SCHEMA_SQL);
    await this.exec(SEED_ADMIN_SQL);
    console.log('[SqliteAndroid] Database initialized');
  }

  // ─── Auth ───

  async getUserByCredentials(loginId: string, passwordHash: string): Promise<UserRow | null> {
    const rows = await this.query<UserRow>(
      'SELECT * FROM users WHERE login_id = ? AND password = ? AND user_level != 99',
      [loginId, passwordHash],
    );
    return rows[0] ?? null;
  }

  async getUserById(id: number): Promise<UserRow | null> {
    const rows = await this.query<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] ?? null;
  }

  // ─── Station ───

  async getStations(): Promise<StationRow[]> {
    return this.query<StationRow>('SELECT * FROM stations ORDER BY is_active DESC, id');
  }

  async upsertStation(station: Omit<StationRow, 'model' | 'token'>): Promise<void> {
    await this.run(
      `INSERT INTO stations (lsid, name, ip, port, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(lsid) DO UPDATE SET name=excluded.name, ip=excluded.ip, port=excluded.port,
         updated_at=CURRENT_TIMESTAMP`,
      [station.lsid, station.name, station.ip, station.port, station.is_active ?? 1],
    );
  }

  async setActiveStation(id: number): Promise<void> {
    await this.run('UPDATE stations SET is_active = 0');
    await this.run('UPDATE stations SET is_active = 1 WHERE id = ?', [id]);
  }

  // ─── Groups ───

  async getGroups(): Promise<GroupRow[]> {
    return this.query<GroupRow>('SELECT * FROM groups ORDER BY sort_order, group_id');
  }

  async createGroup(group: Omit<GroupRow, 'group_id'>): Promise<GroupRow> {
    const result = await this.run(
      'INSERT INTO groups (groupname, node, root_id, sort_order) VALUES (?, ?, ?, ?)',
      [group.groupname, group.node, group.root_id ?? null, group.sort_order ?? 0],
    );
    return { ...group, group_id: result.lastId } as GroupRow;
  }

  async updateGroup(groupId: number, data: Partial<GroupRow>): Promise<void> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.groupname !== undefined) { sets.push('groupname = ?'); vals.push(data.groupname); }
    if (data.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(data.sort_order); }
    if (sets.length === 0) return;
    vals.push(groupId);
    await this.run(`UPDATE groups SET ${sets.join(', ')} WHERE group_id = ?`, vals);
  }

  async deleteGroup(groupId: number): Promise<void> {
    await this.run('DELETE FROM group_devices WHERE group_id = ?', [groupId]);
    await this.run('DELETE FROM groups WHERE root_id = ?', [groupId]);
    await this.run('DELETE FROM groups WHERE group_id = ?', [groupId]);
  }

  async getSubGroups(rootId: number): Promise<GroupRow[]> {
    return this.query<GroupRow>(
      'SELECT * FROM groups WHERE root_id = ? ORDER BY sort_order',
      [rootId],
    );
  }

  // ─── Devices ───

  async getDevices(stationId: number): Promise<DeviceRow[]> {
    return this.query<DeviceRow>('SELECT * FROM devices WHERE station_id = ?', [stationId]);
  }

  async upsertDevice(device: DeviceRow): Promise<void> {
    await this.run(
      `INSERT INTO devices (station_id, me, agt, name, dev_type, attribute, last_stat)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(me) DO UPDATE SET name=excluded.name, dev_type=excluded.dev_type,
         attribute=excluded.attribute, last_stat=excluded.last_stat, updated_at=CURRENT_TIMESTAMP`,
      [device.station_id, device.me, device.agt, device.name, device.dev_type, device.attribute, device.last_stat],
    );
  }

  async updateDeviceStatus(me: string, statJson: string): Promise<void> {
    await this.run(
      'UPDATE devices SET last_stat = ?, updated_at = CURRENT_TIMESTAMP WHERE me = ?',
      [statJson, me],
    );
  }

  // ─── Group Devices ───

  async getDevicesByGroup(groupId: number): Promise<DeviceRow[]> {
    return this.query<DeviceRow>(
      `SELECT d.* FROM devices d
       INNER JOIN group_devices gd ON d.id = gd.device_id
       WHERE gd.group_id = ?`,
      [groupId],
    );
  }

  async addDeviceToGroup(groupId: number, deviceId: number): Promise<void> {
    await this.run(
      'INSERT OR IGNORE INTO group_devices (group_id, device_id) VALUES (?, ?)',
      [groupId, deviceId],
    );
  }

  async removeDeviceFromGroup(groupId: number, deviceId: number): Promise<void> {
    await this.run(
      'DELETE FROM group_devices WHERE group_id = ? AND device_id = ?',
      [groupId, deviceId],
    );
  }

  async isDeviceInGroup(groupId: number, deviceId: number): Promise<boolean> {
    const rows = await this.query<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM group_devices WHERE group_id = ? AND device_id = ?',
      [groupId, deviceId],
    );
    return (rows[0]?.cnt ?? 0) > 0;
  }

  // ─── Dashboard Devices ───

  async getDashboardDevices(userId: number): Promise<DeviceRow[]> {
    return this.query<DeviceRow>(
      `SELECT d.* FROM devices d
       INNER JOIN dashboard_devices dd ON d.id = dd.device_id
       WHERE dd.user_id = ?`,
      [userId],
    );
  }

  async addDeviceToDashboard(userId: number, deviceId: number): Promise<void> {
    await this.run(
      'INSERT OR IGNORE INTO dashboard_devices (user_id, device_id) VALUES (?, ?)',
      [userId, deviceId],
    );
  }

  async removeDeviceFromDashboard(userId: number, deviceId: number): Promise<void> {
    await this.run(
      'DELETE FROM dashboard_devices WHERE user_id = ? AND device_id = ?',
      [userId, deviceId],
    );
  }

  async isDeviceInDashboard(userId: number, deviceId: number): Promise<boolean> {
    const rows = await this.query<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM dashboard_devices WHERE user_id = ? AND device_id = ?',
      [userId, deviceId],
    );
    return (rows[0]?.cnt ?? 0) > 0;
  }

  // ─── Settings ───

  async getSetting(key: string): Promise<string | null> {
    const rows = await this.query<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key],
    );
    return rows[0]?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.run(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`,
      [key, value],
    );
  }

  // ─── Logs ───

  async insertLog(log: DeviceLogRow): Promise<void> {
    await this.run(
      'INSERT INTO device_logs (device_id, action, payload, created_at) VALUES (?, ?, ?, ?)',
      [log.device_id, log.action, log.payload ?? null, log.created_at ?? new Date().toISOString()],
    );
  }
}
