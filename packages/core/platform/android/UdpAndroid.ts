/**
 * Android UDP Transport 구현 (Capacitor Plugin)
 */

import type { IUdpTransport } from '../../services/IUdpTransport';
import type { UdpSendOptions, UdpResponse } from '../../types/protocol.types';

// Capacitor 플러그인은 별도 패키지에서 제공
// 여기서는 인터페이스만 정의하고, 실제 구현은 capacitor-udp 플러그인 패키지에서 처리한다.

interface CapacitorUdpPlugin {
  sendAndReceive(options: {
    host: string;
    port: number;
    data: number[];
    timeoutMs: number;
  }): Promise<{ data: number[]; remoteIp: string; remotePort: number }>;
  broadcast(options: {
    broadcastPort: number;
    data: number[];
    listenPort: number;
    timeoutMs: number;
  }): Promise<{ results: { data: number[]; remoteIp: string; remotePort: number }[] }>;
  startListen(options: { port: number }): Promise<void>;
  stopListen(): Promise<void>;
  addListener(
    eventName: 'udpMessage',
    callback: (msg: { data: number[]; remoteIp: string; remotePort: number }) => void,
  ): Promise<{ remove: () => void }>;
}

// Capacitor 런타임에서 동적으로 로드
function getUdpPlugin(): CapacitorUdpPlugin {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Capacitor = (window as any).Capacitor;
  if (!Capacitor?.Plugins?.UdpPlugin) {
    throw new Error('Capacitor UdpPlugin not available');
  }
  return Capacitor.Plugins.UdpPlugin as CapacitorUdpPlugin;
}

export class UdpAndroid implements IUdpTransport {
  private listenerHandle: { remove: () => void } | null = null;

  async sendAndReceive(options: UdpSendOptions): Promise<UdpResponse> {
    const plugin = getUdpPlugin();
    const result = await plugin.sendAndReceive({
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
    const plugin = getUdpPlugin();
    const result = await plugin.broadcast({
      broadcastPort: port,
      data: Array.from(data),
      listenPort,
      timeoutMs,
    });
    return result.results.map((r) => ({
      data: new Uint8Array(r.data),
      remoteIp: r.remoteIp,
      remotePort: r.remotePort,
    }));
  }

  async startListen(
    port: number,
    onMessage: (resp: UdpResponse) => void,
  ): Promise<void> {
    const plugin = getUdpPlugin();
    this.listenerHandle = await plugin.addListener('udpMessage', (msg) => {
      onMessage({
        data: new Uint8Array(msg.data),
        remoteIp: msg.remoteIp,
        remotePort: msg.remotePort,
      });
    });
    await plugin.startListen({ port });
  }

  async stopListen(): Promise<void> {
    const plugin = getUdpPlugin();
    await plugin.stopListen();
    this.listenerHandle?.remove();
    this.listenerHandle = null;
  }
}
