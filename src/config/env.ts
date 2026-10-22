export const env = {
  deviceId: import.meta.env.VITE_DEVICE_ID ?? 'booth-01',
  gameVersion: __GAME_VERSION__,
} as const;
