/** SQLite 스키마 정의 - 테이블 생성 SQL */

export const SCHEMA_SQL = `
-- WAL 모드 활성화
PRAGMA journal_mode=WAL;

-- 사용자 계정
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  login_id    TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  user_level  INTEGER DEFAULT 10,
  permissions TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Smart Station 목록
CREATE TABLE IF NOT EXISTS stations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lsid        TEXT NOT NULL UNIQUE,
  name        TEXT,
  ip          TEXT NOT NULL,
  port        INTEGER DEFAULT 12348,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- 구역 그룹 (2-level 트리)
CREATE TABLE IF NOT EXISTS groups (
  group_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  groupname   TEXT NOT NULL,
  node        INTEGER NOT NULL DEFAULT 2,
  root_id     INTEGER DEFAULT 0,
  sort_order  INTEGER DEFAULT 0,
  backimg     TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- 장치 목록
CREATE TABLE IF NOT EXISTS devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id  INTEGER NOT NULL REFERENCES stations(id),
  me          TEXT NOT NULL,
  agt         TEXT,
  name        TEXT NOT NULL,
  dev_type    TEXT NOT NULL,
  attribute   TEXT,
  last_stat   TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(station_id, me)
);

-- 그룹별 장치 매핑 (Junction Table)
CREATE TABLE IF NOT EXISTS group_devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id    INTEGER NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
  device_id   INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(group_id, device_id)
);

-- 대시보드 장치 (사용자별)
CREATE TABLE IF NOT EXISTS dashboard_devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  device_id   INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, device_id)
);

-- 제어 이력
CREATE TABLE IF NOT EXISTS device_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   INTEGER NOT NULL REFERENCES devices(id),
  action      TEXT NOT NULL,
  payload     TEXT,
  result      TEXT,
  success     INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- 앱 설정
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;

/** 초기 사용자 시드 SQL (배포 전 관리자가 실행) */
export const SEED_ADMIN_SQL = `
INSERT OR IGNORE INTO users (login_id, password, name, user_level)
VALUES ('admin@local', 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270', '관리자', 1);

INSERT OR IGNORE INTO users (login_id, password, name, user_level)
VALUES ('manager@local', '7b7686ab7dddaa1566a4922a9f8f964eb2d0b2fd193648e4fd7c0a81a708164b', '매니저', 5);

INSERT OR IGNORE INTO users (login_id, password, name, user_level)
VALUES ('user@local', '831c237928e6212bedaa4451a514ace3174562f6761f6a157a2fe5082b36e2fb', '사용자', 10);
`;
