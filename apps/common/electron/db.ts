/**
 * Electron SQLite Manager (better-sqlite3)
 *
 * Main Process에서 실행되며,
 * IPC를 통해 Renderer의 ISqliteRepository 구현체와 연결된다.
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// 스키마 SQL (inline — packages/core를 직접 import할 수 없으므로 별도 관리)
const SCHEMA_SQL = `
PRAGMA journal_mode=WAL;

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

CREATE TABLE IF NOT EXISTS group_devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id    INTEGER NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
  device_id   INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(group_id, device_id)
);

CREATE TABLE IF NOT EXISTS dashboard_devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  device_id   INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, device_id)
);

CREATE TABLE IF NOT EXISTS device_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   INTEGER NOT NULL REFERENCES devices(id),
  action      TEXT NOT NULL,
  payload     TEXT,
  result      TEXT,
  success     INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;

/** 시드 사용자 SQL (SHA-256 해시) */
const SEED_USERS_SQL = `
INSERT OR IGNORE INTO users (login_id, password, name, user_level)
VALUES ('admin@local', 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270', '관리자', 1);

INSERT OR IGNORE INTO users (login_id, password, name, user_level)
VALUES ('manager@local', '7b7686ab7dddaa1566a4922a9f8f964eb2d0b2fd193648e4fd7c0a81a708164b', '매니저', 5);

INSERT OR IGNORE INTO users (login_id, password, name, user_level)
VALUES ('user@local', '831c237928e6212bedaa4451a514ace3174562f6761f6a157a2fe5082b36e2fb', '사용자', 10);
`;

export class DbManager {
  private db: Database.Database | null = null;

  /**
   * DB 파일 경로 (AppData/Roaming/앱이름/localcontrol.db)
   */
  private getDbPath(): string {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    return path.join(userDataPath, 'localcontrol.db');
  }

  /**
   * DB 초기화 - 테이블 생성 / WAL 모드 설정
   */
  async initialize(): Promise<void> {
    const dbPath = this.getDbPath();
    console.log(`[DbManager] Opening DB at: ${dbPath}`);

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA_SQL);

    // 시드 사용자 삽입 (이미 존재하면 무시)
    this.db.exec(SEED_USERS_SQL);

    console.log('[DbManager] DB initialized successfully');
  }

  /**
   * SELECT 쿼리 실행 (결과 배열 반환)
   */
  query(sql: string, params?: unknown[]): unknown[] {
    this.ensureDb();
    const stmt = this.db!.prepare(sql);
    return params ? stmt.all(...params) : stmt.all();
  }

  /**
   * INSERT / UPDATE / DELETE 실행 (결과 info 반환)
   */
  run(
    sql: string,
    params?: unknown[],
  ): { lastInsertRowid: number; changes: number } {
    this.ensureDb();
    const stmt = this.db!.prepare(sql);
    const result = params ? stmt.run(...params) : stmt.run();
    return {
      lastInsertRowid: Number(result.lastInsertRowid),
      changes: result.changes,
    };
  }

  /**
   * 다중 SQL 문 실행 (스키마 생성 등)
   */
  exec(sql: string): void {
    this.ensureDb();
    this.db!.exec(sql);
  }

  private ensureDb(): void {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }
}
