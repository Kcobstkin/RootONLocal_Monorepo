/**
 * Electron Preload Script (LGSB)
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
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

  db: {
    query: (sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:query', sql, params),

    run: (sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:run', sql, params),

    exec: (sql: string) => ipcRenderer.invoke('db:exec', sql),
  },

  // ─── File API (내보내기/불러오기) ────────────────────────
  file: {
    saveJson: (jsonStr: string, defaultName: string) =>
      ipcRenderer.invoke('file:saveJson', jsonStr, defaultName),

    openJson: () => ipcRenderer.invoke('file:openJson'),
  },
});
