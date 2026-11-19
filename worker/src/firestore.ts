import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';
import { FirestoreListing, PriceHistoryRecord } from './types';

let db: admin.firestore.Firestore;

export function initFirebase() {
  if (admin.apps.length === 0) {
    let credential;

    // 1. Prioridad: Variable de entorno FIREBASE_SERVICE_ACCOUNT (Coolify / Docker)
    if (CONFIG.firebaseServiceAccount && CONFIG.firebaseServiceAccount.trim().length > 10) {
      try {
        let raw = CONFIG.firebaseServiceAccount.trim();
        // Remover comillas envolventes si Coolify/Docker las añadió
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

export async function filterExistingListingIds(ids: string[]): Promise<string[]> {
  if (!db) initFirebase();
  if (ids.length === 0) return [];

  const newIds: string[] = [];
  const batchSize = 30;
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    const refs = chunk.map(id => db.collection(CONFIG.firestoreCollection).doc(id));
    const snapshots = await db.getAll(...refs);

    for (const snap of snapshots) {
      if (!snap.exists) {
        newIds.push(snap.id);
      }
    }
  }

  return newIds;
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

  if (isRealPriceDrop) {
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

  await docRef.update({
    ...listing,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { isPriceDrop: isRealPriceDrop, oldPrice, newPrice };
}
