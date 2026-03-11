# Local UDP 장치 제어 앱 기획서

> 버전: 2.0 / 작성일: 2026-03-10  
> 배포 대상: **Android APK**, **Windows 실행파일(.exe)**  
> 언어: **React TypeScript**  
> 로컬 DB: **SQLite**  
> 통신: **Local UDP (LifeSmart Local Protocol)**  
> 모노레포: **common** (범용) / **lgsb** (고객 전용)

---

## 1. 프로젝트 개요

### 1.1 목적
기존 LifeSmart 클라우드 기반 웹사이트의 핵심 장치 제어 기능을 추출하여,  
**인터넷 없이 사내 LAN 안에서** Smart Station과 직접 UDP 통신으로 장치를 제어하는 크로스플랫폼 앱을 만든다.

### 1.2 1차 제어 대상 장치
| 장치 | 영문 키 | 비고 |
|------|---------|------|
| 에어컨 | `AcRemote` | 전원/온도/모드/풍량 |
| 블라인드/커튼 | `BlindControl` | 열기/닫기/일시정지/위치값 |
| 조명 | `Light` / `LightSmall` | 전원/밝기/색온도 |
| Blend 스위치 3구 | `LivingRoomNatureSwitch3` | 3개 채널 개별 전원 ON/OFF |

---

## 2. 기술 스택

### 2.1 공통 코어
| 항목 | 선택 | 이유 |
|------|------|------|
| UI 프레임워크 | React 18 + TypeScript | 기존 코드베이스와 동일 |
| 빌드 도구 | Vite | 빠른 HMR, 기존 프로젝트 동일 |
| 스타일 | Tailwind CSS v3 | 기존 코드베이스와 동일 |
| 상태 관리 | Zustand | 경량, 기존 코드베이스와 동일 |
| SQLite | 플랫폼별 분기 (아래 참고) | - |
| 암호화 | crypto-js 또는 Web Crypto API | MD5 서명 생성 |

### 2.2 Android APK
| 항목 | 선택 |
|------|------|
| 네이티브 브릿지 | **Capacitor v6** |
| UDP 통신 | Capacitor 커스텀 플러그인 (Java/Kotlin `DatagramSocket`) |
| SQLite | `@capacitor-community/sqlite` |
| 빌드 | Gradle → APK |

### 2.3 Windows 실행파일
| 항목 | 선택 |
|------|------|
| 네이티브 쉘 | **Electron v30** |
| UDP 통신 | Node.js built-in `dgram` 모듈 (IPC via preload) |
| SQLite | `better-sqlite3` (Native Node addon) |
| 빌드 | `electron-builder` → `.exe` NSIS installer |

> **왜 Electron + Capacitor 분리인가?**  
> 윈도우에서는 Node.js dgram 이 UDP를 완전 지원하고 better-sqlite3 이 성능이 우수하다.  
> 안드로이드에서는 브라우저 WebView가 UDP raw socket을 지원하지 않으므로 Capacitor 네이티브 플러그인이 필수다.  
> 두 플랫폼 모두 React 코어(UI + 비즈니스 로직)는 100% 공유한다.

---

## 3. 시스템 아키텍처

```
┌──────────────────────────────────────────────────────┐
│                    React UI Layer                    │
│  (AcRemoteControl / BlindControl / LightControl)    │
└────────────────────────┬─────────────────────────────┘
                         │ Hooks / Services
┌────────────────────────▼─────────────────────────────┐
│              Device Service Layer (TS)               │
│   IDeviceGateway interface                           │
│   ├─ DeviceService (useDevice hook)                  │
│   ├─ SignatureBuilder (Local MD5 sign)               │
│   └─ DiscoveryService (Smart Station 탐색)           │
└────────┬──────────────────────────────┬──────────────┘
         │ IUdpTransport                │ ISqliteRepository
┌────────▼────────┐          ┌──────────▼───────────────┐
│  UDP Transport  │          │  SQLite Repository        │
│  (플랫폼 추상화)│          │  (플랫폼 추상화)          │
│                 │          │                           │
│ Android:        │          │ Android:                  │
│  Capacitor      │          │  @capacitor-community/    │
│  UDP Plugin     │          │  sqlite                   │
│                 │          │                           │
│ Windows:        │          │ Windows:                  │
│  Electron IPC   │          │  better-sqlite3           │
│  → Node dgram   │          │  (Electron main process)  │
└────────┬────────┘          └──────────────────────────┘
         │ UDP 12345 / 12346 / 12348
┌────────▼────────────────────┐
│  Smart Station (LAN)        │
│  LifeSmart Local Protocol   │
└─────────────────────────────┘
```

---

## 4. 디렉토리 구조

> **npm workspaces 기반 모노레포** 구조를 사용한다.  
> `apps/common` (범용) 과 `apps/lgsb` (고객 전용) 두 앱을 생성하되,  
> 비즈니스 로직·서비스·플랫폼 추상화는 `packages/core` 에 공유한다.

```
local-control-app/   (모노레포 루트)
├── package.json                    # workspaces: ["apps/*", "packages/*"]
├── tsconfig.base.json              # 공용 TS 설정
├── .env.production                 # 빌드타임 변수 (model, token, station IP)
│
├── apps/
│   ├── common/                     # 범용 앱 (기본 브랜드)
│   │   ├── package.json            # name: "localcontrol-common"
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── capacitor.config.ts
│   │   ├── electron-builder.yml
│   │   ├── android/                # Capacitor 안드로이드 프로젝트
│   │   ├── electron/               # Electron main process
│   │   │   ├── main.ts
│   │   │   ├── preload.ts
│   │   │   ├── udp.ts
│   │   │   └── db.ts
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── brand/              # 로고, 앱 이름, 테마 색상 (앱별 차이)
│   │   │   └── config/
│   │   │       └── appConfig.ts    # common 전용 빌드타임 설정
│   │   └── public/
│   │
│   └── lgsb/                       # 고객 전용 앱 (브랜드/설정만 다름)
│       ├── package.json            # name: "localcontrol-lgsb"
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── capacitor.config.ts
│       ├── electron-builder.yml
│       ├── android/
│       ├── electron/
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── brand/              # lgsb 전용 로고/색상
│       │   └── config/
│       │       └── appConfig.ts    # lgsb 전용 빌드타임 설정
│       └── public/
│
└── packages/
    ├── core/                       # 공유 비즈니스 로직 (두 앱 모두 import)
    │   ├── package.json            # name: "@localcontrol/core"
    │   ├── tsconfig.json
    │   ├── types/
    │   │   ├── device.types.ts
    │   │   ├── protocol.types.ts
    │   │   ├── auth.types.ts
    │   │   └── db.types.ts
    │   ├── services/
    │   │   ├── IUdpTransport.ts
    │   │   ├── ISqliteRepository.ts
    │   │   ├── DiscoveryService.ts
    │   │   ├── SignatureBuilder.ts
    │   │   ├── LocalGateway.ts
    │   │   ├── AuthService.ts       # 로컬 로그인/세션 관리
    │   │   └── EventListener.ts
    │   ├── store/
    │   │   ├── useAuthStore.ts       # 인증 상태 (로그인 여부, 현재 사용자)
    │   │   ├── useStationStore.ts
    │   │   ├── useDeviceStore.ts
    │   │   ├── useGroupStore.ts      # 대그룹(node=2)/소그룹(node=3) 트리 상태 관리
    │   │   └── useSettingsStore.ts
    │   ├── hooks/
    │   │   ├── useAuth.ts
    │   │   ├── useDiscovery.ts
    │   │   ├── useDevice.ts
    │   │   ├── useGroup.ts
    │   │   └── useEventListener.ts
    │   ├── layout/
    │   │   ├── AppLayout.tsx
    │   │   └── Sidebar.tsx
    │   ├── screens/
    │   │   ├── LoginScreen.tsx       # 로그인 화면
    │   │   ├── DashboardScreen.tsx
    │   │   ├── GroupScreen.tsx       # 구역(그룹)별 장치 제어
    │   │   └── GroupSettingsScreen.tsx
    │   ├── modals/
    │   │   ├── AddDeviceModal.tsx
    │   │   ├── GroupModal.tsx        # 대그룹/소그룹 추가·편집·삭제 (6가지 모드, 8.8절 참조)
    │   │   └── ReorderModal.tsx
    │   ├── components/
    │   │   ├── ProtectedRoute.tsx    # 인증 가드
    │   │   ├── DeviceCard.tsx
    │   │   ├── AcRemoteCard.tsx
    │   │   ├── BlindCard.tsx
    │   │   ├── LightCard.tsx
    │   │   ├── BlendSwitchCard.tsx
    │   │   └── ui/
    │   └── platform/
    │       ├── index.ts
    │       ├── android/
    │       │   ├── UdpAndroid.ts
    │       │   └── SqliteAndroid.ts
    │       └── electron/
    │           ├── UdpElectron.ts
    │           └── SqliteElectron.ts
    │
    └── capacitor-udp/               # 커스텀 Capacitor UDP 플러그인
        ├── android/
        │   └── UdpPlugin.java
        └── src/
            └── index.ts
```

