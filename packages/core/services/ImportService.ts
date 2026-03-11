/**
 * ImportService - JSON 설정 데이터를 DB에 반영
 *
 * 불러오기 정책:
 *  - merge: 기존 DB에 병합 (UPSERT)
 *  - overwrite: 기존 데이터 초기화 후 덮어쓰기
 */

import type { ExportData, ExportGroupRow, ExportDeviceRow } from './ExportService';
import { getSqliteRepository } from '../platform';

export type ImportMode = 'merge' | 'overwrite';

/** 불러오기 미리보기 정보 */
export interface ImportPreview {
  valid: boolean;
  error?: string;
  groupCount: number;
  deviceCount: number;
  groupDeviceCount: number;
  settingCount: number;
  exportedAt: string;
  appVersion: string;
}

/**
 * JSON 문자열을 파싱하고 유효성 검사 후 미리보기 정보를 반환한다.
 */
export function previewImportData(jsonStr: string): ImportPreview {
  try {
    const data = JSON.parse(jsonStr) as ExportData;

    if (!data.groups || !data.devices) {
      return {
        valid: false,
        error: '유효하지 않은 내보내기 파일입니다. groups/devices 필드가 없습니다.',
        groupCount: 0,
        deviceCount: 0,
        groupDeviceCount: 0,
        settingCount: 0,
        exportedAt: '',
        appVersion: '',
      };
    }

    return {
      valid: true,
      groupCount: data.groups.length,
      deviceCount: data.devices.length,
      groupDeviceCount: data.group_devices?.length ?? 0,
      settingCount: data.app_settings?.length ?? 0,
      exportedAt: data.exported_at ?? '알 수 없음',
      appVersion: data.app_version ?? '알 수 없음',
    };
  } catch {
    return {
      valid: false,
      error: 'JSON 파싱 실패: 올바른 내보내기 파일이 아닙니다.',
      groupCount: 0,
      deviceCount: 0,
      groupDeviceCount: 0,
      settingCount: 0,
      exportedAt: '',
      appVersion: '',
    };
  }
}

/**
 * JSON 데이터를 DB에 반영한다.
 *
 * @param jsonStr  내보내기 JSON 문자열
 * @param mode     'merge' | 'overwrite'
 */
export async function importFromJson(jsonStr: string, mode: ImportMode): Promise<void> {
  const data = JSON.parse(jsonStr) as ExportData;
  const repo = getSqliteRepository();

  if (mode === 'overwrite') {
    // 기존 데이터 초기화
    await repo.clearExportableTables();
  }

  // 1. Groups — group_id 매핑 (기존 id → 새 id)
  const groupIdMap = new Map<number, number>();
  for (const g of data.groups ?? []) {
    // 대그룹(node=2)을 먼저, 소그룹(node=3)을 나중에 처리해야 root_id 참조 가능
    if (g.node === 2) {
      const created = await repo.createGroup({
        groupname: g.groupname,
        node: g.node,
        root_id: 0,
        sort_order: g.sort_order,
        backimg: g.backimg ?? null,
      });
      groupIdMap.set(g.group_id, created.group_id!);
    }
  }
  // 소그룹
  for (const g of data.groups ?? []) {
    if (g.node === 3) {
      const newRootId = groupIdMap.get(g.root_id) ?? g.root_id;
      const created = await repo.createGroup({
        groupname: g.groupname,
        node: g.node,
        root_id: newRootId,
        sort_order: g.sort_order,
        backimg: g.backimg ?? null,
      });
      groupIdMap.set(g.group_id, created.group_id!);
    }
  }

  // 2. Devices — station_id는 현재 활성 스테이션 사용
  const stations = await repo.getStations();
  const activeStation = stations.find((s) => s.is_active === 1);
  const stationId = activeStation?.id ?? 1;

  const deviceMeToIdMap = new Map<string, number>();
  for (const d of data.devices ?? []) {
    await repo.upsertDevice({
      station_id: stationId,
      me: d.me,
      agt: d.agt,
      name: d.name,
      dev_type: d.dev_type,
      attribute: d.attribute,
      last_stat: null,
    } as unknown as import('../types/device.types').DeviceRow);
  }

  // device_me → device_id 매핑 재구성
  const allDevices = await repo.getAllDevices();
  allDevices.forEach((dev) => {
    if (dev.id != null) {
      deviceMeToIdMap.set(dev.me, dev.id);
    }
  });

  // 3. Group-Device 매핑
  for (const gd of data.group_devices ?? []) {
    const newGroupId = groupIdMap.get(gd.group_id) ?? gd.group_id;
    const deviceId = deviceMeToIdMap.get(gd.device_me);
    if (deviceId != null) {
      await repo.addDeviceToGroup(newGroupId, deviceId);
    }
  }

  // 4. App Settings
  for (const s of data.app_settings ?? []) {
    await repo.setSetting(s.key, s.value);
  }
}
