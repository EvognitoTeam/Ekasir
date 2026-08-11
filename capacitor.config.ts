import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.my.evognito.ekasir',
  appName: 'Ekasir POS',
  webDir: 'dist',

  server: {
    url: 'https://dev-ekasir.evognito.my.id/login',
    cleartext: false
  }
};

export default config;