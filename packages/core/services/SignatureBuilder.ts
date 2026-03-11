/**
 * LifeSmart Local Protocol 서명 생성기
 *
 * 서명 규칙:
 * 원본 = obj + args(key 오름차순, 배열 필드 제외) + ts + model + token
 * sign = MD5(원본).toLowerCase()
 */

import md5 from 'crypto-js/md5';

export interface LocalSignInput {
  obj: string;
  args: Record<string, unknown>;
  ts: number;
  model: string;
  token: string;
}

/**
 * Local MD5 서명을 생성한다.
 * @param input - 서명 생성에 필요한 입력값
 * @returns 32자리 소문자 hex MD5 해시
 */
export function buildLocalSign(input: LocalSignInput): string {
  const { obj, args, ts, model, token } = input;

  // args 의 key 를 오름차순 정렬 후 key+value 이어붙이기 (배열 필드 제외)
  const sortedKeys = Object.keys(args).sort();
  const argsStr = sortedKeys
    .filter((k) => !Array.isArray(args[k]))
    .map((k) => `${k}${args[k]}`)
    .join('');

  const raw = `${obj}${argsStr}${ts}${model}${token}`;
  return md5(raw).toString();
}
