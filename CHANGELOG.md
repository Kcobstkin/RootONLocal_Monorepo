# Changelog

모든 주요 변경사항은 이 파일에 기록됩니다.

## [1.0.0] - 2025-01-01

### 추가
- 모노레포 기반 프로젝트 구조 (common + lgsb)
- Electron(Windows) + Capacitor(Android) 플랫폼 지원
- SHA-256 기반 로컬 인증 시스템
- LifeSmart Station UDP Discovery (포트 12345)
- 2-level 구역 관리 (대그룹/소그룹)
- 대시보드 디바이스 그리드
- 디바이스 제어 카드: 에어컨, 블라인드, 조명, 3구 스위치
- UDP 이벤트 리스너 (NOTIFY 수신, 실시간 상태 업데이트)
- 앱별 브랜드 설정 (common=블루, lgsb=그린)
- Capacitor Android: SQLite + UDP 플러그인
- DB 설정 내보내기/불러오기 (JSON)
- Windows NSIS 인스톨러 빌드
- Android release APK 빌드

### 보안
- contextIsolation + preload 기반 Electron IPC
- SHA-256 비밀번호 해싱
- 로컬 네트워크 전용 (인터넷 불필요)
