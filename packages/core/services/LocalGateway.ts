/**
 * LocalGateway - Smart Station과 UDP 통신을 수행하는 핵심 게이트웨이
 */

import { buildLocalPacket, parseLocalPacket } from './PacketBuilder';
import { buildLocalSign } from './SignatureBuilder';
import { PkgType } from '../types/protocol.types';
import type { IUdpTransport } from './IUdpTransport';

export interface StationConfig {
  ip: string;
  port: number;
  model: string;
  token: string;
}

export class LocalGateway {
  constructor(
    private readonly transport: IUdpTransport,
    private readonly station: StationConfig,
  ) {}

  private buildRequest(
    obj: string,
    args: Record<string, unknown>,
    id: number,
  ) {
    const ts = Math.floor(Date.now() / 1000);
    const sign = buildLocalSign({
      obj,
      args,
      ts,
      model: this.station.model,
      token: this.station.token,
    });
    return {
      sys: { ver: 1, sign, model: this.station.model, ts },
      obj,
      args,
      id,
    };
  }

  /** 장치 전체 목록 조회 (eps GET) */
  async getDevices() {
    const body = this.buildRequest('eps', {}, 1001);
    const packet = buildLocalPacket(PkgType.GET, JSON.stringify(body));
    const resp = await this.transport.sendAndReceive({
      host: this.station.ip,
      port: this.station.port,
      data: packet,
      timeoutMs: 5000,
    });
    return parseLocalPacket(resp.data);
  }

  /** 단일 장치 상태 조회 (ep GET) */
  async getDeviceStatus(me: string) {
    const body = this.buildRequest('ep', { me }, 1002);
    const packet = buildLocalPacket(PkgType.GET, JSON.stringify(body));
    const resp = await this.transport.sendAndReceive({
      host: this.station.ip,
      port: this.station.port,
      data: packet,
      timeoutMs: 5000,
    });
    return parseLocalPacket(resp.data);
  }

  /** 장치 제어 (ep SET) */
  async setDevice(me: string, args: Record<string, unknown>) {
    const fullArgs = { me, ...args };
    const body = this.buildRequest('ep', fullArgs, Date.now());
    const packet = buildLocalPacket(PkgType.SET, JSON.stringify(body));
    const resp = await this.transport.sendAndReceive({
      host: this.station.ip,
      port: this.station.port,
      data: packet,
      timeoutMs: 5000,
    });
    return parseLocalPacket(resp.data);
  }

  /** 이벤트 수신 등록 (config SET) */
  async registerEventListener(appIp: string, appPort: number) {
    const args = {
      type: 'notify',
      subtype: 'add',
      ip: appIp,
      port: appPort,
    };
    const body = this.buildRequest('config', args, 9000);
    const packet = buildLocalPacket(PkgType.SET, JSON.stringify(body));
    const resp = await this.transport.sendAndReceive({
      host: this.station.ip,
      port: this.station.port,
      data: packet,
      timeoutMs: 5000,
    });
    return parseLocalPacket(resp.data);
  }
}
