import cron from 'node-cron';
import admin from 'firebase-admin';
import { CONFIG } from './config';
import { ScraperService } from './scraper';
import {
  getOrInitScraperSettings,
  classifyDiscoveredListings,
  saveOrUpdateListing,
  initFirebase
} from './firestore';
import { extractSpecsWithGemini } from './gemini';
import { FirestoreListing, RawListing } from './types';

function getRandomDelay(minSeconds: number, maxSeconds: number): number {
  return Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let isCycleRunning = false;

async function runScrapingCycle() {
  if (isCycleRunning) {
    console.log('⚠️ Ya hay un ciclo de scraping en ejecución. Omitiendo solapamiento.');
    return;
  }

  isCycleRunning = true;
  console.log(`\n======================================================`);
  console.log(`🚀 INICIANDO CICLO DE SCRAPING APPLERADAR [${new Date().toISOString()}]`);
  console.log(`======================================================\n`);

  const scraper = new ScraperService();

  try {
    // Cargar configuración dinámica desde Firestore (zonas, keywords, modelo Gemini)
    const settings = await getOrInitScraperSettings();
    const activeLocations = settings.locations.filter((l) => l.enabled);
    const activeTerms = settings.searchTerms.filter((t) => t.enabled);
    const geminiModel = settings.geminiModel || 'gemini-2.5-flash';

    console.log(`🤖 Modelo Gemini activo: ${geminiModel}`);
    console.log(`📍 Zonas activas (${activeLocations.length}): ${activeLocations.map((l) => l.city).join(', ')}`);
    console.log(`🔑 Palabras clave activas (${activeTerms.length}): ${activeTerms.map((t) => t.term).join(', ')}`);

    if (activeLocations.length === 0 || activeTerms.length === 0) {
      console.log('⚠️ No hay zonas o palabras clave habilitadas en la configuración. Finalizando ciclo.');
      return;
    }

    const context = await scraper.createContext();
    const page = await context.newPage();
    await scraper.setupResourceBlocking(page);

    const allDiscoveredItems: RawListing[] = [];

    // 1. Recorrer zonas del Perú y palabras clave habilitadas
    for (const loc of activeLocations) {
      for (const kw of activeTerms) {
        try {
          const items = await scraper.scrapeSearchList(page, loc.path, loc.city, kw.term, kw.category);
          allDiscoveredItems.push(...items);
        } catch (err) {
          console.error(`Error buscando "${kw.term}" en ${loc.city}:`, err);
        }
        await sleep(getRandomDelay(3, 6));
      }
    }

    // Deduplicar items encontrados en la misma corrida (preservando la primera ocurrencia)
    const uniqueMap = new Map<string, RawListing>();
    for (const item of allDiscoveredItems) {
      if (!uniqueMap.has(item.listingId)) {
        uniqueMap.set(item.listingId, item);
      }
    }
    const uniqueItems = Array.from(uniqueMap.values());
    console.log(`\n📊 Total de anuncios únicos recolectados en listados: ${uniqueItems.length}`);

    // 2. Clasificar en Firestore: solo inspeccionar nuevos, cambios de precio o reintentos
    const { toInspect, unchangedCount } = await classifyDiscoveredListings(uniqueItems);
    console.log(`⏭️  Omitidos (ya analizados sin cambios): ${unchangedCount}`);
    console.log(`✨ Anuncios a inspeccionar (nuevos / cambio precio / reintento): ${toInspect.length}`);

    // 3. Inspeccionar únicamente los necesarios con pausas de 6 a 14 segundos
    let processedCount = 0;
    for (const entry of toInspect) {
      const rawItem = entry.item;
      processedCount++;
      const pauseMs = getRandomDelay(6, 14);
      console.log(
        `\n[${processedCount}/${toInspect.length}] (${entry.reason}) Esperando ${(pauseMs / 1000).toFixed(1)}s antes de inspeccionar ${rawItem.listingId}...`
      );
      await sleep(pauseMs);

      try {
        const detailedItem = await scraper.scrapeItemDetails(page, rawItem);

        console.log(`🤖 Analizando con ${geminiModel}...`);
        const { specs, success } = await extractSpecsWithGemini(
          detailedItem.title,
          detailedItem.rawPrice,
          detailedItem.description,
          detailedItem.locationText,
          detailedItem.searchTerm,
          geminiModel
        );

        console.log(
          `  [${specs.categoria}] Chip: ${specs.chip} | S/ ${specs.precio_normalizado_pen} | Tags: ${specs.tags.join(', ')} | Vendido: ${detailedItem.isSold}`
        );

        const nowIso = new Date().toISOString();
        const firestoreRecord: FirestoreListing = {
          ...detailedItem,
          ...specs,
          currentPrice: specs.precio_normalizado_pen,
          status: detailedItem.isSold ? 'sold' : 'active',
          matchedKeywords: [rawItem.searchTerm],
          analyzedWithGemini: success,
          geminiModelUsed: geminiModel,
          lastSeenAt: nowIso,
          updatedAt: nowIso
        };

        const { isPriceDrop, oldPrice, newPrice } = await saveOrUpdateListing(firestoreRecord);
        if (isPriceDrop && oldPrice !== undefined) {
          console.log(`📉 Bajada de precio registrada en Firestore para ${firestoreRecord.listingId}: S/ ${oldPrice} -> S/ ${newPrice}`);
        }
      } catch (err) {
        console.error(`Error procesando item individual ${rawItem.listingId}:`, err);
      }
    }

    console.log(`\n✅ Ciclo finalizado exitosamente. Procesados: ${processedCount} | Sin cambios: ${unchangedCount}`);
    await context.close();
  } catch (globalErr) {
    console.error('Error crítico durante el ciclo de scraping:', globalErr);
  } finally {
    await scraper.close();
    isCycleRunning = false;
  }
}

// Inicializar base de datos
const db = initFirebase();

// Escuchar disparos manuales desde el Dashboard ("Escanear Ahora")
db.collection(CONFIG.settingsCollection)
  .doc(CONFIG.settingsDocId)
  .onSnapshot((snap) => {
    const data = snap.data() as any;
    if (data && data.triggerNow === true) {
      console.log('⚡ Disparo manual recibido desde el Dashboard!');
      snap.ref.update({ triggerNow: false }).catch(() => {});
      runScrapingCycle();
    }
  });

// Ejecución inicial inmediata al arrancar
if (process.env.RUN_ON_BOOT === 'true') {
  console.log('🔄 RUN_ON_BOOT activado: Ejecutando primer ciclo...');
  runScrapingCycle();
}

// Cron cada 3 horas con jitter
console.log(`⏰ Programando cron schedule: "${CONFIG.cronSchedule}"`);
cron.schedule(CONFIG.cronSchedule, async () => {
  const jitterMinutes = Math.floor(Math.random() * 10) + 1;
  console.log(`⏳ Jitter de seguridad activado: esperando ${jitterMinutes} minutos antes de arrancar...`);
  await sleep(jitterMinutes * 60 * 1000);
  await runScrapingCycle();
});

console.log('🛰️ AppleRadar Worker iniciado y en espera...');
