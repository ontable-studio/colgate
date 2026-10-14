export const env = {
  syncEndpoint: import.meta.env.VITE_SYNC_ENDPOINT ?? '',
  syncSecret: import.meta.env.VITE_SYNC_SECRET ?? '',
  deviceId: import.meta.env.VITE_DEVICE_ID ?? 'booth-01',
  gameVersion: __GAME_VERSION__,
} as const;