### 4.1 모노레포 루트 package.json
```json
{
  "name": "localcontrol-monorepo",
  "private": true,
  "workspaces": ["apps/common", "apps/lgsb", "packages/*"],
  "scripts": {
    "dev:common": "npm -w apps/common run dev",
    "dev:lgsb": "npm -w apps/lgsb run dev",
    "build:common": "npm -w apps/common run build",
    "build:lgsb": "npm -w apps/lgsb run build",
    "electron:common": "npm -w apps/common run electron:dev",
    "electron:lgsb": "npm -w apps/lgsb run electron:dev",
    "apk:common": "npm -w apps/common run apk",
    "apk:lgsb": "npm -w apps/lgsb run apk"
  }
}
```

### 4.2 앱별 차이점
| 항목 | `apps/common` | `apps/lgsb` |
|------|---------------|-------------|
| 앱 이름 | Local Control | LGSB Control |
| 앱 ID | `com.rooton.localcontrol` | `com.rooton.lgsb` |
| 브랜드 | 기본 로고/색상 | LGSB 전용 로고/색상 |
| appConfig | LifeSmart model/token (개발/데모용 발급값) | LifeSmart model/token (LGSB 고객 발급값) |
| 공유 코드 | `@localcontrol/core` import | 동일 |

> 두 앱 모두 `packages/core` 를 `import { ... } from '@localcontrol/core'` 로 사용한다.  
> UI/비즈니스 로직은 core 에 100% 포함, 앱 폴더에는 **진입점 + 브랜드 + 빌드설정** 만 존재한다.

---

## 5. SQLite 데이터 모델

### SQLite 동작 방식 (MySQL/PostgreSQL과의 차이)

> SQLite는 **서버가 없는 파일 기반 DB** 다.  
> IP·포트로 접속하는 외부 DB 서버가 아니라, 앱이 직접 로컬 파일(`.db`)을 열어 읽고 쓴다.

#### 핵심 개념

```
[일반 DB]                          [SQLite]
  앱  →  IP:PORT  →  DB 서버         앱  →  로컬 파일(.db) 직접 읽기/쓰기
                      └ 별도 설치      └ 별도 설치 없음, 라이브러리만 존재
```

- **SQLite 엔진(라이브러리)** 은 APK 또는 EXE 안에 번들로 포함된다.
- **DB 파일(`.db`)** 은 앱 번들 안에 없다. 앱이 **처음 실행될 때** 기기의 저장소에 생성된다.
- 앱을 삭제하면 DB 파일도 함께 삭제된다. 앱을 업데이트해도 DB 파일은 유지된다.

#### Android APK 의 경우

| 항목 | 내용 |
|------|------|
| SQLite 라이브러리 | `@capacitor-community/sqlite` → Android 네이티브 코드로 컴파일되어 APK 안에 포함 |
| DB 파일 위치 | 앱 설치 후 첫 실행 시 `/data/data/com.yourapp.id/databases/localcontrol.db` 에 자동 생성 |
| 접근 권한 | 해당 앱만 접근 가능 (Android 앱 샌드박스). 다른 앱은 읽을 수 없음 |
| 백업/이전 | 앱 내 **JSON 내보내기** 기능으로 설정 파일 저장 → 다른 기기에서 **JSON 불러오기**로 동일 설정 복원 |

#### Windows EXE 의 경우

| 항목 | 내용 |
|------|------|
| SQLite 라이브러리 | `better-sqlite3` → Electron 빌드 시 `.node` 네이티브 애드온으로 EXE 옆에 번들 |
| DB 파일 위치 | 앱 첫 실행 시 `C:\Users\사용자명\AppData\Roaming\앱이름\localcontrol.db` 에 자동 생성 |
| 접근 권한 | 현재 로그인한 Windows 사용자 권한으로 접근 |
| 백업/이전 | 앱 내 **JSON 내보내기** 기능으로 설정 파일 저장 → 다른 기기에서 **JSON 불러오기**로 동일 설정 복원 |

#### 요약

```
[앱 빌드 시]
  APK/EXE 안에:  SQLite 엔진(라이브러리) ← 번들에 포함
  APK/EXE 밖:    DB 파일(.db)           ← 포함 안 됨

[앱 첫 실행 시]
  코드: CREATE TABLE IF NOT EXISTS ...  → 기기 저장소에 .db 파일 자동 생성
  이후: INSERT / SELECT / UPDATE 로 일반 파일처럼 사용
```

> **배포 관점**: APK를 새 버전으로 업데이트해도 `.db` 파일은 기기에 그대로 유지된다.  
> EXE를 재설치해도 `AppData` 폴더의 `.db` 파일은 유지된다.  
> 스키마 변경(컬럼 추가 등)은 `ISqliteRepository.initialize()` 에서 **마이그레이션 쿼리**로 처리한다.

#### DB 내보내기/불러오기가 필요한 이유

기기마다 DB가 독립적이므로 아래 상황에서 설정을 옮길 수단이 필요하다.

| 상황 | 설명 |
|------|------|
| 신규 기기 배포 | 관리자가 PC에서 구역·장치를 설정한 뒤 태블릿·다른 PC에 동일 설정 적용 |
| 기기 교체 | 기존 기기의 설정을 새 기기로 이전 |
| 앱 재설치 | 앱 삭제 시 DB도 삭제되므로 미리 내보내기 필요 (Android) |
| 설정 백업 | 장치 추가/구역 재편 전 현재 상태 백업 |

#### 내보내기 형식 (JSON)

```json
{
  "exported_at": "2026-03-11T10:00:00",
  "app_version": "1.0.0",
  "groups": [
    { "group_id": 1, "groupname": "1층", "node": 2, "root_id": 0, "sort_order": 0 },
    { "group_id": 2, "groupname": "로비", "node": 3, "root_id": 1, "sort_order": 0 }
  ],
  "devices": [
    { "me": "abc123", "agt": "xyz", "name": "로비 조명", "dev_type": "SL_SPOT", "attribute": "{...}" }
  ],
  "group_devices": [
    { "group_id": 2, "device_me": "abc123", "sort_order": 0 }
  ],
  "app_settings": [
    { "key": "theme", "value": "dark" }
  ]
}
```

> **내보내기 범위**: 구역(groups), 장치(devices), 구역-장치 매핑(group_devices), 앱 설정(app_settings)  
> **제외 항목**: `users`(계정 정보 — 보안상 별도 관리), `stations`(Discovery로 재탐색), `device_logs`(이력 — 불필요)  
> **불러오기 정책**: 기존 DB에 **병합(UPSERT)** 하거나, 전체 초기화 후 덮어쓰기 중 선택

#### 내보내기/불러오기 UI 위치

- **설정 화면** (관리자 권한 `user_level ≤ 5` 만 접근)
- [설정 내보내기] 버튼 → JSON 파일 저장 (Android: 공유 다이얼로그, Windows: 파일 저장 대화상자)
- [설정 불러오기] 버튼 → JSON 파일 선택 → 미리보기(구역/장치 수) → 확인 → DB 반영

---

### 5.0 빌드타임 설정 (DB 미사용)

`appConfig`에는 **LifeSmart 인증값(`model`, `token`)과 UDP 포트**만 저장한다.  
Station IP·포트 등 **네트워크 정보는 빌드타임 설정에 포함하지 않는다.**  
Station은 앱 실행 시 UDP 브로드캐스트(Discovery)로 자동 탐색하고, 발견된 결과를 `stations` 테이블에 저장한다.

> `model` / `token` 은 LifeSmart에서 고객별로 발급하는 값이다.  
> `apps/common`과 `apps/lgsb`는 이 값만 다르며, 나머지 로직은 동일하다.

