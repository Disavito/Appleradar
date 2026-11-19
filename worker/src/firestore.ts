import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';
import { FirestoreListing, PriceHistoryRecord } from './types';

let db: admin.firestore.Firestore;

export function initFirebase() {
  if (admin.apps.length === 0) {
    let credential;

    // 1. Verificar si viene JSON en string directo
    if (CONFIG.firebaseServiceAccount && CONFIG.firebaseServiceAccount.trim().startsWith('{')) {
      const creds = JSON.parse(CONFIG.firebaseServiceAccount);
      credential = admin.credential.cert(creds);
    } 
    // 2. Verificar si es una ruta especificada
    else if (CONFIG.firebaseServiceAccount) {
      const resolvedPath = path.resolve(process.cwd(), CONFIG.firebaseServiceAccount);
      if (fs.existsSync(resolvedPath)) {
        credential = admin.credential.cert(resolvedPath);
      }
    }

    // 3. Fallback: buscar serviceAccountKey.json en la raíz del worker si no se encontró arriba
    if (!credential) {
      const localKeyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      if (fs.existsSync(localKeyPath)) {
        credential = admin.credential.cert(localKeyPath);
      }
    }

    if (credential) {
      admin.initializeApp({
        credential,
        projectId: 'macradar-7268f'
      });
      console.log('🔥 Conectado con éxito a Firebase Firestore (macradar-7268f)');
    } else {
      console.warn('⚠️ No se encontró serviceAccountKey.json. Usando credenciales de entorno por defecto.');
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
