/**
 * Electron Preload Script
 *
 * contextBridge를 통해 Renderer 프로세스에
 * UDP / SQLite API를 안전하게 노출한다.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── UDP API ────────────────────────────────────────────
  udp: {
    sendAndReceive: (opts: {
      host: string;
      port: number;
      data: number[];
      timeoutMs: number;
    }) => ipcRenderer.invoke('udp:sendAndReceive', opts),

    broadcast: (opts: {
      broadcastPort: number;
      data: number[];
      listenPort: number;
      timeoutMs: number;
    }) => ipcRenderer.invoke('udp:broadcast', opts),

    startListen: (port: number) =>
      ipcRenderer.invoke('udp:startListen', port),

    stopListen: () => ipcRenderer.invoke('udp:stopListen'),

    onMessage: (
      callback: (msg: {
        data: number[];
        remoteIp: string;
        remotePort: number;
      }) => void,
    ) => {
      ipcRenderer.on('udp:message', (_event, msg) => callback(msg));
    },
  },

  // ─── SQLite API ─────────────────────────────────────────
  db: {
    query: (sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:query', sql, params),

    run: (sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:run', sql, params),

    exec: (sql: string) => ipcRenderer.invoke('db:exec', sql),
  },
});