**앱 코드는 완전히 동일** — model/token 값만 앱별 `.env.production` 에서 주입된다.

```typescript
// apps/common/src/config/appConfig.ts
// apps/lgsb/src/config/appConfig.ts
// ↑ 두 파일의 코드는 완전히 동일. 값은 각 앱의 .env.production 에서 주입.
export const APP_CONFIG = {
  auth: {
    model: import.meta.env.VITE_STATION_MODEL ?? 'YOUR_MODEL',  // LifeSmart 발급 model
    token: import.meta.env.VITE_STATION_TOKEN ?? 'YOUR_TOKEN',  // LifeSmart 발급 token
  },
  udp: {
    listenPort: 12346,       // NOTIFY 수신 포트 (이벤트)
    apiPort: 12348,          // Station API 요청 포트
    discoveryPort: 12345,    // Z-SEARCH 브로드캐스트 포트
    timeoutMs: 5000,         // 응답 대기 시간
  },
} as const;
```

```
# apps/common/.env.production  ← common 고객사 발급값
VITE_STATION_MODEL=COMMON_MODEL_HERE
VITE_STATION_TOKEN=COMMON_TOKEN_HERE

# apps/lgsb/.env.production    ← LGSB 고객사 발급값 (다른 값)
VITE_STATION_MODEL=LGSB_MODEL_HERE
VITE_STATION_TOKEN=LGSB_TOKEN_HERE
```

---

### 5.1 users 테이블 - 사용자 계정

> 회원가입 기능은 없다. **배포 전 관리자가 SQLite에 직접 사용자를 INSERT** 한다.

```sql
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  login_id    TEXT NOT NULL UNIQUE,   -- 로그인 ID (이메일 형식 권장)
  password    TEXT NOT NULL,          -- bcrypt 또는 SHA-256 해시값
  name        TEXT NOT NULL,          -- 표시 이름
  user_level  INTEGER DEFAULT 10,     -- 권한 레벨 (1=슈퍼관리자, 10=일반, 99=비활성)
  permissions TEXT,                   -- JSON: 기능별 퍼미션 배열
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- 초기 관리자 계정 시드 (배포 전 관리자가 실행)
INSERT OR IGNORE INTO users (login_id, password, name, user_level)
VALUES ('admin@local', '<hashed_password>', '관리자', 1);
```

**user_level 정의:**
| 값 | 역할 | 권한 |
|----|------|------|
| 1 | 슈퍼관리자 | 모든 기능 + 구역 설정 + 장치 추가/삭제 |
| 5 | 관리자 | 장치 제어 + 구역 설정 |
| 10 | 일반 사용자 | 장치 제어만 |
| 99 | 비활성 | 로그인 차단 |

### 5.2 stations 테이블 - Smart Station 목록
```sql
CREATE TABLE IF NOT EXISTS stations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lsid        TEXT NOT NULL UNIQUE,   -- Discovery 응답의 LSID
  name        TEXT,                   -- Smart Station 이름
  ip          TEXT NOT NULL,          -- 탐색으로 확인한 IP
  port        INTEGER DEFAULT 12348,  -- API 요청 포트
  is_active   INTEGER DEFAULT 1,      -- 현재 사용 중인 Station
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
  -- model / token 은 빌드타임 appConfig.ts 에서 주입, DB 저장 안 함
);
```

### 5.3 groups 테이블 - 구역 그룹 (2-level 트리)

> **2-level 트리 구조**: `node=2`(대그룹, 예: '1층'), `node=3`(소그룹, 예: '로비').  
> 소그룹은 `root_id`에 부모 대그룹의 `group_id`를 저장하여 부모-자식 관계를 표현한다.  
> 대그룹 삭제 시 하위 소그룹 및 `group_devices` 레코드도 함께 삭제(CASCADE)된다.

```sql
CREATE TABLE IF NOT EXISTS groups (
  group_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  groupname   TEXT NOT NULL,          -- 그룹 표시 이름 (예: '1층', '로비')
  node        INTEGER NOT NULL DEFAULT 2,  -- 2=대그룹(층), 3=소그룹(구역)
  root_id     INTEGER DEFAULT 0,      -- 소그룹(node=3)일 때 부모 대그룹의 group_id
  sort_order  INTEGER DEFAULT 0,      -- 사이드바 표시 순서
  backimg     TEXT,                   -- 배경 이미지 경로 (선택)
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);
```

### 5.4 devices 테이블 - Station에서 발견된 전체 장치 목록
```sql
CREATE TABLE IF NOT EXISTS devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id  INTEGER NOT NULL REFERENCES stations(id),
  me          TEXT NOT NULL,          -- 장치 고유 ID (LifeSmart me 필드)
  agt         TEXT,                   -- Smart Station agt 필드
  name        TEXT NOT NULL,          -- 표시 이름
  dev_type    TEXT NOT NULL,          -- 장치 타입 (SL_NATURE, OD_WE_IRAC 등)
  attribute   TEXT,                   -- JSON: 장치 속성 (커튼타입, 채널수 등)
  last_stat   TEXT,                   -- JSON: 마지막 알려진 상태
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(station_id, me)
);
```

### 5.5 group_devices 테이블 - 그룹별 장치 매핑 (Junction Table)
```sql
CREATE TABLE IF NOT EXISTS group_devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id    INTEGER NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
  device_id   INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  sort_order  INTEGER DEFAULT 0,      -- 그룹 내 카드 표시 순서
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(group_id, device_id)         -- 같은 그룹에 중복 추가 불가
);
-- 하나의 장치는 여러 그룹에 동시 등록 가능
```

### 5.6 dashboard_devices 테이블 - 대시보드 장치 (그룹 무관)
```sql
CREATE TABLE IF NOT EXISTS dashboard_devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  device_id   INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  sort_order  INTEGER DEFAULT 0,      -- 대시보드 내 표시 순서
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, device_id)          -- 사용자별 중복 추가 불가
);
-- 대시보드는 사용자별 독립 → 각 사용자가 원하는 장치만 추가
```

### 5.7 device_logs 테이블 - 제어 이력
```sql
CREATE TABLE IF NOT EXISTS device_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   INTEGER NOT NULL REFERENCES devices(id),
  action      TEXT NOT NULL,          -- 'GET' | 'SET'
  payload     TEXT,                   -- 전송한 JSON
  result      TEXT,                   -- 수신한 JSON
  success     INTEGER DEFAULT 0,      -- 1=성공, 0=실패
  created_at  TEXT DEFAULT (datetime('now'))
);
```

### 5.8 app_settings 테이블 - 앱 설정
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
-- 예시 키: 'active_station_id', 'theme', 'language', 'event_port', 'poll_interval_ms'
```

---

## 6. UDP 통신 프로토콜 명세

### 6.1 포트 구성
| 포트 | 용도 |
|------|------|
| 12345 | UDP Broadcast — Smart Station 탐색 (`Z-SEARCH * \r\n`) |
| 12348 | Smart Station API 수신 포트 — 장치 조회/제어 요청 전송 대상 |
| 12346 | 앱이 응답을 수신하는 포트 (App enabling 방식) |

### 6.2 패킷 구조
모든 요청/응답 패킷은 **10-byte 헤더 + UTF-8 JSON 바디** 구조다.

```
┌────┬─────────┬──────────┬─────────────┬──────────────────────────┐
│ 2B │   1B    │   2B     │    5B       │  N bytes (JSON)          │
│ JL │ version │ pkg_type │  pkg_size   │  UTF-8 JSON body         │
└────┴─────────┴──────────┴─────────────┴──────────────────────────┘
```

**pkg_type 열거**
| 값 | 의미 |
|----|------|
| 1 | GET |
| 2 | GET-REPLY |
| 3 | SET |
| 4 | SET-REPLY |
| 9 | NOTIFY (Smart Station → App, 이벤트) |

### 6.3 JSON Body 공통 구조
```json
{
  "sys": {
    "ver": 1,
    "sign": "<MD5 32자리 소문자 hex>",
    "model": "<사전발급 model>",
    "ts": 1700000000
  },
  "obj": "ep",
  "args": {
    "me": "장치ID"
  },
  "id": 1001
}
```

### 6.4 서명(Sign) 생성 규칙
```
원본 문자열 = obj
            + args 필드를 key 오름차순 정렬 후 key+value 순서로 이어붙이기
              (args가 배열이면 해당 파라미터는 제외)
            + ts (Unix timestamp 초 단위)
            + model
            + token

