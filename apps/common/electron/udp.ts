/**
 * Electron UDP Manager (Node.js dgram)
 *
 * Main Process에서 실행되며,
 * IPC를 통해 Renderer의 IUdpTransport 구현체와 연결된다.
 */

import dgram from 'dgram';

interface UdpMessage {
  data: number[];
  remoteIp: string;
  remotePort: number;
}

export class UdpManager {
  private listenSocket: dgram.Socket | null = null;

  /**
   * 단발성 요청 → 응답 수신
   */
  async sendAndReceive(opts: {
    host: string;
    port: number;
    data: number[];
    timeoutMs: number;
  }): Promise<UdpMessage> {
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
        resolve({
          data: Array.from(msg),
          remoteIp: rinfo.address,
          remotePort: rinfo.port,
        });
      });

      socket.on('error', (err) => {
        clearTimeout(timer);
        socket.close();
        reject(err);
      });

      socket.send(buf, opts.port, opts.host);
    });
  }

  /**
   * UDP Broadcast 전송 → 다수 응답 수집 (Discovery)
   */
  async broadcast(opts: {
    broadcastPort: number;
    data: number[];
    listenPort: number;
    timeoutMs: number;
  }): Promise<UdpMessage[]> {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      const results: UdpMessage[] = [];
      const buf = Buffer.from(opts.data);

      socket.on('error', (err) => {
        socket.close();
        reject(err);
      });

      socket.bind(opts.listenPort, () => {
        socket.setBroadcast(true);

        const timer = setTimeout(() => {
          socket.close();
          resolve(results);
        }, opts.timeoutMs ?? 3000);

        socket.on('message', (msg, rinfo) => {
          results.push({
            data: Array.from(msg),
            remoteIp: rinfo.address,
            remotePort: rinfo.port,
          });
        });

        socket.send(buf, opts.broadcastPort, '255.255.255.255', (err) => {
          if (err) {
            clearTimeout(timer);
            socket.close();
            reject(err);
          }
        });
      });
    });
  }

  /**
   * 이벤트 수신 Listen 시작 (NOTIFY)
   */
  startListen(port: number, onMessage: (msg: UdpMessage) => void): void {
    if (this.listenSocket) {
      this.stopListen();
    }

    this.listenSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.listenSocket.on('message', (msg, rinfo) => {
      onMessage({
        data: Array.from(msg),
        remoteIp: rinfo.address,
        remotePort: rinfo.port,
      });
    });

    this.listenSocket.on('error', (err) => {
      console.error('[UdpManager] Listen error:', err.message);
      this.stopListen();
    });

    this.listenSocket.bind(port, () => {
      console.log(`[UdpManager] Listening on UDP port ${port}`);
    });
  }

  /**
   * Listen 종료
   */
  stopListen(): void {
    if (this.listenSocket) {
      try {
        this.listenSocket.close();
      } catch {
        // already closed
      }
      this.listenSocket = null;
      console.log('[UdpManager] Listen stopped');
    }
  }
}
