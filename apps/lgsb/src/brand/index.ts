/**
 * 브랜드 설정 - lgsb (고객 전용 앱)
 *
 * 로고, 앱 이름, 테마 색상 등 LGSB 고객 전용 브랜드 설정
 */

export const BRAND = {
  /** 앱 표시 이름 */
  appName: 'LGSB Control',
  /** 앱 ID (Capacitor/Electron) */
  appId: 'com.rooton.lgsb',
  /** 메인 테마 색상 (Tailwind class) */
  themeColor: 'bg-green-600',
  /** 메인 테마 hover 색상 */
  themeColorHover: 'bg-green-700',
  /** 사이드바 배경 */
  sidebarBg: 'bg-green-800',
  /** 텍스트 강조 색상 */
  accentText: 'text-green-600',
  /** 로고 경로 (public 폴더 기준) */
  logoPath: '/logo.svg',
  /** 파비콘 경로 */
  faviconPath: '/favicon.ico',
} as const;