sign = MD5(원본 문자열).toLowerCase()  // 32자리 hex
```

#### TypeScript 구현 예시
```typescript
// services/SignatureBuilder.ts
import md5 from 'crypto-js/md5';

export interface LocalSignInput {
  obj: string;
  args: Record<string, unknown>;
  ts: number;
  model: string;
  token: string;
}

export function buildLocalSign(input: LocalSignInput): string {
  const { obj, args, ts, model, token } = input;
  
  const sortedKeys = Object.keys(args).sort();
  const argsStr = sortedKeys
    .filter(k => !Array.isArray(args[k]))   // 배열 필드 제외
    .map(k => `${k}${args[k]}`)
    .join('');
  
  const raw = `${obj}${argsStr}${ts}${model}${token}`;
  return md5(raw).toString();
}
```

### 6.5 Smart Station 탐색 (Discovery)
```
1. UDP Broadcast 전송 (포트 12345):
   "Z-SEARCH * \r\n"

2. 200ms 이내 응답 파싱:
   LSID=xxxx
   MGAMOD=xxxx
   WLAN=xxxx
   NAME=xxxx

3. 응답 패킷의 원격 IP → Smart Station IP 확보
4. stations 테이블에 저장
```

---

## 7. 장치 제어 API 명세

### 7.1 장치 목록 조회 (eps GET)
```json
{
  "sys": { "ver": 1, "sign": "...", "model": "...", "ts": 1700000000 },
  "obj": "eps",
  "args": {},
  "id": 1001
}
```

응답에서 각 장치의 `me`, `name`, `devtype`, `stat` 필드를 파싱하여 devices 테이블에 upsert한다.

### 7.2 단일 장치 상태 조회 (ep GET)
```json
{
  "sys": { "ver": 1, "sign": "...", "model": "...", "ts": 1700000000 },
  "obj": "ep",
  "args": { "me": "장치ID" },
  "id": 1002
}
```

---

### 7.3 에어컨 제어 (AcRemote) - ep SET

에어컨은 IR 리모컨 타입이다. `EpSetIRAC` 구조를 사용한다.

#### 에어컨 상태 파라미터
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `power` | 0 or 1 | 0=OFF, 1=ON |
| `mode` | 0~4 | 0=자동, 1=냉방, 2=제습, 3=송풍, 4=난방 |
| `temp` | 16~30 | 설정 온도 (°C) |
| `wind` | 0~3 | 0=자동, 1=약, 2=중, 3=강 |

#### 전원 ON/OFF 예시
```json
{
  "sys": { "ver": 1, "sign": "...", "model": "...", "ts": 1700000000 },
  "obj": "ep",
  "args": {
    "me": "장치ID",
    "idx": 232,
    "type": "0xCF",
    "val": 1
  },
  "id": 1003
}
```

> `idx=232`, `type="0xCF"` 는 LifeSmart IR AC 제어 표준 필드다.  
> `val` 에 power(1bit), mode(4bit), temp(5bit), wind(2bit) 를 비트 조합 또는 별도 key/value 방식으로 전달한다.  
> 실제 장치의 devtype(예: `SL_NATURE`, `OD_WE_IRAC` 등)에 따라 args 구조가 달라질 수 있으므로,  
> 처음에는 에어컨 **전원(power)** 파라미터만 구현하고 이후 온도/모드를 추가하는 방식으로 개발한다.

---

### 7.4 블라인드/커튼 제어 (BlindControl) - ep SET

#### 블라인드 상태 파라미터
| 파라미터 | 값 | 설명 |
|----------|-----|------|
| `val` | 0 | 열기 (Open) |
| `val` | 1 | 닫기 (Close) |
| `val` | 2 | 일시정지 (Stop/Pause) |
| `val` | 3~100 | 위치값 (%) |

#### 열기 예시
```json
{
  "sys": { "ver": 1, "sign": "...", "model": "...", "ts": 1700000000 },
  "obj": "ep",
  "args": {
    "me": "장치ID",
    "idx": 0,
    "type": "0x62",
    "val": 0
  },
  "id": 1004
}
```

#### 블라인드 타입(attribute)
| 타입 키 | 설명 |
|---------|------|
| `roll` | 롤 블라인드 (단방향) |
| `Rcurt` | 오른쪽 커튼 |
| `Lcurt` | 왼쪽 커튼 |
| `Tcurt` | 양쪽 커튼 |

---

### 7.5 조명 제어 (Light) - ep SET

#### 조명 상태 파라미터
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `power` | 0 or 1 | 0=OFF, 1=ON |
| `brightness` | 1~100 | 밝기 (%) |
| `colortemp` | 2700~6500 | 색온도 (K), 지원 장치만 |

#### 전원 ON 예시
```json
{
  "sys": { "ver": 1, "sign": "...", "model": "...", "ts": 1700000000 },
  "obj": "ep",
  "args": {
    "me": "장치ID",
    "idx": 0,
    "type": "0x01",
    "val": 1
  },
  "id": 1005
}
```

---

### 7.6 Blend 스위치 3구 제어 (LivingRoomNatureSwitch3) - ep SET

3구 스위치는 각 채널(ch1, ch2, ch3)을 **독립적으로 ON/OFF** 한다.

#### 스위치 채널 파라미터
| 파라미터 | idx | type | val=1 | val=0 |
|----------|-----|------|-------|-------|
| 채널 1 | 0 | `0x01` | ON | OFF |
| 채널 2 | 1 | `0x01` | ON | OFF |
| 채널 3 | 2 | `0x01` | ON | OFF |

#### 채널 1 ON 예시
```json
{
  "sys": { "ver": 1, "sign": "...", "model": "...", "ts": 1700000000 },
  "obj": "ep",
  "args": {
    "me": "장치ID",
    "idx": 0,
    "type": "0x01",
    "val": 1
  },
  "id": 1006
}
```

#### 채널 2 OFF 예시
```json
{
  "sys": { "ver": 1, "sign": "...", "model": "...", "ts": 1700000000 },
  "obj": "ep",
  "args": {
    "me": "장치ID",
    "idx": 1,
    "type": "0x01",
    "val": 0
  },
  "id": 1007
}
```

> **주의**: `SL_NATURE` devtype에서 idx=0~2 가 ch1~ch3 에 매핑된다. devtype이 `SL_SPOT` 등 다른 경우 idx 매핑이 다를 수 있으므로, `eps GET` 응답의 `attribute` 필드에서 실제 채널 매핑을 확인한다.

---

### 7.7 UDP 이벤트 수신 (NOTIFY)
Smart Station이 장치 상태 변경을 앱으로 Push한다.

1. `config SET` 으로 이벤트 수신 IP/포트 등록:
```json
{
  "sys": { "ver": 1, "sign": "...", "model": "...", "ts": 1700000000 },
  "obj": "config",
  "args": {
    "type": "notify",
    "subtype": "add",
    "ip": "앱 디바이스 IP",
    "port": 12346
  },
  "id": 9000
}
```

2. 포트 12346 에서 UDP 수신 대기 → pkg_type=9 (NOTIFY) 패킷을 파싱하여 Zustand store 업데이트.

---

## 8. 화면 구성 (UI)

> `model` / `token` 은 빌드타임 `appConfig.ts` 에 포함되므로 Station 설정 화면은 없다.  
> 앱 실행 → **로그인 화면** → 인증 성공 → 대시보드 표시.

### 8.1 인증 흐름 (로그인)

#### 개요
- 계정은 **SQLite `users` 테이블**에 저장 (네트워크 불필요)
- **회원가입 기능 없음** — 배포 전 관리자가 시드 스크립트(`npm run seed:users`)로 사용자를 추가한다
- 인증 흐름: 아이디+비밀번호 입력 → SHA-256 해시 → DB 조회 일치 여부 → 세션 저장 → 화면 이동

#### LoginScreen 화면
```
┌──────────────────────────────────┐
│         [앱 로고]                │
│                                  │
│   ┌──────────────────────────┐   │
│   │ 아이디                   │   │
│   └──────────────────────────┘   │
│   ┌──────────────────────────┐   │
│   │ 비밀번호                 │   │
│   └──────────────────────────┘   │
│                                  │
│   [       로그인       ]         │
│                                  │
│   □ 자동 로그인                  │
└──────────────────────────────────┘
```

#### 인증 처리 흐름
```
[로그인 버튼 클릭]
        ↓
