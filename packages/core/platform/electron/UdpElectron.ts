/**
 * Electron UDP Transport 구현 (Renderer 프로세스)
 *
 * preload.ts 에서 노출된 electronAPI.udp 를 통해
 * Main 프로세스의 Node.js dgram 에 IPC 요청을 보낸다.
 */

import type { IUdpTransport } from '../../services/IUdpTransport';
import type { UdpSendOptions, UdpResponse } from '../../types/protocol.types';

interface ElectronUdpAPI {
  sendAndReceive: (opts: {
    host: string;
    port: number;
    data: number[];
    timeoutMs: number;
  }) => Promise<{ data: number[]; remoteIp: string; remotePort: number }>;
  broadcast: (opts: {
    broadcastPort: number;
    data: number[];
    listenPort: number;
    timeoutMs: number;
  }) => Promise<
    { data: number[]; remoteIp: string; remotePort: number }[]
  >;
  startListen: (port: number) => Promise<void>;
  stopListen: () => Promise<void>;
  onMessage: (
    callback: (msg: { data: number[]; remoteIp: string; remotePort: number }) => void,
  ) => void;
}

function getElectronUdpAPI(): ElectronUdpAPI {
  const api = (window as unknown as Record<string, unknown>).electronAPI as
    | { udp: ElectronUdpAPI }
    | undefined;
  if (!api?.udp) {
    throw new Error('Electron UDP API not available');
  }
  return api.udp;
}

export class UdpElectron implements IUdpTransport {
  async sendAndReceive(options: UdpSendOptions): Promise<UdpResponse> {
    const api = getElectronUdpAPI();
    const result = await api.sendAndReceive({
      host: options.host,
      port: options.port,
      data: Array.from(options.data),
      timeoutMs: options.timeoutMs ?? 5000,
    });
    return {
      data: new Uint8Array(result.data),
      remoteIp: result.remoteIp,
      remotePort: result.remotePort,
    };
  }

  async broadcast(
    port: number,
    data: Uint8Array,
    listenPort: number,
    timeoutMs: number,
  ): Promise<UdpResponse[]> {
    const api = getElectronUdpAPI();
    const results = await api.broadcast({
      broadcastPort: port,
      data: Array.from(data),
      listenPort,
      timeoutMs,
    });
    return results.map((r) => ({
      data: new Uint8Array(r.data),
      remoteIp: r.remoteIp,
      remotePort: r.remotePort,
    }));
  }

  async startListen(
    port: number,
    onMessage: (resp: UdpResponse) => void,
  ): Promise<void> {
    const api = getElectronUdpAPI();
    api.onMessage((msg) => {
      onMessage({
        data: new Uint8Array(msg.data),
        remoteIp: msg.remoteIp,
        remotePort: msg.remotePort,
      });
    });
    await api.startListen(port);
  }

  async stopListen(): Promise<void> {
    const api = getElectronUdpAPI();
    await api.stopListen();
  }
}
