/**
 * seed-users.ts - 사용자 시드 스크립트
 *
 * 배포 전 관리자가 실행하여 초기 사용자를 생성한다.
 * Usage: npx ts-node packages/core/scripts/seed-users.ts
 *
 * 주의: 이 스크립트는 Electron (Node.js) 환경에서만 실행 가능
 */

import * as crypto from 'crypto';

/** SHA-256 해시 생성 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/** 시드 사용자 목록 */
const SEED_USERS = [
  {
    login_id: 'admin@local',
    password: 'admin1234',
    name: '관리자',
    user_level: 1, // 슈퍼관리자
  },
  {
    login_id: 'manager@local',
    password: 'manager1234',
    name: '매니저',
    user_level: 5, // 관리자
  },
  {
    login_id: 'user@local',
    password: 'user1234',
    name: '사용자',
    user_level: 10, // 일반 사용자
  },
];

/**
 * 시드 SQL 생성
 * Electron main process의 better-sqlite3에서 실행할 SQL을 출력한다.
 */
function generateSeedSQL(): string {
  const lines = SEED_USERS.map((u) => {
    const hash = hashPassword(u.password);
    return `INSERT OR IGNORE INTO users (login_id, password, name, user_level) VALUES ('${u.login_id}', '${hash}', '${u.name}', ${u.user_level});`;
  });

  return lines.join('\n');
}

// 실행
console.log('=== 사용자 시드 SQL ===\n');
console.log(generateSeedSQL());
console.log('\n=== 시드 사용자 목록 ===');
SEED_USERS.forEach((u) => {
  console.log(`  ${u.login_id} / ${u.password} (level: ${u.user_level})`);
});
console.log(
  '\n이 SQL을 DB 초기화 시점에서 실행하거나, Electron main process에서 실행하세요.',
);

// 해시값 내보내기 (다른 곳에서 사용할 수 있도록)
export const SEED_SQL = generateSeedSQL();
export { hashPassword, SEED_USERS };
