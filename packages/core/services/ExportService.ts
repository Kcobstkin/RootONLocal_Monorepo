/**
 * ExportService - DB 설정 데이터를 JSON으로 직렬화
 *
 * 내보내기 범위: groups, devices, group_devices, app_settings
 * 제외: users(보안), stations(Discovery 재탐색), device_logs(이력)
 */

import type { GroupRow } from '../types/db.types';
import type { DeviceRow } from '../types/device.types';
import { getSqliteRepository } from '../platform';

export interface ExportData {
  exported_at: string;
  app_version: string;
  schema_version: number;
  groups: ExportGroupRow[];
  devices: ExportDeviceRow[];
  group_devices: ExportGroupDeviceRow[];
  app_settings: ExportAppSettingRow[];
}

/** 내보내기 전용 Group 행 (DB id 포함) */
export interface ExportGroupRow {
  group_id: number;
  groupname: string;
  node: number;
  root_id: number;
  sort_order: number;
  backimg: string | null;
}

/** 내보내기 전용 Device 행 (me 기준 식별) */
export interface ExportDeviceRow {
  me: string;
  agt: string | null;
  name: string | null;
  dev_type: string;
  attribute: string | null;
}

/** 내보내기 전용 Group-Device 매핑 (device_me 로 참조) */
export interface ExportGroupDeviceRow {
  group_id: number;
  device_me: string;
  sort_order: number;
}

/** 내보내기 전용 앱 설정 */
export interface ExportAppSettingRow {
  key: string;
  value: string;
}

const APP_VERSION = '1.0.0';
const SCHEMA_VERSION = 1;

/**
 * 현재 DB의 설정 데이터를 ExportData JSON 문자열로 직렬화한다.
 */
export async function exportToJson(): Promise<string> {
  const repo = getSqliteRepository();

  // 1. Groups
  const groups: GroupRow[] = await repo.getGroups();
  const exportGroups: ExportGroupRow[] = groups.map((g) => ({
    group_id: g.group_id!,
    groupname: g.groupname,
    node: g.node,
    root_id: g.root_id,
    sort_order: g.sort_order,
    backimg: g.backimg ?? null,
  }));

  // 2. Devices (전체) — getAllDevices 사용
  const allDevices: DeviceRow[] = await repo.getAllDevices();
  const exportDevices: ExportDeviceRow[] = allDevices.map((d) => ({
    me: d.me,
    agt: d.agt,
    name: d.name,
    dev_type: d.dev_type,
    attribute: d.attribute,
  }));

  // 3. Group-Device 매핑 — getAllGroupDevices 사용
  const rawGd = await repo.getAllGroupDevices();
  // device_id → device_me 변환
  const deviceIdMap = new Map<number, string>();
  allDevices.forEach((d) => {
    if (d.id != null) deviceIdMap.set(d.id, d.me);
  });
  const exportGd: ExportGroupDeviceRow[] = rawGd
    .filter((gd) => deviceIdMap.has(gd.device_id))
    .map((gd) => ({
      group_id: gd.group_id,
      device_me: deviceIdMap.get(gd.device_id)!,
      sort_order: gd.sort_order,
    }));

  // 4. App Settings — getAllAppSettings 사용
  const rawSettings = await repo.getAllAppSettings();
  const exportSettings: ExportAppSettingRow[] = rawSettings.map((s) => ({
    key: s.key,
    value: s.value,
  }));

  const data: ExportData = {
    exported_at: new Date().toISOString(),
    app_version: APP_VERSION,
    schema_version: SCHEMA_VERSION,
    groups: exportGroups,
    devices: exportDevices,
    group_devices: exportGd,
    app_settings: exportSettings,
  };

  return JSON.stringify(data, null, 2);
}
