/** 장치 관련 타입 정의 */

export interface DeviceRow {
  id?: number;
  station_id: number;
  me: string;
  agt: string | null;
  name: string;
  dev_type: string;
  attribute: string | null;  // JSON string
  last_stat: string | null;  // JSON string
  created_at?: string;
  updated_at?: string;
}

/** 장치 상태 (파싱된) */
export interface DeviceStatus {
  power?: number;        // 0 | 1
  mode?: number;         // 에어컨 모드 0~4
  temp?: number;         // 에어컨 설정 온도
  wind?: number;         // 에어컨 풍량 0~3
  brightness?: number;   // 조명 밝기 1~100
  colortemp?: number;    // 색온도 2700~6500
  position?: number;     // 블라인드 위치 0~100
  channels?: number[];   // 3구 스위치 채널 상태 [0|1, 0|1, 0|1]
}

/** devtype 패턴에 따른 장치 카테고리 */
export type DeviceCategory = 'ac' | 'blind' | 'light' | 'switch3' | 'unknown';

/** devtype → 카테고리 매핑 함수 */
export function getDeviceCategory(devType: string): DeviceCategory {
  const upper = devType.toUpperCase();
  if (upper.includes('IRAC') || upper.includes('AC')) return 'ac';
  if (upper.includes('BLIND') || upper.includes('CURT') || upper.includes('P_SW')) return 'blind';
  if (upper.includes('SPOT') || upper.includes('LIGHT') || upper.includes('RGBW')) return 'light';
  if (upper === 'SL_NATURE') return 'switch3';
  return 'unknown';
}
