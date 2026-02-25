import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.doyakmin.gamsa',
  appName: '감사노트',
  webDir: 'out',
  server: {
    // 개발 시: 로컬 서버 사용
    // url: 'http://localhost:3000',
    // 배포 후: Vercel URL로 변경
    // url: 'https://gamsa-app.vercel.app',
    androidScheme: 'https',
  },
};

export default config;
