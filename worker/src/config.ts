import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  // Proxies
  proxyServer: process.env.PROXY_SERVER || '',
  proxyUser: process.env.PROXY_USER || '',
  proxyPass: process.env.PROXY_PASS || '',

  // Gemini API
  geminiApiKey: process.env.GEMINI_API_KEY || '',

  // Firebase
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '', // JSON string or path
  firestoreCollection: process.env.FIRESTORE_COLLECTION || 'listings',

  // Cron schedule (default: every 3 hours with random jitter)
  cronSchedule: process.env.CRON_SCHEDULE || '0 */3 * * *',

  // Facebook Marketplace base locations
  locations: [
    { city: 'Arequipa' as const, path: 'arequipa' },
    { city: 'Lima' as const, path: 'lima' }
  ],

  // Search terms
  searchTerms: [
    'MacBook Pro M1',
    'MacBook Pro M2',
    'MacBook Pro M3',
    'MacBook Pro M4',
    'MacBook Pro M5'
  ]
};
