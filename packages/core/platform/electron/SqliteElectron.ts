/**
 * Electron SQLite Repository 구현 (Renderer 프로세스)
 *
 * preload.ts 에서 노출된 electronAPI.db 를 통해
 * Main 프로세스의 better-sqlite3 에 IPC 요청을 보낸다.
 */

import type { ISqliteRepository } from '../../services/ISqliteRepository';
import type { UserRow } from '../../types/auth.types';
import type { StationRow, GroupRow, DeviceLogRow } from '../../types/db.types';
import type { DeviceRow } from '../../types/device.types';

interface ElectronDbAPI {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  run: (sql: string, params?: unknown[]) => Promise<{ lastInsertRowid: number; changes: number }>;
  exec: (sql: string) => Promise<void>;
}

function getElectronDbAPI(): ElectronDbAPI {
  const api = (window as unknown as Record<string, unknown>).electronAPI as
    | { db: ElectronDbAPI }
    | undefined;
  if (!api?.db) {
    throw new Error('Electron DB API not available');
  }
  return api.db;
}

export class SqliteElectron implements ISqliteRepository {
  private db = getElectronDbAPI();

  async initialize(): Promise<void> {
    // 스키마는 Electron main process에서 초기화한다.
    // (db.ts에서 initialize 호출 시 SCHEMA_SQL을 실행)
  }

  // ─── Auth ─────────────────────────────────────────────────

  async getUserByCredentials(loginId: string, passwordHash: string): Promise<UserRow | null> {
    const rows = await this.db.query(
      'SELECT * FROM users WHERE login_id = ? AND password = ?',
      [loginId, passwordHash],
    );
    return (rows[0] as UserRow) ?? null;
  }

  async getUserById(id: number): Promise<UserRow | null> {
    const rows = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    return (rows[0] as UserRow) ?? null;
  }

  // ─── Station ──────────────────────────────────────────────

  async getStations(): Promise<StationRow[]> {
    return (await this.db.query('SELECT * FROM stations ORDER BY is_active DESC, id ASC')) as StationRow[];
  }

  async upsertStation(station: Omit<StationRow, 'model' | 'token'>): Promise<void> {
    await this.db.run(
      `INSERT INTO stations (lsid, name, ip, port, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(lsid) DO UPDATE SET
         name = excluded.name,
         ip = excluded.ip,
         port = excluded.port,
         updated_at = datetime('now')`,
      [station.lsid, station.name, station.ip, station.port, station.is_active ?? 1],
    );
  }

  async setActiveStation(id: number): Promise<void> {
    await this.db.run('UPDATE stations SET is_active = 0', []);
    await this.db.run('UPDATE stations SET is_active = 1 WHERE id = ?', [id]);
  }

  // ─── Group (2-level tree) ─────────────────────────────────

  async getGroups(): Promise<GroupRow[]> {
    return (await this.db.query('SELECT * FROM groups ORDER BY node ASC, sort_order ASC')) as GroupRow[];
  }

  async createGroup(group: Omit<GroupRow, 'group_id'>): Promise<GroupRow> {
    const result = await this.db.run(
      `INSERT INTO groups (groupname, node, root_id, sort_order, backimg)
       VALUES (?, ?, ?, ?, ?)`,
      [group.groupname, group.node, group.root_id, group.sort_order, group.backimg],
    );
    return { ...group, group_id: result.lastInsertRowid };
  }

  async updateGroup(groupId: number, data: Partial<GroupRow>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.groupname !== undefined) { fields.push('groupname = ?'); values.push(data.groupname); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
    if (data.backimg !== undefined) { fields.push('backimg = ?'); values.push(data.backimg); }
    if (data.root_id !== undefined) { fields.push('root_id = ?'); values.push(data.root_id); }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    values.push(groupId);

    await this.db.run(
      `UPDATE groups SET ${fields.join(', ')} WHERE group_id = ?`,
      values,
    );
  }

  async deleteGroup(groupId: number): Promise<void> {
    // group_devices는 CASCADE 삭제됨
    // 하위 소그룹도 삭제
    await this.db.run('DELETE FROM group_devices WHERE group_id IN (SELECT group_id FROM groups WHERE root_id = ?)', [groupId]);
    await this.db.run('DELETE FROM groups WHERE root_id = ?', [groupId]);
    await this.db.run('DELETE FROM groups WHERE group_id = ?', [groupId]);
  }