[password → SHA-256 해시]
        ↓
[SQLite users 테이블 조회: login_id + hashed password 일치?]
        ↓
┌─ 일치 + user_level ≠ 99
│  → useAuthStore에 사용자 정보 저장
│  → localStorage에 세션 토큰 저장 (앱 재시작 시 자동 로그인)
│  → DashboardScreen으로 이동
│
└─ 불일치 또는 user_level === 99
   → "아이디 또는 비밀번호가 올바르지 않습니다" 표시
```

#### AuthService 인터페이스
```typescript
// packages/core/services/AuthService.ts
export interface IAuthService {
  login(loginId: string, password: string): Promise<AuthResult>;
  logout(): void;
  getCurrentUser(): UserRow | null;
  isAuthenticated(): boolean;
  hasPermission(feature: string, requiredLevel: number): boolean;
}

export interface AuthResult {
  success: boolean;
  user?: UserRow;
  error?: string;
}
```

#### ProtectedRoute
- `useAuthStore.isAuthenticated === false` 이면 `/login` 으로 리다이렉트
- 기존 웹의 `ProtectedRoute.jsx` 와 동일한 패턴

#### 권한 기반 UI 제어
| user_level | 구역설정 | 장치 추가/삭제 | 장치 제어 |
|------------|----------|---------------|----------|
| 1 (슈퍼관리자) | O | O | O |
| 5 (관리자) | O | O | O |
| 10 (일반) | X | X | O |
| 99 (비활성) | 로그인 차단 | - | - |

---

### 8.2 전체 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  AppLayout.tsx                                                  │
│ ┌───────────────┐  ┌──────────────────────────────────────────┐ │
│ │  Sidebar.tsx  │  │  콘텐츠 영역                             │ │
│ │               │  │                                          │ │
│ │ ■ 대시보드    │  │  DashboardScreen   (사용자 장치)         │ │
│ │               │  │  GroupScreen        (구역별 장치)        │ │
│ │ ─ 구역 ────   │  │  GroupSettingsScreen (구역 관리)         │ │
│ │ ▼ 1층         │  │                                          │ │
│ │   ├ 로비     │  │  [장치 카드 그리드]                      │ │
│ │   ├ 회의실A  │  │  ┌──────┐ ┌──────┐ ┌──────┐            │ │
│ │   └ 서버실   │  │  │ 조명 │ │에어컨│ │블라인│            │ │
│ │ ▶ 2층         │  │  └──────┘ └──────┘ └──────┘            │ │
│ │               │  │  ┌──────┐ ┌──────┐                     │ │
│ │ ─────────     │  │  │스위치│ │ ...  │   [+장치] [-장치]   │ │
│ │ ⚙ 구역 설정  │  │  └──────┘ └──────┘                     │ │
│ │               │  │                                          │ │
│ │ [사용자] 로그아웃 │                                          │ │
│ └───────────────┘  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 화면 목록
| 화면 | 파일 | 설명 |
|------|------|------|
| 로그인 | `LoginScreen.tsx` | 로컬 SQLite 인증 |
| 대시보드 | `DashboardScreen.tsx` | 사용자별 장치 카드 그리드 + **장치 추가/삭제** |
| 구역 화면 | `GroupScreen.tsx` | 선택한 구역(소그룹)의 장치 그리드 + **장치 추가/삭제** |
| 구역 설정 | `GroupSettingsScreen.tsx` | 대그룹/소그룹 CRUD — 6가지 모드(8.8절 참조), 관리자 권한만 |
| 장치 추가 모달 | `AddDeviceModal.tsx` | Station 탐색 → 장치 선택 → 대시보드 또는 구역 등록(관리자 권한만) |
| 그룹 모달 | `GroupModal.tsx` | 대그룹 추가/편집/삭제, 소그룹 추가/편집/삭제(관리자 권한만) |

### 8.4 Sidebar (왼쪽 네비게이션)

**2-level 트리** 구조의 사이드바. 대그룹(층)은 클릭 시 접기/펼치기, 소그룹(구역)은 클릭 시 해당 구역 화면으로 이동한다.

```
┌─────────────────┐
│  [앱 로고]      │
│                 │
│ ■ 대시보드      │  ← 사용자별 장치 보기
│                 │
│ ─ 구역별제어 ── │
│ ▼ 1층           │  ← 대그룹 (node=2), 클릭 시 접기/펼치기
│   ├ 로비       │  ← 소그룹 (node=3), 클릭 시 GroupScreen
│   ├ 회의실 A   │
│   └ 서버실     │
│ ▶ 2층           │  ← 접힌 대그룹
│ ▶ 3층           │
│                 │
│ ─────────────   │
│ ⚙ 구역 설정   │  ← user_level ≤ 5 일 때만 표시
│                 │
│ 홍길동  [로그아웃] │
└─────────────────┘
```

- 그룹 트리는 `useGroupStore`의 `groups` 로 관리 (`node=2` → `node=3` 부모-자식)
- 대그룹 클릭 → 해당 대그룹의 소그룹 목록 토글 (접기/펼치기)
- 소그룹 클릭 → `GroupScreen` 으로 전환 (`/controls/:group_id`)
- 대시보드 클릭 → `DashboardScreen` 으로 전환
- 구역 설정 → `GroupSettingsScreen` (관리자 권한만)
- 하단에 현재 사용자 이름 + 로그아웃 버튼

### 8.5 DashboardScreen (사용자별 장치)

- 사용자가 **직접 추가한** 장치만 표시 (`dashboard_devices` 테이블 기준)
- 카드 그리드 레이아웃: 반응형 3열(모바일 2열), 각 카드는 `devtype` 으로 분기 렌더링
- 각 장치 카드는 `devtype` 에 따라 `DeviceCard.tsx` 가 분기 렌더링
- **우측 상단에 [장치 추가] / [장치 삭제] 버튼** 제공 (관리자 권한 `user_level ≤ 5`만)
- 장치 추가 시 `AddDeviceModal` → 선택 → `dashboard_devices` INSERT
- 장치 삭제 시 토글 모드로 진입 → 카드에 삭제 버튼 오버레이 → `dashboard_devices` DELETE

```
┌──────────────────────────────────────────────────────┐
│  대시보드                    [+장치 추가] [-삭제]    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 조명     │  │ 에어컨   │  │ 블라인드 │           │
│  │ ON  OFF  │  │ 23°C 냉방│  │ ████ 60% │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│  ┌──────────┐                                        │
│  │스위치 3구│                                        │
│  │ ● ● ○   │                                        │
│  └──────────┘                                        │
└──────────────────────────────────────────────────────┘
```

### 8.6 GroupScreen (구역별 장치)

- 선택한 소그룹(구역)의 장치만 표시 (`group_devices` 테이블 기준)
- **우측 상단에 [장치 추가] / [장치 삭제]** 버튼 제공(관리자 권한만)
- 장치 추가 시 `AddDeviceModal` → 선택 → `group_devices` INSERT
- 장치 삭제 시 `group_devices` DELETE (원본 devices 레코드 유지)
- DashboardScreen과 동일한 카드 그리드 레이아웃

### 8.7 장치 추가 모달 (AddDeviceModal) 흐름

> 대시보드와 구역 모두 동일한 `AddDeviceModal` 을 사용한다.  
> `targetType` prop으로 `'dashboard'` / `'group'` 을 구분하여 저장 대상 테이블을 분기한다.

```
[장치 추가] 버튼 클릭 (DashboardScreen 또는 GroupScreen)
        ↓
[Station 탐색 중...] (UDP Broadcast → 응답 수신)
        ↓
[eps GET] → Station 등록 장치 전체 목록 수신
        ↓
┌─────────────────────────────────────────────┐
│  Station 장치 목록                          │
│  ┌───────────────────────────────────────┐  │
│  │ 검색 (이름/devtype 필터)              │  │
│  └───────────────────────────────────────┘  │
│  □ 에어컨 - 회의실A          [SL_NATURE]   │
│  ■ 조명 1 - 로비             [SL_SPOT]     │  ← 체크된 항목
│  □ 블라인드 - 창가            [SL_P_SW]    │
│  ■ 스위치 3구 - 복도         [SL_NATURE]  │
│  ...                                        │
│                                             │
│  이미 추가된 장치는 체크 비활성화           │
│                                             │
│  [취소]           [선택 항목 추가 (2개)]   │
└─────────────────────────────────────────────┘
        ↓ [추가] 클릭
