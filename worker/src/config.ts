import dotenv from 'dotenv';
import { ScraperSettings } from './types';
dotenv.config();

export const DEFAULT_SCRAPER_SETTINGS: ScraperSettings = {
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  locations: [
    { city: 'Lima', path: 'lima', enabled: true },
    { city: 'Arequipa', path: 'arequipa', enabled: true },
    { city: 'Trujillo', path: 'trujillo', enabled: false },
    { city: 'Cusco', path: 'cusco', enabled: false },
    { city: 'Piura', path: 'piura', enabled: false },
    { city: 'Chiclayo', path: 'chiclayo', enabled: false },
    { city: 'Huancayo', path: 'huancayo', enabled: false },
    { city: 'Tacna', path: 'tacna', enabled: false },
    { city: 'Ica', path: 'ica', enabled: false },
    { city: 'Cajamarca', path: 'cajamarca', enabled: false },
    { city: 'Juliaca', path: 'juliaca', enabled: false },
    { city: 'Pucallpa', path: 'pucallpa', enabled: false },
    { city: 'Iquitos', path: 'iquitos', enabled: false },
    { city: 'Chimbote', path: 'chimbote', enabled: false }
  ],
  searchTerms: [
    { term: 'MacBook Pro M1', category: 'MacBook Pro', enabled: true },
    { term: 'MacBook Pro M2', category: 'MacBook Pro', enabled: true },
    { term: 'MacBook Pro M3', category: 'MacBook Pro', enabled: true },
    { term: 'MacBook Pro M4', category: 'MacBook Pro', enabled: true },
    { term: 'MacBook Pro M5', category: 'MacBook Pro', enabled: true },
    { term: 'MacBook Air M1', category: 'MacBook Air', enabled: true },
    { term: 'MacBook Air M2', category: 'MacBook Air', enabled: true },
    { term: 'MacBook Air M3', category: 'MacBook Air', enabled: true },
    { term: 'MacBook Air M4', category: 'MacBook Air', enabled: false },
    { term: 'MacBook Neo', category: 'MacBook', enabled: false },
    { term: 'MacBook Pro i9', category: 'MacBook Pro', enabled: false },
    { term: 'Mac Mini M1', category: 'Mac Mini', enabled: false },
    { term: 'Mac Mini M2', category: 'Mac Mini', enabled: false },
    { term: 'Mac Mini M4', category: 'Mac Mini', enabled: false },
    { term: 'iMac M1', category: 'iMac', enabled: false },
    { term: 'iMac M3', category: 'iMac', enabled: false },
    { term: 'iPad Pro M1', category: 'iPad', enabled: false },
    { term: 'iPad Pro M2', category: 'iPad', enabled: false },
    { term: 'iPad Pro M4', category: 'iPad', enabled: false },
    { term: 'iPad Air M1', category: 'iPad', enabled: false },
    { term: 'iPad Air M2', category: 'iPad', enabled: false },
    { term: 'iPhone 15 Pro', category: 'iPhone', enabled: false },
    { term: 'iPhone 16 Pro', category: 'iPhone', enabled: false }
  ]
};

export const CONFIG = {
  // Proxies
  proxyServer: process.env.PROXY_SERVER || '',
  proxyUser: process.env.PROXY_USER || '',
  proxyPass: process.env.PROXY_PASS || '',

  // Gemini API
  geminiApiKey: process.env.GEMINI_API_KEY || '',

  // Firebase
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',
  firestoreCollection: process.env.FIRESTORE_COLLECTION || 'listings',
  settingsCollection: 'settings',
  settingsDocId: 'scraper',

  // Cron schedule (default: every 3 hours with random jitter)
  cronSchedule: process.env.CRON_SCHEDULE || '0 */3 * * *'
};
