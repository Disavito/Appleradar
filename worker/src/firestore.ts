import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { CONFIG, DEFAULT_SCRAPER_SETTINGS } from './config';
import { FirestoreListing, PriceHistoryRecord, RawListing, ScraperSettings } from './types';

let db: admin.firestore.Firestore;

export function initFirebase() {
  if (admin.apps.length === 0) {
    let credential;

    // 1. Prioridad: Variable de entorno FIREBASE_SERVICE_ACCOUNT (Coolify / Docker)
    if (CONFIG.firebaseServiceAccount && CONFIG.firebaseServiceAccount.trim().length > 10) {
      try {
        let raw = CONFIG.firebaseServiceAccount.trim();
        if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
          raw = raw.slice(1, -1);
        }
        const creds = JSON.parse(raw);
        if (creds.private_key && typeof creds.private_key === 'string') {
          creds.private_key = creds.private_key.replace(/\\n/g, '\n');
        }
        credential = admin.credential.cert(creds);
        console.log(`🔑 Clave Firebase cargada desde variable FIREBASE_SERVICE_ACCOUNT (key_id: ${creds.private_key_id}).`);
      } catch (e) {
        console.warn('Error parseando FIREBASE_SERVICE_ACCOUNT env:', e);
      }
    }

    // 2. Fallback: Buscar serviceAccountKey.json físico local
    if (!credential) {
      const candidates = [
        path.resolve(process.cwd(), 'serviceAccountKey.json'),
        path.resolve(__dirname, '../serviceAccountKey.json'),
        path.resolve('/app/serviceAccountKey.json')
      ];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          try {
            const keyData = JSON.parse(fs.readFileSync(p, 'utf8'));
            credential = admin.credential.cert(keyData);
            console.log(`🔑 Clave Firebase cargada desde archivo: ${p} (key_id: ${keyData.private_key_id})`);
            break;
          } catch (e) {
            console.warn(`Error leyendo archivo de clave en ${p}:`, e);
          }
        }
      }
    }

    if (credential) {
      admin.initializeApp({
        credential,
        projectId: 'macradar-7268f'
      });
      console.log('🔥 Conectado con credenciales válidas a Firebase Firestore (macradar-7268f)');
    } else {
      console.error('❌ NO se encontraron credenciales válidas de Firebase Admin SDK.');
      admin.initializeApp({ projectId: 'macradar-7268f' });
    }
  }

  db = admin.firestore();
  return db;
}

/**
 * Obtiene la configuración dinámica desde Firestore (ciudades, palabras clave, modelo Gemini)
 */
export async function getOrInitScraperSettings(): Promise<ScraperSettings> {
  if (!db) initFirebase();
  const docRef = db.collection(CONFIG.settingsCollection).doc(CONFIG.settingsDocId);
  const snap = await docRef.get();

  if (!snap.exists) {
    await docRef.set({
      ...DEFAULT_SCRAPER_SETTINGS,
      updatedAt: new Date().toISOString()
    });
    console.log('⚙️ Configuración inicial de zonas, keywords y modelo creada en Firestore.');
    return DEFAULT_SCRAPER_SETTINGS;
  }

  const data = snap.data() as Partial<ScraperSettings>;
  return {
    geminiModel: data.geminiModel || DEFAULT_SCRAPER_SETTINGS.geminiModel,
    locations: data.locations && data.locations.length > 0 ? data.locations : DEFAULT_SCRAPER_SETTINGS.locations,
    searchTerms: data.searchTerms && data.searchTerms.length > 0 ? data.searchTerms : DEFAULT_SCRAPER_SETTINGS.searchTerms
  };
}

export async function getSavedFbCookies(): Promise<{ cookies: any[]; rawString?: string; expired?: boolean } | null> {
  if (!db) initFirebase();
  const snap = await db.collection(CONFIG.settingsCollection).doc('fb_session').get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  return {
    cookies: Array.isArray(data.cookies) ? data.cookies : [],
    rawString: typeof data.rawString === 'string' ? data.rawString : undefined,
    expired: Boolean(data.expired)
  };
}

