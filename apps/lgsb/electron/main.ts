/**
 * Electron Main Process (LGSB)
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { UdpManager } from './udp';
import { DbManager } from './db';

const udp = new UdpManager();
const db = new DbManager();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── UDP IPC ─────────────────────────────────────────────────

ipcMain.handle('udp:sendAndReceive', async (_event, opts) => {
  return udp.sendAndReceive(opts);
});

ipcMain.handle('udp:broadcast', async (_event, opts) => {
  return udp.broadcast(opts);
});

ipcMain.handle('udp:startListen', async (_event, port: number) => {
  udp.startListen(port, (msg: { data: number[]; remoteIp: string; remotePort: number }) => {
    mainWindow?.webContents.send('udp:message', msg);
  });
});

ipcMain.handle('udp:stopListen', async () => {
  udp.stopListen();
});

// ─── SQLite IPC ──────────────────────────────────────────────

ipcMain.handle('db:query', async (_event, sql: string, params?: unknown[]) => {
  return db.query(sql, params);
});

ipcMain.handle('db:run', async (_event, sql: string, params?: unknown[]) => {
  return db.run(sql, params);
});

ipcMain.handle('db:exec', async (_event, sql: string) => {
  return db.exec(sql);
});

// ─── App Lifecycle ───────────────────────────────────────────

app.whenReady().then(async () => {
  await db.initialize();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
