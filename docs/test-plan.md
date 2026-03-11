# 테스트 계획서 — LocalControl 모노레포

> 작성일: 2026-03-11  
> 대상: `apps/common` (Windows Electron) + `apps/lgsb` (Android Capacitor)  
> 모든 비즈니스 로직은 `packages/core` 공유

---

## 목차

1. [테스트 진행 순서 (우선순위)](#1-테스트-진행-순서-우선순위)
2. [Phase A — 빌드 & 기동 검증](#2-phase-a--빌드--기동-검증)
3. [Phase B — 인증 & 세션](#3-phase-b--인증--세션)
4. [Phase C — Station Discovery & 연결](#4-phase-c--station-discovery--연결)
5. [Phase D — 구역(Group) 관리](#5-phase-d--구역group-관리)
6. [Phase E — 장치 목록 & 대시보드](#6-phase-e--장치-목록--대시보드)
7. [Phase F — 장치 제어 카드](#7-phase-f--장치-제어-카드)
8. [Phase G — 실시간 이벤트 (NOTIFY)](#8-phase-g--실시간-이벤트-notify)
9. [Phase H — 백업 / 복원](#9-phase-h--백업--복원)
10. [Phase I — 권한 & 보안](#10-phase-i--권한--보안)
11. [Phase J — 크로스 플랫폼 검증](#11-phase-j--크로스-플랫폼-검증)
12. [Phase K — 배포 패키징](#12-phase-k--배포-패키징)
13. [알려진 제약사항 & 주의점](#13-알려진-제약사항--주의점)

---

## 1. 테스트 진행 순서 (우선순위)

한번에 전체를 만들었으므로, **아래쪽이 위쪽에 의존**하는 구조입니다.  
반드시 **위에서 아래로** 순서대로 진행하세요.

```
Phase A  빌드 & 기동         ← 이것부터! 안 되면 아래 전부 불가
  ↓
Phase B  인증 & 세션         ← 로그인 안 되면 나머지 화면 진입 불가
  ↓
Phase C  Discovery & 연결   ← Station 없으면 장치 데이터 없음
  ↓
Phase D  구역 관리           ← 장치를 넣을 구역이 있어야 함
  ↓
Phase E  장치 목록           ← 장치가 보여야 제어 가능
  ↓
Phase F  장치 제어           ← 핵심 기능
  ↓
Phase G  실시간 이벤트       ← 제어 후 상태 반영 확인
  ↓
Phase H  백업 / 복원         ← 데이터가 있어야 의미 있음
  ↓
Phase I  권한 & 보안         ← 전체 기능 동작 후 권한 분리 검증
  ↓
Phase J  크로스 플랫폼       ← 두 번째 플랫폼(Android) 검증
  ↓
Phase K  배포 패키징         ← 최종 산출물
```

---

## 2. Phase A — 빌드 & 기동 검증

> **목적**: 프로젝트가 정상적으로 컴파일·실행되는지 확인

> ⚠️ **중요 — 웹 브라우저 접속은 UI 컴파일 확인용**  
> `localhost:5173/5174`는 Vite가 React UI를 컴파일하는 개발 서버입니다.  
> 브라우저에는 raw UDP가 없고 Electron IPC도 없으므로, **로그인 이후 기능(UDP, SQLite, 파일 I/O)은 동작하지 않습니다.**  
> **실질적인 기능 테스트는 반드시 Electron EXE 또는 Android APK로 진행하세요.**

### A-1. Vite 컴파일 확인 (UI 에러 여부 체크 전용)

| # | 테스트 항목 | 실행 명령 | 기대 결과 | Pass |
|---|-----------|----------|----------|------|
| A-1-1 | common 앱 컴파일 | `npm run dev:common` | `http://localhost:5173` 접속 시 로그인 화면 렌더링, **브라우저 콘솔 JS 에러 없음** (기능 동작은 확인 불가) | ☐ |
| A-1-2 | lgsb 앱 컴파일 | `npm run dev:lgsb` | `http://localhost:5174` 접속 시 로그인 화면 렌더링, 브라우저 콘솔 JS 에러 없음 | ☐ |

### A-2. TypeScript 컴파일

| # | 테스트 항목 | 실행 명령 | 기대 결과 | Pass |
|---|-----------|----------|----------|------|
| A-2-1 | core 패키지 타입 체크 | `cd packages/core && npx tsc --noEmit` | 에러 0개 | ☐ |
| A-2-2 | common Electron 타입 체크 | `cd apps/common && npx tsc -p tsconfig.electron.json --noEmit` | 에러 0개 | ☐ |
| A-2-3 | lgsb Electron 타입 체크 | `cd apps/lgsb && npx tsc -p tsconfig.electron.json --noEmit` | 에러 0개 | ☐ |

### A-3. Electron 기동 ← **실질적인 첫 번째 테스트**

> Electron으로 실행해야 SQLite·UDP·IPC가 모두 활성화됩니다.  
> Phase B 이후 모든 테스트는 **Electron EXE 또는 Android APK** 환경에서 진행하세요.

| # | 테스트 항목 | 실행 명령 | 기대 결과 | Pass |
|---|-----------|----------|----------|------|
| A-3-1 | common Electron 실행 | `npm run electron:common` | BrowserWindow 열림, 로그인 화면 표시 | ☐ |
| A-3-2 | lgsb Electron 실행 | `npm run electron:lgsb` | BrowserWindow 열림, 초록 테마 로그인 화면 | ☐ |
| A-3-3 | DB 초기화 로그 | DevTools 콘솔 확인 | `[SqliteElectron]` 또는 DB 초기화 관련 로그 출력 | ☐ |

---

## 3. Phase B — 인증 & 세션

> **목적**: 로그인/로그아웃/세션 복원이 정상 동작하는지 확인  
> **사전조건**: Phase A 통과, 시드 계정 3개 존재

### 시드 계정

| 아이디 | 비밀번호 | 권한 레벨 | 역할 |
|--------|---------|----------|------|
| `admin@local` | `admin1234` | 1 (최고 관리자) | 모든 기능 접근 |
| `manager@local` | `manager1234` | 5 (매니저) | 구역·장치 관리 가능 |
| `user@local` | `user1234` | 10 (일반 사용자) | 제어만 가능 |

### 테스트 케이스

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| B-1 | 관리자 로그인 | `admin@local` / `admin1234` 입력 → 로그인 | 대시보드(`/`) 이동, 사이드바에 사용자명 표시 | ☐ |
| B-2 | 일반 사용자 로그인 | `user@local` / `user1234` 입력 → 로그인 | 대시보드 이동 | ☐ |
| B-3 | 잘못된 비밀번호 | `admin@local` / `wrong` 입력 | 에러 메시지 표시, 로그인 안 됨 | ☐ |
| B-4 | 존재하지 않는 계정 | `nobody@local` / `test` 입력 | 에러 메시지 표시 | ☐ |
| B-5 | 빈 필드 제출 | 아이디 또는 비밀번호 비워두고 제출 | 로그인 버튼 비활성화 또는 에러 표시 | ☐ |
| B-6 | 로그아웃 | 사이드바 하단 `로그아웃` 클릭 | `/login` 이동, 인증 상태 해제 | ☐ |
| B-7 | 세션 복원 | 로그인 후 앱 종료 → 재실행 | 자동 로그인, 대시보드 바로 표시 | ☐ |
| B-8 | 세션 유효하지 않음 | localStorage에서 세션 수동 삭제 → 새로고침 | `/login` 리다이렉트 | ☐ |
| B-9 | 비인증 접근 차단 | 로그인 안 한 상태에서 `/` 직접 접근 | `/login` 리다이렉트 | ☐ |

---

## 4. Phase C — Station Discovery & 연결

> **목적**: LifeSmart Station UDP 탐색 및 활성 Station 설정  
> **사전조건**: Phase B 통과, 동일 네트워크에 LifeSmart Station 1대 이상 존재  
> **⚠️ Station이 없으면 이 Phase는 실제 테스트 불가 → Phase D로 건너뛰기**

### 테스트 케이스

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| C-1 | 자동 Discovery | 앱 기동 후 대시보드 진입 | `Z-SEARCH` 브로드캐스트(포트 12345) → Station 응답 수신 → DB 저장 | ☐ |
| C-2 | Station 목록 확인 | 발견된 Station 정보 확인 | `lsid`, `ip`, `port(12348)` 정상 표시 | ☐ |
| C-3 | 활성 Station 설정 | Station 선택/활성화 | `is_active=1` 설정, 다른 Station `is_active=0` | ☐ |
| C-4 | 장치 목록 가져오기 | 활성 Station 설정 후 | `eps GET` 요청 → Station의 전체 장치 목록 수신, DB에 upsert | ☐ |
| C-5 | Station 미발견 | Station이 없는 네트워크에서 | 타임아웃 후 에러 없이 빈 목록, 사용자 안내 메시지 | ☐ |
| C-6 | 네트워크 변경 | Wi-Fi 변경 후 재탐색 | 새 네트워크의 Station 발견 | ☐ |

### UDP 통신 검증 포인트

```
[앱]  --→  255.255.255.255:12345  "Z-SEARCH * \r\n"
[앱]  ←--  Station IP:12346       Discovery 응답 JSON
[앱]  --→  Station IP:12348       eps GET 패킷 (10B 헤더 + JSON body)
[앱]  ←--  Station IP:12348       eps GET_REPLY 패킷
```

---

## 5. Phase D — 구역(Group) 관리

> **목적**: 대그룹/소그룹 CRUD 및 Sidebar 트리 반영  
> **사전조건**: Phase B 통과, 관리자 계정 로그인

### 테스트 케이스

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| D-1 | 대그룹 생성 | 구역 설정 → 대그룹 추가 → "1층" 입력 → 저장 | 사이드바에 "1층" 대그룹 표시 | ☐ |
| D-2 | 소그룹 생성 | "1층" 하위에 소그룹 추가 → "로비" 입력 → 저장 | "1층" 펼치면 "로비" 소그룹 표시 | ☐ |
| D-3 | 대그룹 이름 변경 | "1층" → "Ground Floor" 수정 | 사이드바 반영 | ☐ |
| D-4 | 소그룹 삭제 | "로비" 소그룹 삭제 | 소그룹 제거, 사이드바에서 사라짐 | ☐ |
| D-5 | 대그룹 삭제 | "1층" 대그룹 삭제 | 대그룹 + 하위 소그룹 모두 삭제, 관련 group_devices도 삭제 | ☐ |
| D-6 | 빈 이름 방지 | 그룹명 비운 채 저장 | 유효성 검사 에러 표시 | ☐ |
| D-7 | 사이드바 접기/펼치기 | 대그룹 클릭 | 소그룹 목록 토글 | ☐ |
| D-8 | 소그룹 네비게이션 | 소그룹 "로비" 클릭 | `/controls/:groupId`로 이동, GroupScreen 표시 | ☐ |

---

## 6. Phase E — 장치 목록 & 대시보드

> **목적**: 장치 카드 그리드, 장치 추가/삭제 검증  
> **사전조건**: Phase C 통과 (장치 데이터 필요), Phase D 통과 (구역 존재)

### 대시보드 테스트

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| E-1 | 대시보드 빈 상태 | 장치 미추가 상태에서 대시보드 진입 | 빈 상태 안내 메시지 표시 | ☐ |
| E-2 | 장치 추가 | 관리자 → [장치 추가] → Station 장치 목록에서 선택 → 추가 | 대시보드에 DeviceCard 표시 | ☐ |
| E-3 | 장치 검색 필터 | AddDeviceModal에서 검색어 입력 | 장치 이름으로 필터링 | ☐ |
| E-4 | 이미 추가된 장치 | 이미 대시보드에 있는 장치 | 모달에서 비활성(disabled) 표시 | ☐ |
| E-5 | 장치 삭제 | 관리자 → [삭제 모드] → 장치 카드 클릭 → 삭제 | 대시보드에서 제거 | ☐ |
| E-6 | 반응형 그리드 | 브라우저 크기 조절 | 모바일 2열, 데스크톱 3열 | ☐ |

### 구역(GroupScreen) 테스트

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| E-7 | 그룹 장치 추가 | 소그룹 진입 → [장치 추가] → 선택 → 추가 | 그룹 화면에 장치 카드 표시 | ☐ |
| E-8 | 그룹 장치 삭제 | [삭제 모드] → 장치 선택 → 삭제 | 그룹에서 제거 (장치 자체는 유지) | ☐ |
| E-9 | 그룹 전환 | 사이드바에서 다른 소그룹 클릭 | 해당 그룹 장치만 표시, 삭제 모드 초기화 | ☐ |

---

## 7. Phase F — 장치 제어 카드

> **목적**: 각 장치 타입별 제어 UI 및 `ep SET` 명령 전송 검증  
> **사전조건**: Phase E 통과, 활성 Station + 실제 장치 연결  
> **⚠️ 실물 장치 없으면 UDP 패킷 전송 여부만 DevTools Network에서 확인**

### F-1. 에어컨 (AcRemoteCard)

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| F-1-1 | 전원 토글 | 전원 버튼 클릭 | `ep SET { idx:232, type:"0xCF", val:1/0 }` 전송 | ☐ |
| F-1-2 | 온도 조절 | +/- 버튼 | 16~30°C 범위, `temp` 파라미터 변경 | ☐ |
| F-1-3 | 온도 범위 제한 | 16 미만, 30 초과 시도 | 범위 클램핑, 넘어가지 않음 | ☐ |
| F-1-4 | 모드 변경 | 모드 버튼 순환 클릭 | 자동(0)→냉방(1)→제습(2)→송풍(3)→난방(4)→자동 | ☐ |
| F-1-5 | 풍량 변경 | 풍량 버튼 순환 클릭 | 0→1→2→3→0 순환 | ☐ |

### F-2. 블라인드 (BlindCard)

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| F-2-1 | 열기 | 열기 버튼 | `ep SET { idx:0, type:"0x62", val:0 }` | ☐ |
| F-2-2 | 닫기 | 닫기 버튼 | `ep SET { idx:0, type:"0x62", val:1 }` | ☐ |
| F-2-3 | 정지 | 정지 버튼 | `ep SET { idx:0, type:"0x62", val:2 }` | ☐ |
| F-2-4 | 위치 슬라이더 | 슬라이더 50%로 이동 | `val:50` 전송 | ☐ |
| F-2-5 | 블라인드 타입 표시 | attribute 기반 | 롤/좌커텐/우커텐/양커텐 텍스트 표시 | ☐ |

### F-3. 조명 (LightCard)

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| F-3-1 | 전원 토글 | 전원 버튼 | `ep SET { idx:0, type:"0x01", val:0/1 }` | ☐ |
| F-3-2 | 밝기 슬라이더 | 50%로 조절 | `brightness:50` 전송 | ☐ |
| F-3-3 | 밝기 범위 | 1~100% | 0 이하/100 초과 불가 | ☐ |
| F-3-4 | 색온도 슬라이더 | RGBW/COLOR/CT 타입만 | `colortemp:4000` 전송 (2700~6500K) | ☐ |
| F-3-5 | 색온도 미지원 장치 | 일반 SPOT 타입 | 색온도 슬라이더 숨김 | ☐ |

### F-4. 3구 스위치 (BlendSwitchCard)

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| F-4-1 | 채널 1 ON | 1번 버튼 | `ep SET { idx:0, type:"0x01", val:1 }` | ☐ |
| F-4-2 | 채널 2 OFF | 2번 버튼 OFF | `ep SET { idx:1, type:"0x01", val:0 }` | ☐ |
| F-4-3 | 채널 3 토글 | 3번 버튼 | `ep SET { idx:2, type:"0x01", val:0/1 }` | ☐ |
| F-4-4 | 채널 상태 표시 | 각 채널 ON/OFF 시각 표시 | 초록(ON)/회색(OFF) 또는 유사한 UI 구분 | ☐ |

### F-5. UnknownCard

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| F-5-1 | 미지원 devtype | 매핑 안 되는 devtype 장치 | "알 수 없는 장치 타입" 표시, 에러 없음 | ☐ |

---

## 8. Phase G — 실시간 이벤트 (NOTIFY)

> **목적**: 외부에서 장치 상태 변경 시 앱이 실시간 반영하는지 검증  
> **사전조건**: Phase F 통과, Station 연결 상태

### 테스트 케이스

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| G-1 | 이벤트 리스너 등록 | 앱 기동 후 활성 Station 존재 | `config SET` 전송 → Station이 NOTIFY 대상 등록 | ☐ |
| G-2 | NOTIFY 수신 | 물리 스위치로 조명 ON | 포트 12346에서 NOTIFY 패킷 수신, DeviceStore 상태 업데이트 | ☐ |
| G-3 | UI 반영 | NOTIFY 수신 후 | 해당 장치 카드의 상태(전원/밝기 등) 즉시 갱신 | ☐ |
| G-4 | 리스너 정리 | 화면 이탈 또는 앱 종료 | `udp:stopListen` 호출, 리소스 해제 | ☐ |

---

## 9. Phase H — 백업 / 복원

> **목적**: DB 설정 내보내기/불러오기 검증  
> **사전조건**: Phase D + E 통과 (구역·장치 데이터 존재), 관리자 계정

### 테스트 케이스

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| H-1 | 내보내기 (Electron) | 설정 → 백업/복원 → 설정 내보내기 | 파일 저장 대화상자 → JSON 파일 저장 | ☐ |
| H-2 | 내보내기 JSON 검증 | 저장된 파일 열기 | `exported_at`, `groups`, `devices`, `group_devices`, `app_settings` 필드 존재 | ☐ |
| H-3 | 내보내기 제외 항목 | JSON 파일 검사 | `users`, `stations`, `device_logs` 미포함 (보안·재탐색·이력) | ☐ |
| H-4 | 불러오기 - 미리보기 | 파일 선택 → JSON 로드 | 구역 수, 장치 수, 매핑 수, 설정 수 미리보기 표시 | ☐ |
| H-5 | 불러오기 - 병합 모드 | "병합" 선택 → 확인 | 기존 데이터 유지 + 새 데이터 UPSERT | ☐ |
| H-6 | 불러오기 - 덮어쓰기 모드 | "덮어쓰기" 선택 → 확인 | 기존 구역·장치·설정 삭제 후 파일 데이터로 대체 | ☐ |
| H-7 | 불러오기 후 새로고침 | 불러오기 완료 | 1.5초 후 자동 새로고침, 사이드바·대시보드 반영 | ☐ |
| H-8 | 잘못된 파일 | `.txt` 파일 또는 빈 JSON 선택 | 에러 메시지: "유효하지 않은 파일" | ☐ |
| H-9 | 크로스 기기 이전 | PC에서 내보내기 → 다른 PC/Android에서 불러오기 | 동일 설정 복원 | ☐ |

---

## 10. Phase I — 권한 & 보안

> **목적**: `user_level` 기반 접근 제어 검증  
> **사전조건**: 모든 기능 동작 확인 완료

### 권한 레벨 매트릭스

| 기능 | admin (1) | manager (5) | user (10) |
|------|:---------:|:-----------:|:---------:|
| 대시보드 접근 | ✅ | ✅ | ✅ |
| 장치 제어 | ✅ | ✅ | ✅ |
| 장치 추가/삭제 | ✅ | ✅ | ❌ |
| 구역 설정 메뉴 | ✅ | ✅ | ❌ |
| 백업/복원 메뉴 | ✅ | ✅ | ❌ |
| 구역 CRUD | ✅ | ✅ | ❌ |

### 테스트 케이스

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| I-1 | admin 전체 접근 | admin 로그인 후 모든 메뉴 확인 | ⚙ 구역 설정, 💾 백업/복원, 장치 추가/삭제 버튼 모두 표시 | ☐ |
| I-2 | user 메뉴 제한 | user@local 로그인 | 구역 설정·백업/복원 메뉴 숨김, 장치 추가/삭제 버튼 없음 | ☐ |
| I-3 | user URL 직접 접근 | user 로그인 상태에서 `/settings/groups` 직접 입력 | 접근 차단 (리다이렉트 또는 권한 없음 표시) | ☐ |
| I-4 | user URL 직접 접근 2 | user 로그인 상태에서 `/settings/backup` 직접 입력 | 접근 차단 | ☐ |
| I-5 | user 장치 제어 가능 | user 로그인 → 대시보드 장치 카드 | 제어 UI 동작 (전원 토글, 슬라이더 등) | ☐ |
| I-6 | contextIsolation 확인 | Electron DevTools에서 `require` 시도 | `require is not defined` (Node API 격리 확인) | ☐ |
| I-7 | SHA-256 해시 저장 | DB `users` 테이블 검사 | 비밀번호가 평문이 아닌 64자 hex 해시 | ☐ |

---

## 11. Phase J — 크로스 플랫폼 검증

> **목적**: common/lgsb 앱 + Electron/Capacitor 플랫폼 조합 검증

### J-1. 앱 브랜드 검증

| # | 테스트 항목 | common | lgsb | Pass |
|---|-----------|--------|------|------|
| J-1-1 | 앱 이름 | "Local Control" | "LGSB Control" | ☐ |
| J-1-2 | 테마 색상 | 파란색 (`bg-blue-600`) | 초록색 (`bg-green-600`) | ☐ |
| J-1-3 | 로그인 화면 색상 | 파란 버튼/테두리 | 초록 버튼/테두리 | ☐ |

### J-2. 플랫폼별 기능 검증

| # | 테스트 항목 | Electron | Capacitor | Pass |
|---|-----------|----------|-----------|------|
| J-2-1 | 플랫폼 감지 | `detectPlatform()` → `'electron'` | `detectPlatform()` → `'android'` | ☐ |
| J-2-2 | SQLite 구현체 | `SqliteElectron` (better-sqlite3 IPC) | `SqliteAndroid` (Capacitor plugin) | ☐ |
| J-2-3 | UDP 구현체 | `UdpElectron` (Node dgram IPC) | `UdpAndroid` (Java DatagramSocket) | ☐ |
| J-2-4 | 파일 내보내기 | `dialog.showSaveDialog` | Blob 다운로드 | ☐ |
| J-2-5 | 파일 불러오기 | `dialog.showOpenDialog` | `<input type="file">` | ☐ |

### J-3. Android 고유 테스트

| # | 테스트 항목 | 절차 | 기대 결과 | Pass |
|---|-----------|------|----------|------|
| J-3-1 | APK 설치 | release APK 빌드 → 설치 | 정상 설치, 앱 실행 | ☐ |
| J-3-2 | 네트워크 권한 | 앱 실행 후 UDP 통신 | INTERNET, ACCESS_WIFI_STATE 권한 동작 | ☐ |
| J-3-3 | 멀티캐스트 권한 | Discovery 브로드캐스트 | CHANGE_WIFI_MULTICAST_STATE 동작 | ☐ |
| J-3-4 | 앱 백그라운드/포그라운드 | 앱 전환 후 복귀 | 상태 유지, 리스너 재등록 | ☐ |

---

## 12. Phase K — 배포 패키징

> **목적**: 최종 배포 산출물 생성 및 설치 검증

### 테스트 케이스

| # | 테스트 항목 | 실행 명령 | 기대 결과 | Pass |
|---|-----------|----------|----------|------|
| K-1 | common EXE 빌드 | `npm run electron:build:common` | `apps/common/dist-electron/LocalControl Setup *.exe` 생성 | ☐ |
| K-2 | lgsb EXE 빌드 | `npm run electron:build:lgsb` | `apps/lgsb/dist-electron/LGSBControl Setup *.exe` 생성 | ☐ |
| K-3 | EXE 설치 | 생성된 `.exe` 실행 | NSIS 인스톨러 → 설치 경로 선택 → 설치 완료 | ☐ |
| K-4 | 설치된 앱 실행 | 바탕화면/시작메뉴 바로가기 | 앱 정상 실행, 로그인 화면 표시 | ☐ |
| K-5 | 앱 제거 | 프로그램 추가/제거 | 정상 언인스톨, 잔여 파일 없음 | ☐ |
| K-6 | common APK 빌드 | `npm run apk:common` | `app-release.apk` 생성 | ☐ |
| K-7 | lgsb APK 빌드 | `npm run apk:lgsb` | `app-release.apk` 생성 | ☐ |
| K-8 | 전체 빌드 | `npm run release:all` | common + lgsb EXE 모두 생성 | ☐ |

---

## 13. 알려진 제약사항 & 주의점

### 테스트 환경 요구사항
- **LifeSmart Station**: 실물 기기가 같은 로컬 네트워크에 있어야 Phase C, F, G 테스트 가능
- **AP Isolation**: 기업 Wi-Fi에서 브로드캐스트가 차단될 수 있음 → AP isolation 해제 필요
- **시간 동기화**: Station과 앱의 시간 차이가 5분 초과 시 서명이 invalid 처리됨

### Station 없이 테스트 가능한 범위
Station이 없어도 다음은 테스트 가능합니다:
- ✅ Phase A (빌드 & 기동)
- ✅ Phase B (인증 & 세션)
- ✅ Phase D (구역 관리) — DB만 사용
- ✅ Phase H (백업/복원) — 수동으로 구역 생성 후 내보내기/불러오기
- ✅ Phase I (권한) — UI 숨김/표시 확인
- ✅ Phase J-1 (브랜드 검증)
- ✅ Phase K (빌드 패키징)

### 에어컨 devtype 주의
에어컨은 `SL_NATURE`, `OD_WE_IRAC`, `SL_CP_DN` 등 다양한 devtype이 존재합니다.  
실제 Station 응답의 devtype을 확인한 후, `getDeviceCategory()` 매핑이 올바른지 확인하세요.

### 3구 스위치 채널 파싱
`BlendSwitchCard`는 `stat.channels[]`, `stat.ch1/ch2/ch3`, `stat.P1/P2/P3` 세 가지 형식을 지원합니다.  
실물 기기의 실제 stat 구조에 맞는지 확인이 필요합니다.

---

## 체크리스트 요약

| Phase | 항목 수 | 핵심 의존성 | Station 필요 |
|-------|---------|-----------|:----------:|
| A. 빌드 & 기동 | 7 | — | ❌ |
| B. 인증 & 세션 | 9 | Phase A | ❌ |
| C. Discovery | 6 | Phase B | ✅ |
| D. 구역 관리 | 8 | Phase B | ❌ |
| E. 장치 목록 | 9 | Phase C, D | ✅ |
| F. 장치 제어 | 17 | Phase E | ✅ |
| G. 실시간 이벤트 | 4 | Phase F | ✅ |
| H. 백업/복원 | 9 | Phase D, E | ❌ |
| I. 권한 & 보안 | 7 | 전체 | ❌ |
| J. 크로스 플랫폼 | 9 | 전체 | 부분 |
| K. 배포 패키징 | 8 | Phase A | ❌ |
| **합계** | **93** | | |