[targetType === 'dashboard']
  → dashboard_devices 테이블에 INSERT
[targetType === 'group']
  → group_devices 테이블에 INSERT
        ↓
[화면 카드 그리드 즉시 갱신]
```

### 8.8 구역 설정 (GroupSettingsScreen)

> **2-level 트리** 구조(대그룹 node=2 / 소그룹 node=3)의 CRUD 화면이다.  
> `GroupModal.tsx` 를 6가지 모드로 호출하여 추가·편집·삭제를 처리한다.

#### GroupModal 6가지 모드
| 모드 | 설명 | API payload |
|------|------|-------------|
| `add` | 대그룹 추가 | `{ groupname, node:2, sort_order }` |
| `update` | 대그룹 편집 | `{ group_id, groupname, sort_order }` |
| `delete` | 대그룹 삭제 | `{ group_id: -abs(group_id) }` ※ 하위 소그룹 존재 시 이중 확인 |
| `add-subgroup` | 소그룹 추가 | `{ groupname, node:3, root_id: 부모_group_id }` |
| `update-subgroup` | 소그룹 편집 | `{ group_id, groupname }` |
| `delete-subgroup` | 소그룹 삭제 | `{ group_id: -abs(group_id) }` ※ 소속 장치 존재 시 이중 확인 |

#### 구역 설정 UI
```
┌──────────────────────────────────────────────────────────┐
│  구역 관리                              [+ 대그룹 추가] │
│  ────────────────────────────────────────────────────── │ 
│  ▼ 1층          [✏ 편집] [🗑 삭제] [+ 소그룹 추가]    │
│    ├ 로비       [✏ 편집] [🗑 삭제]                     │
│    ├ 회의실 A   [✏ 편집] [🗑 삭제]                     │
│    └ 서버실     [✏ 편집] [🗑 삭제]                     │
│  ▶ 2층          [✏ 편집] [🗑 삭제] [+ 소그룹 추가]    │
│  ▶ 3층          [✏ 편집] [🗑 삭제] [+ 소그룹 추가]    │
└──────────────────────────────────────────────────────────┘
```

- 대그룹 삭제 시 하위 소그룹 + 소속 장치 연결(`group_devices`)이 CASCADE 삭제
- 소그룹 삭제 시 `group_devices` 레코드만 삭제 (devices 원본 유지)
- 첫 번째 대그룹(`sort_order`가 가장 낮은 node=2 그룹)은 삭제 불가 — 최소 1개 유지 정책
- 관리자 권한(`user_level ≤ 5`) 에서만 접근 가능

### 8.9 장치 카드 컴포넌트 (DeviceCard - devtype별 분기)

| devtype 패턴 | 렌더 컴포넌트 | 빠른 제어 |
|-------------|-------------|----------|
| `*IRAC*`, `*AC*` | `AcRemoteCard` | 전원 토글 + 온도 표시 |
| `*BLIND*`, `*CURT*`, `*P_SW*` | `BlindCard` | 열기/정지/닫기 버튼 |
| `*SPOT*`, `*LIGHT*`, `*RGBW*` | `LightCard` | 전원 토글 + 밝기 슬라이더 |
| `SL_NATURE` (3구) | `BlendSwitchCard` | 채널 1/2/3 개별 토글 버튼 |

---

## 9. IUdpTransport 인터페이스 (플랫폼 추상화)

```typescript
// src/services/IUdpTransport.ts

export interface UdpSendOptions {
  host: string;
  port: number;
  data: Uint8Array;
  timeoutMs?: number;
}

export interface UdpResponse {
  data: Uint8Array;
  remoteIp: string;
  remotePort: number;
}

export interface IUdpTransport {
  /** 단발성 요청/응답 (GET, SET) */
  sendAndReceive(options: UdpSendOptions): Promise<UdpResponse>;
  /** UDP Broadcast 전송 후 다수 응답 수집 (Discovery) */
  broadcast(port: number, data: Uint8Array, listenPort: number, timeoutMs: number): Promise<UdpResponse[]>;
  /** 이벤트 수신 Listen 시작 */
  startListen(port: number, onMessage: (resp: UdpResponse) => void): Promise<void>;
  /** Listen 종료 */
  stopListen(): Promise<void>;
}
```

---

## 10. ISqliteRepository 인터페이스 (플랫폼 추상화)

```typescript
// packages/core/services/ISqliteRepository.ts

export interface ISqliteRepository {
  /** DB 초기화 (테이블 생성 / 마이그레이션) */
  initialize(): Promise<void>;

  /** Auth (users) */
  getUserByCredentials(loginId: string, passwordHash: string): Promise<UserRow | null>;
  getUserById(id: number): Promise<UserRow | null>;

  /** Station CRUD */
  getStations(): Promise<StationRow[]>;
  upsertStation(station: Omit<StationRow, 'model' | 'token'>): Promise<void>;
  setActiveStation(id: number): Promise<void>;

  /** Group CRUD (2-level tree: node=2 대그룹, node=3 소그룹) */
  getGroups(): Promise<GroupRow[]>;                         // node=2 + 하위 node=3 전체
  createGroup(group: Omit<GroupRow, 'group_id'>): Promise<GroupRow>;
  updateGroup(groupId: number, data: Partial<GroupRow>): Promise<void>;
  deleteGroup(groupId: number): Promise<void>;              // group_devices CASCADE 삭제
  getSubGroups(rootId: number): Promise<GroupRow[]>;         // 특정 대그룹의 소그룹 목록

  /** Device CRUD */
  getDevices(stationId: number): Promise<DeviceRow[]>;
  upsertDevice(device: DeviceRow): Promise<void>;
  updateDeviceStatus(me: string, statJson: string): Promise<void>;

  /** Group-Device 매핑 */
  getDevicesByGroup(groupId: number): Promise<DeviceRow[]>;  // group_devices JOIN devices
  addDeviceToGroup(groupId: number, deviceId: number): Promise<void>;
  removeDeviceFromGroup(groupId: number, deviceId: number): Promise<void>;
  isDeviceInGroup(groupId: number, deviceId: number): Promise<boolean>;

  /** Dashboard-Device 매핑 (사용자별) */
  getDashboardDevices(userId: number): Promise<DeviceRow[]>;
  addDeviceToDashboard(userId: number, deviceId: number): Promise<void>;
  removeDeviceFromDashboard(userId: number, deviceId: number): Promise<void>;
  isDeviceInDashboard(userId: number, deviceId: number): Promise<boolean>;

  /** Settings */
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;

  /** Log */
  insertLog(log: DeviceLogRow): Promise<void>;
}
```

---

## 11. LocalGateway 구현 예시

```typescript
// src/services/LocalGateway.ts

import { buildLocalPacket, parseLocalPacket } from './PacketBuilder';
import { buildLocalSign } from './SignatureBuilder';
import type { IUdpTransport } from './IUdpTransport';

export class LocalGateway {
  constructor(
    private readonly transport: IUdpTransport,
    private readonly station: { ip: string; port: number; model: string; token: string }
  ) {}

  private buildRequest(obj: string, args: Record<string, unknown>, id: number) {
    const ts = Math.floor(Date.now() / 1000);
    const sign = buildLocalSign({ obj, args, ts, model: this.station.model, token: this.station.token });
    return {
      sys: { ver: 1, sign, model: this.station.model, ts },
      obj,
      args,
      id,
    };
  }

  async getDevices() {
    const body = this.buildRequest('eps', {}, 1001);
    const packet = buildLocalPacket(1 /* GET */, JSON.stringify(body));
    const resp = await this.transport.sendAndReceive({
      host: this.station.ip,
      port: this.station.port,
      data: packet,
      timeoutMs: 5000,
    });
    return parseLocalPacket(resp.data);
  }

  async setDevice(me: string, args: Record<string, unknown>) {
    const fullArgs = { me, ...args };
    const body = this.buildRequest('ep', fullArgs, Date.now());
    const packet = buildLocalPacket(3 /* SET */, JSON.stringify(body));
    const resp = await this.transport.sendAndReceive({
      host: this.station.ip,
      port: this.station.port,
      data: packet,
      timeoutMs: 5000,
    });
    return parseLocalPacket(resp.data);
  }
}
```

---

## 12. 패킷 직렬화/역직렬화

```typescript
// src/services/PacketBuilder.ts