  async getSubGroups(rootId: number): Promise<GroupRow[]> {
    return (await this.db.query(
      'SELECT * FROM groups WHERE root_id = ? AND node = 3 ORDER BY sort_order ASC',
      [rootId],
    )) as GroupRow[];
  }

  // ─── Device ───────────────────────────────────────────────

  async getDevices(stationId: number): Promise<DeviceRow[]> {
    return (await this.db.query(
      'SELECT * FROM devices WHERE station_id = ?',
      [stationId],
    )) as DeviceRow[];
  }

  async upsertDevice(device: DeviceRow): Promise<void> {
    await this.db.run(
      `INSERT INTO devices (station_id, me, agt, name, dev_type, attribute, last_stat)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(station_id, me) DO UPDATE SET
         name = excluded.name,
         dev_type = excluded.dev_type,
         attribute = excluded.attribute,
         last_stat = excluded.last_stat,
         updated_at = datetime('now')`,
      [device.station_id, device.me, device.agt, device.name, device.dev_type, device.attribute, device.last_stat],
    );
  }

  async updateDeviceStatus(me: string, statJson: string): Promise<void> {
    await this.db.run(
      "UPDATE devices SET last_stat = ?, updated_at = datetime('now') WHERE me = ?",
      [statJson, me],
    );
  }

  // ─── Group-Device 매핑 ────────────────────────────────────

  async getDevicesByGroup(groupId: number): Promise<DeviceRow[]> {
    return (await this.db.query(
      `SELECT d.* FROM devices d
       INNER JOIN group_devices gd ON d.id = gd.device_id
       WHERE gd.group_id = ?
       ORDER BY gd.sort_order ASC`,
      [groupId],
    )) as DeviceRow[];
  }

  async addDeviceToGroup(groupId: number, deviceId: number): Promise<void> {
    await this.db.run(
      'INSERT OR IGNORE INTO group_devices (group_id, device_id, sort_order) VALUES (?, ?, 0)',
      [groupId, deviceId],
    );
  }

  async removeDeviceFromGroup(groupId: number, deviceId: number): Promise<void> {
    await this.db.run(
      'DELETE FROM group_devices WHERE group_id = ? AND device_id = ?',
      [groupId, deviceId],
    );
  }

  async isDeviceInGroup(groupId: number, deviceId: number): Promise<boolean> {
    const rows = await this.db.query(
      'SELECT 1 FROM group_devices WHERE group_id = ? AND device_id = ? LIMIT 1',
      [groupId, deviceId],
    );
    return rows.length > 0;
  }

  // ─── Dashboard-Device 매핑 ────────────────────────────────

  async getDashboardDevices(userId: number): Promise<DeviceRow[]> {
    return (await this.db.query(
      `SELECT d.* FROM devices d
       INNER JOIN dashboard_devices dd ON d.id = dd.device_id
       WHERE dd.user_id = ?
       ORDER BY dd.sort_order ASC`,
      [userId],
    )) as DeviceRow[];
  }

  async addDeviceToDashboard(userId: number, deviceId: number): Promise<void> {
    await this.db.run(
      'INSERT OR IGNORE INTO dashboard_devices (user_id, device_id, sort_order) VALUES (?, ?, 0)',
      [userId, deviceId],
    );
  }

  async removeDeviceFromDashboard(userId: number, deviceId: number): Promise<void> {
    await this.db.run(
      'DELETE FROM dashboard_devices WHERE user_id = ? AND device_id = ?',
      [userId, deviceId],
    );
  }

  async isDeviceInDashboard(userId: number, deviceId: number): Promise<boolean> {
    const rows = await this.db.query(
      'SELECT 1 FROM dashboard_devices WHERE user_id = ? AND device_id = ? LIMIT 1',
      [userId, deviceId],
    );
    return rows.length > 0;
  }

  // ─── Settings ─────────────────────────────────────────────

  async getSetting(key: string): Promise<string | null> {
    const rows = await this.db.query(
      'SELECT value FROM app_settings WHERE key = ?',
      [key],
    );
    return rows.length > 0 ? (rows[0] as { value: string }).value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db.run(
      `INSERT INTO app_settings (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  }

  // ─── Log ──────────────────────────────────────────────────

  async insertLog(log: DeviceLogRow): Promise<void> {
    await this.db.run(
      `INSERT INTO device_logs (device_id, action, payload, result, success)
       VALUES (?, ?, ?, ?, ?)`,
      [log.device_id, log.action, log.payload, log.result, log.success],
    );
  }
}
