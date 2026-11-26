import appConfig from '../../app.json';

const LANDING_URL = process.env.EXPO_PUBLIC_LANDING_URL ?? 'http://localhost:9004';

export const TERMS_URL = `${LANDING_URL}/terms`;
export const PRIVACY_URL = `${LANDING_URL}/privacy`;
export const VERSOLUTIONS_URL = 'https://getversolutions.com';
export const APP_VERSION = appConfig.expo.version;
