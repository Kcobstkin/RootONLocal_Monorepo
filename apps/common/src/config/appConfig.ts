export const APP_CONFIG = {
  auth: {
    model: import.meta.env.VITE_STATION_MODEL ?? 'YOUR_MODEL',
    token: import.meta.env.VITE_STATION_TOKEN ?? 'YOUR_TOKEN',
  },
  udp: {
    listenPort: 12346,
    apiPort: 12348,
    discoveryPort: 12345,
    timeoutMs: 5000,
  },
  brand: {
    appName: 'Local Control',
    appId: 'com.rooton.localcontrol',
  },
} as const;