const HEADER_MAGIC = [0x4A, 0x4C]; // 'JL'
const HEADER_VERSION = 0;

export function buildLocalPacket(pkgType: number, jsonBody: string): Uint8Array {
  const bodyBytes = new TextEncoder().encode(jsonBody);
  const header = new Uint8Array(10);
  header[0] = HEADER_MAGIC[0];
  header[1] = HEADER_MAGIC[1];
  header[2] = HEADER_VERSION;
  header[3] = pkgType;
  // 4~8: pkg_size (5바이트, Big-Endian)
  const size = bodyBytes.length;
  header[4] = (size >> 32) & 0xFF;
  header[5] = (size >> 24) & 0xFF;
  header[6] = (size >> 16) & 0xFF;
  header[7] = (size >> 8) & 0xFF;
  header[8] = size & 0xFF;
  header[9] = 0x00; // reserved

  const packet = new Uint8Array(10 + bodyBytes.length);
  packet.set(header, 0);
  packet.set(bodyBytes, 10);
  return packet;
}

export function parseLocalPacket(raw: Uint8Array): { pkgType: number; body: unknown } {
  const pkgType = raw[3];
  const bodyBytes = raw.slice(10);
  const bodyStr = new TextDecoder().decode(bodyBytes);
  return { pkgType, body: JSON.parse(bodyStr) };
}
```

---

## 13. Electron main process (Windows) 구현 가이드

### electron/main.ts
```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import { UdpManager } from './udp';
import { DbManager } from './db';

const udp = new UdpManager();
const db = new DbManager();

app.whenReady().then(async () => {
  await db.initialize();
  
  const win = new BrowserWindow({
    width: 1024, height: 768,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile('dist/index.html');
});

// UDP IPC 핸들러
ipcMain.handle('udp:sendAndReceive', async (_, opts) => udp.sendAndReceive(opts));
ipcMain.handle('udp:broadcast', async (_, opts) => udp.broadcast(opts));
ipcMain.handle('udp:startListen', async (_, port) => udp.startListen(port));

// SQLite IPC 핸들러
ipcMain.handle('db:query', async (_, sql, params) => db.query(sql, params));
ipcMain.handle('db:run', async (_, sql, params) => db.run(sql, params));
```

### electron/udp.ts (Node.js dgram)
```typescript
import dgram from 'dgram';

export class UdpManager {
  async sendAndReceive(opts: { host: string; port: number; data: number[]; timeoutMs: number }) {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      const buf = Buffer.from(opts.data);
      
      const timer = setTimeout(() => {
        socket.close();
        reject(new Error('UDP timeout'));
      }, opts.timeoutMs ?? 5000);
      
      socket.on('message', (msg, rinfo) => {
        clearTimeout(timer);
        socket.close();
        resolve({ data: Array.from(msg), remoteIp: rinfo.address, remotePort: rinfo.port });
      });
      
      socket.send(buf, opts.port, opts.host);
    });
  }
  
  async broadcast(opts: { listenPort: number; data: number[]; broadcastPort: number; timeoutMs: number }) {
    return new Promise<object[]>((resolve) => {
      const socket = dgram.createSocket('udp4');
      socket.bind(opts.listenPort, () => socket.setBroadcast(true));
      const results: object[] = [];
      const buf = Buffer.from(opts.data);
      
      setTimeout(() => {
        socket.close();
        resolve(results);
      }, opts.timeoutMs);
      
      socket.on('message', (msg, rinfo) => {
        results.push({ data: Array.from(msg), remoteIp: rinfo.address, remotePort: rinfo.port });
      });
      
      socket.send(buf, opts.broadcastPort, '255.255.255.255');
    });
  }
}
```

---

## 14. Capacitor UDP 플러그인 (Android) 구현 가이드

### packages/capacitor-udp/android/UdpPlugin.java
```java
@CapacitorPlugin(name = "UdpPlugin")
public class UdpPlugin extends Plugin {

  @PluginMethod
  public void sendAndReceive(PluginCall call) {
    String host = call.getString("host");
    int port = call.getInt("port");
    JSArray dataArr = call.getArray("data");
    int timeoutMs = call.getInt("timeoutMs", 5000);
    
    taskPool.execute(() -> {
      try {
        byte[] buf = toByteArray(dataArr);
        DatagramSocket socket = new DatagramSocket();
        DatagramPacket sendPkt = new DatagramPacket(buf, buf.length,
          InetAddress.getByName(host), port);
        socket.send(sendPkt);
        
        byte[] recv = new byte[65535];
        DatagramPacket recvPkt = new DatagramPacket(recv, recv.length);
        socket.setSoTimeout(timeoutMs);
        socket.receive(recvPkt);
        socket.close();
        
        JSObject result = new JSObject();
        result.put("data", toJSArray(recvPkt.getData(), recvPkt.getLength()));
        result.put("remoteIp", recvPkt.getAddress().getHostAddress());
        result.put("remotePort", recvPkt.getPort());
        call.resolve(result);
      } catch (Exception e) {
        call.reject(e.getMessage());
      }
    });
  }
}
```

---

## 15. 개발 순서 (체크리스트)

### Phase 1 - 모노레포 & 기반 구축
- [ ] 모노레포 루트 초기화 (`workspaces: ["apps/*", "packages/*"]`)
- [ ] `packages/core` 생성 — 공유 TS 소스
- [ ] `apps/common` + `apps/lgsb` 앱 스캐폴딩 (Vite + React + TS)
- [ ] Tailwind CSS 설정 (공통 preset → 앱별 override)
- [ ] `@localcontrol/core` import 경로 alias 설정 확인
- [ ] SQLite 스키마 정의 (users, stations, groups, devices, group_devices, dashboard_devices, device_logs, app_settings)
- [ ] `IUdpTransport` / `ISqliteRepository` 인터페이스 정의
- [ ] `PacketBuilder` (BuildLocalPacket / ParseLocalPacket) 구현 + 단위 테스트
- [ ] `SignatureBuilder` (MD5 서명) 구현 + 단위 테스트

### Phase 2 - Electron (Windows 우선 개발)
- [ ] `apps/common/electron/` 프로젝트 설정 (main.ts, preload.ts)
- [ ] Node.js dgram 기반 `UdpElectron` 구현
- [ ] better-sqlite3 기반 `SqliteElectron` 구현
- [ ] IPC 채널 등록 (UDP + SQLite)
- [ ] `platform/electron/index.ts` 에서 구현체 export

### Phase 3 - 로그인 & 인증
- [ ] `users` 테이블 시드 스크립트 작성 (관리자가 배포 전 실행)
- [ ] `AuthService.ts` → SQLite 기반 로컬 인증 (SHA-256 해시 비교)
- [ ] `useAuthStore.ts` → 인증 상태 관리 (Zustand + localStorage 세션)
- [ ] `LoginScreen.tsx` → 로그인 폼 UI (아이디 + 비밀번호 + 자동 로그인)
- [ ] `ProtectedRoute.tsx` → 미인증 시 `/login` 리다이렉트
- [ ] 권한 기반 UI 분기 (`user_level` 검사 → 구역설정/장치추가 버튼 가시성)

### Phase 4 - 빌드 설정 & Discovery
- [ ] `.env.production` / `appConfig.ts` 에 model, token 설정 (Station IP는 포함하지 않음)
- [ ] `DiscoveryService.ts` → Z-SEARCH 브로드캐스트 전송 및 응답 파싱
- [ ] 앱 시작 시 자동 탐색 → 발견된 Station을 `stations` 테이블에 upsert
- [ ] `LocalGateway.ts` 기본 구조 완성 (appConfig에서 model/token 주입, Station IP는 DB에서 조회)

### Phase 5 - 구역 관리 & 레이아웃
- [ ] `AppLayout.tsx` + `Sidebar.tsx` → 2-level 트리 사이드바 (대그룹 접기/펼치기, 소그룹 클릭 시 GroupScreen 전환)
- [ ] `useGroupStore.ts` → 대그룹/소그룹 트리 관리 (Zustand)
- [ ] `GroupModal.tsx` → 6가지 모드 (대그룹 추가/편집/삭제, 소그룹 추가/편집/삭제)
- [ ] `GroupSettingsScreen.tsx` → 구역 설정 UI (관리자 전용)
- [ ] groups / group_devices 테이블 CRUD (`ISqliteRepository` 구현)

### Phase 6 - 대시보드 & 장치 목록
- [ ] `eps GET` 으로 Station 장치 전체 조회 → devices 테이블 upsert
- [ ] `AddDeviceModal.tsx` → Station 장치 목록 + 체크 선택 + INSERT (targetType 분기)
- [ ] `DashboardScreen.tsx` → 사용자별 장치 카드 그리드 + [장치 추가/삭제] 버튼
- [ ] `GroupScreen.tsx` → 구역별 장치 그리드 + [장치 추가/삭제] 버튼
- [ ] `DeviceCard.tsx` → devtype별 컴포넌트 분기 렌더링

### Phase 7 - 에어컨 카드 제어
- [ ] `AcRemoteCard.tsx` → 전원 토글, 온도 ±, 모드 순환
- [ ] `ep GET` 상태 폴링 + `ep SET` 명령 전송

### Phase 8 - 블라인드 카드 제어
- [ ] `BlindCard.tsx` → 열기/정지/닫기 버튼 + 위치값 슬라이더
- [ ] 커튼 타입(roll/Rcurt/Lcurt/Tcurt) attribute 기반 UI 분기

### Phase 9 - 조명 카드 제어
- [ ] `LightCard.tsx` → 전원 토글 + 밝기 슬라이더 + 색온도 슬라이더
- [ ] 색온도 지원 여부(devtype) 에 따른 분기

### Phase 10 - Blend 스위치 3구 카드 제어
- [ ] `BlendSwitchCard.tsx` → 채널 1/2/3 개별 ON/OFF 토글 버튼
- [ ] `ep GET` 으로 채널별 상태 파싱 (idx=0,1,2)

### Phase 11 - UDP 이벤트 수신
- [ ] `config SET` 으로 이벤트 등록
- [ ] 포트 12346 NOTIFY 패킷 수신 → 상태 Store 업데이트 → 카드 UI 실시간 반영

### Phase 12 - lgsb 앱 분기
- [ ] `apps/lgsb` 브랜드 파일 구성 (로고, 앱 이름, 테마 색상)
- [ ] `apps/lgsb/src/config/appConfig.ts` 에 LGSB 고객 발급 model/token 기재
- [ ] `apps/lgsb` Vite + Capacitor + Electron 빌드 확인

### Phase 13 - Capacitor (Android APK)
- [ ] Capacitor 6 초기화 (common + lgsb 각각)
- [ ] 커스텀 UDP 플러그인 (`UdpPlugin.java`) 개발
- [ ] `@capacitor-community/sqlite` 설정
- [ ] `platform/android/index.ts` 에서 구현체 export
- [ ] Gradle 빌드 → APK 서명 → 테스트

### Phase 14 - DB 내보내기/불러오기
- [ ] `ExportService.ts` → groups / devices / group_devices / app_settings 를 JSON으로 직렬화
- [ ] `ImportService.ts` → JSON 파싱 → 스키마 버전 확인 → DB UPSERT (또는 초기화 후 덮어쓰기)
- [ ] Android: Capacitor `Filesystem` 플러그인으로 파일 저장/읽기 + 공유 다이얼로그
- [ ] Windows(Electron): `dialog.showSaveDialog` / `dialog.showOpenDialog` 로 파일 저장/읽기
- [ ] 설정 화면에 [설정 내보내기] / [설정 불러오기] 버튼 추가 (관리자 권한만)
- [ ] 불러오기 전 미리보기(구역 수 / 장치 수 확인) 및 이중 확인 다이얼로그

### Phase 15 - 배포 패키징
- [ ] `electron-builder.yml` → Windows NSIS 인스톨러(.exe) 빌드 (common + lgsb)
- [ ] Capacitor Android → release APK 빌드 (common + lgsb)
- [ ] 버전 관리 및 릴리즈 노트

---

## 16. 환경 설정 파일 예시

### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  // Electron 빌드 시 base를 './'로 변경
  base: process.env.ELECTRON ? './' : '/',
});
```

