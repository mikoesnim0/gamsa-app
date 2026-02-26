import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.doyakmin.gamsa',
  appName: 'Gratella',
  webDir: 'out',
  server: {
    url: 'https://gamsa-app.vercel.app',
    androidScheme: 'https',
  },
};

export default config;
