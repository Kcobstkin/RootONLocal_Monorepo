/**
 * 브랜드 설정 - common (범용 앱)
 *
 * 로고, 앱 이름, 테마 색상 등 브랜드 관련 설정
 */

export const BRAND = {
  /** 앱 표시 이름 */
  appName: 'Local Control',
  /** 앱 ID (Capacitor/Electron) */
  appId: 'com.rooton.localcontrol',
  /** 메인 테마 색상 (Tailwind class) */
  themeColor: 'bg-blue-600',
  /** 메인 테마 hover 색상 */
  themeColorHover: 'bg-blue-700',
  /** 사이드바 배경 */
  sidebarBg: 'bg-blue-800',
  /** 텍스트 강조 색상 */
  accentText: 'text-blue-600',
  /** 로고 경로 (public 폴더 기준) */
  logoPath: '/logo.svg',
  /** 파비콘 경로 */
  faviconPath: '/favicon.ico',
} as const;