### capacitor.config.ts
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.localcontrol',
  appName: 'Local Control',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    CapacitorSQLite: { androidIsEncryption: false }
  }
};

export default config;
```

### electron-builder.yml
```yaml
appId: com.yourcompany.localcontrol
productName: LocalControl
directories:
  output: dist-electron
win:
  target: nsis
  icon: public/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

---

## 17. 주요 패키지 목록 (package.json 참고)

### 공통 dependencies
```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "react-router-dom": "^6.26.0",
  "zustand": "^4.5.0",
  "crypto-js": "^4.2.0",
  "lucide-react": "^0.400.0",
  "clsx": "^2.1.0"
}
```

### Electron 전용
```json
{
  "electron": "^30.0.0",
  "electron-builder": "^24.13.0",
  "better-sqlite3": "^9.6.0",
  "concurrently": "^8.2.0"
}
```

### Capacitor (Android)
```json
{
  "@capacitor/cli": "^6.0.0",
  "@capacitor/core": "^6.0.0",
  "@capacitor/android": "^6.0.0",
  "@capacitor-community/sqlite": "^6.0.0"
}
```

---

## 18. 주의사항 및 제약

1. **LifeSmart model / token 빌드 포함** : `model` / `token` 은 DB 에 저장하지 않고 각 앱의 `.env.production` 파일에 기입한 뒤 빌드 시 번들에 포함된다. 발급값은 소스 저장소에 커밋하지 않고 CI/CD Secret 또는 로컬 환경변수로만 관리한다.

2. **UDP 브로드캐스트 제한** : 일부 기업 Wi-Fi 환경에서는 AP isolation(클라이언트 격리)으로 인해 브로드캐스트가 차단될 수 있다. 이 경우 AP isolation을 해제하거나, 앱 설정 화면(관리자 전용)에서 Station IP를 직접 입력하여 `app_settings` 테이블(`key='manual_station_ip'`)에 저장하는 방식으로 대응한다. Station IP는 빌드타임 설정(`appConfig`)에 포함하지 않는다.

3. **Blend 스위치 3구 devtype 식별** : `LivingRoomNatureSwitch3` 에 해당하는 devtype 은 실제 Station 응답의 `eps GET` 에서 확인해야 한다. `SL_NATURE` / `SL_SPOT` 등 여러 devtype 이 3구 스위치에 매핑될 수 있으므로, attribute 의 채널 수 필드 또는 devtype 패턴을 기준으로 `BlendSwitchCard` 분기를 결정한다.

4. **로그인 계정 관리** : 회원가입 기능은 없다. 배포 전 관리자가 SQLite `users` 테이블에 직접 INSERT 하거나, CLI 시드 스크립트(`npm run seed:users`)를 실행하여 계정을 생성한다. 비밀번호는 SHA-256 해시로 저장한다.

5. **모노레포 앱 분리 원칙** : `apps/common` 과 `apps/lgsb` 는 `packages/core` 의 코드를 100% 공유한다. 앱 폴더에는 진입점(`main.tsx`, `App.tsx`), 브랜드 에셋(`brand/`), 빌드 설정(`appConfig.ts`, `vite.config.ts`, `electron-builder.yml`, `capacitor.config.ts`)만 존재한다. 비즈니스 로직을 앱 폴더에 직접 작성하지 않는다.

3. **안드로이드 네트워크 권한** : `AndroidManifest.xml` 에 아래 권한이 필요하다.
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
   <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
   ```

4. **타임스탬프 동기화** : Smart Station 로컬 시간과 앱 시간 차이가 5분 초과 시 서명이 invalid 처리된다. 앱 실행 시 NTP 또는 Station 시간을 기준으로 보정 로직 고려.

5. **에어컨 devtype 다양성** : 에어컨은 `SL_NATURE`, `OD_WE_IRAC`, `SL_CP_DN` 등 다양한 devtype이 존재하며, 각각 args 구조가 다를 수 있다. 처음에는 가장 일반적인 IR AC 타입 하나를 타겟으로 구현한 뒤 devtype 분기를 추가 개발한다.

6. **SQLite WAL 모드** : Android와 Electron 모두 WAL(Write-Ahead Logging)을 활성화하면 읽기/쓰기 동시 접근 성능이 향상된다.
   ```sql
   PRAGMA journal_mode=WAL;
   ```
