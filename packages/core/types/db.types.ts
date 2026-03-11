/** DB 관련 타입 정의 */

export interface StationRow {
  id?: number;
  lsid: string;
  name: string | null;
  ip: string;
  port: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface GroupRow {
  group_id?: number;
  groupname: string;
  node: number;          // 2=대그룹, 3=소그룹
  root_id: number;       // 소그룹일 때 부모 대그룹의 group_id
  sort_order: number;
  backimg: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GroupDeviceRow {
  id?: number;
  group_id: number;
  device_id: number;
  sort_order: number;
  created_at?: string;
}

export interface DashboardDeviceRow {
  id?: number;
  user_id: number;
  device_id: number;
  sort_order: number;
  created_at?: string;
}

export interface DeviceLogRow {
  id?: number;
  device_id: number;
  action: 'GET' | 'SET';
  payload: string | null;
  result: string | null;
  success: number;
  created_at?: string;
}

export interface AppSettingRow {
  key: string;
  value: string;
}