export async function saveRefreshedFbCookies(cookies: any[]): Promise<void> {
  if (!db) initFirebase();
  const essentialNames = new Set(['c_user', 'xs', 'datr', 'fr', 'sb', 'presence', 'ps_l', 'ps_n']);
  const filtered = cookies.filter((c) => essentialNames.has(c.name) && c.domain?.includes('facebook.com'));
  const hasSession = filtered.some((c) => c.name === 'c_user') && filtered.some((c) => c.name === 'xs');
  if (!hasSession) return;

  await db.collection(CONFIG.settingsCollection).doc('fb_session').set(
    {
      cookies: filtered,
      expired: false,
      manualOverride: false,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
}

export async function markFbSessionExpired(expired: boolean): Promise<void> {
  if (!db) initFirebase();
  await db.collection(CONFIG.settingsCollection).doc('fb_session').set(
    {
      expired,
      lastCheckedAt: new Date().toISOString()
    },
    { merge: true }
  );
}

function parseSimplePenPrice(rawPrice: string): number | null {
  const txt = (rawPrice || '').trim();
  if (!/^S\/\s*[\d.,]+$/i.test(txt)) return null;
  // Facebook Peru usa punto como separador de miles: S/3.000 o S/ 2,500
  const numStr = txt.replace(/^S\/\s*/i, '').replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
  const val = Math.round(parseFloat(numStr));
  return Number.isFinite(val) && val > 100 ? val : null;
}

/**
 * Clasifica los anuncios recolectados para evitar cuellos de botella.
 * - Omite 'Otro' (solo accesorios) y 'sold'.
 * - Si solo cambió el precio en Soles (>100), actualiza el precio directo en Firestore sin reabrir el anuncio ni llamar a Gemini.
 * - Solo inspecciona con Playwright + Gemini si es NUEVO, falló Gemini antes, o cambió a precio USD/gancho.
 */
export async function classifyDiscoveredListings(items: RawListing[]): Promise<{
  toInspect: Array<{ item: RawListing; reason: 'new' | 'price_changed' | 'title_changed' | 'retry_gemini' }>;
  unchangedCount: number;
}> {
  if (!db) initFirebase();
  if (items.length === 0) return { toInspect: [], unchangedCount: 0 };

  const toInspect: Array<{ item: RawListing; reason: 'new' | 'price_changed' | 'title_changed' | 'retry_gemini' }> = [];
  let unchangedCount = 0;
  let batch = db.batch();
  let batchOps = 0;

  const batchSize = 30;
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const refs = chunk.map((it) => db.collection(CONFIG.firestoreCollection).doc(it.listingId));
    const snapshots = await db.getAll(...refs);

    for (let j = 0; j < chunk.length; j++) {
      const item = chunk[j];
      const snap = snapshots[j];

      if (!snap.exists) {
        toInspect.push({ item, reason: 'new' });
        continue;
      }

      const existing = snap.data() as Partial<FirestoreListing>;

      if (existing.status === 'sold' || existing.categoria === 'Otro') {
        unchangedCount++;
        continue;
      }

      if (existing.analyzedWithGemini === false) {
        toInspect.push({ item, reason: 'retry_gemini' });
        continue;
      }

      const nowIso = new Date().toISOString();

      // Si cambió el rawPrice en el listado, intentar actualización rápida de precio sin Playwright/Gemini
      if (item.rawPrice && item.rawPrice !== 'No especificado' && existing.rawPrice !== item.rawPrice) {
        const fastPen = parseSimplePenPrice(item.rawPrice);
        const oldPrice = existing.precio_normalizado_pen || existing.currentPrice || 0;

        if (fastPen !== null) {
          const isDrop = oldPrice > 100 && fastPen < oldPrice;
          const nextDropCount = (existing.priceDropCount || 0) + (isDrop ? 1 : 0);

          if (isDrop) {
            const historyRef = snap.ref.collection('historial_precios').doc();
            batch.set(historyRef, {
              previousPrice: oldPrice,
              newPrice: fastPen,
              changeDate: nowIso,
              differencePen: oldPrice - fastPen
            });
            batchOps++;
          }

          batch.update(snap.ref, {
            rawPrice: item.rawPrice,
            precio_normalizado_pen: fastPen,
            currentPrice: fastPen,
            es_precio_gancho: false,
            priceDropCount: nextDropCount,
            lastSeenAt: nowIso,
            updatedAt: nowIso,
            matchedKeywords: admin.firestore.FieldValue.arrayUnion(item.searchTerm)
          });
          batchOps++;
          unchangedCount++;
          continue;
        }

        // Si cambió a USD o precio gancho (S/ 1), re-inspeccionar
        toInspect.push({ item, reason: 'price_changed' });
        continue;
      }

      unchangedCount++;
      batch.update(snap.ref, {
        lastSeenAt: nowIso,
        matchedKeywords: admin.firestore.FieldValue.arrayUnion(item.searchTerm)
      });
      batchOps++;

      if (batchOps >= 400) {
        await batch.commit();
        batch = db.batch();
        batchOps = 0;
      }
    }
  }

  if (batchOps > 0) {
    await batch.commit();
  }

  return { toInspect, unchangedCount };
}

export async function saveOrUpdateListing(
  listing: FirestoreListing
): Promise<{ isPriceDrop: boolean; oldPrice?: number; newPrice: number }> {
  if (!db) initFirebase();

  const docRef = db.collection(CONFIG.firestoreCollection).doc(listing.listingId);
  const snap = await docRef.get();

  if (!snap.exists) {
    await docRef.set({
      ...listing,
      priceDropCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { isPriceDrop: false, newPrice: listing.precio_normalizado_pen };
  }

  const existingData = snap.data() as FirestoreListing;
  const oldPrice = existingData.precio_normalizado_pen || existingData.currentPrice || 0;
  const newPrice = listing.precio_normalizado_pen;

  const isRealPriceDrop =
    !listing.es_precio_gancho &&
    newPrice > 100 &&
    oldPrice > 100 &&
    newPrice < oldPrice;

  let priceDropCount = existingData.priceDropCount || 0;

  if (isRealPriceDrop) {
    priceDropCount += 1;
    const diff = oldPrice - newPrice;
    console.log(`📉 ¡Bajada de precio detectada para ${listing.listingId}! S/ ${oldPrice} -> S/ ${newPrice} (Ahorro: S/ ${diff})`);

    const historyRef = docRef.collection('historial_precios').doc();
    const historyRecord: PriceHistoryRecord = {
      previousPrice: oldPrice,
      newPrice: newPrice,
      changeDate: new Date().toISOString(),
      differencePen: diff
    };
    await historyRef.set(historyRecord);
  }

  // Preservar todas las palabras clave con las que se encontró
  const mergedKeywords = Array.from(
    new Set([...(existingData.matchedKeywords || []), ...(listing.matchedKeywords || [])])
  );

  await docRef.update({
    ...listing,
    matchedKeywords: mergedKeywords,
    priceDropCount,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { isPriceDrop: isRealPriceDrop, oldPrice, newPrice };
}
