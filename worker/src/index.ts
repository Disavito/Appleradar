import cron from 'node-cron';
import { CONFIG } from './config';
import { ScraperService } from './scraper';
import { filterExistingListingIds, saveOrUpdateListing, initFirebase } from './firestore';
import { extractSpecsWithGemini } from './gemini';
import { FirestoreListing, RawListing } from './types';

// Función para generar un número aleatorio entre min y max (milisegundos)
function getRandomDelay(minSeconds: number, maxSeconds: number): number {
  return Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runScrapingCycle() {
  console.log(`\n======================================================`);
  console.log(`🚀 INICIANDO CICLO DE SCRAPING MACRADAR [${new Date().toISOString()}]`);
  console.log(`======================================================\n`);

  const scraper = new ScraperService();

  try {
    const context = await scraper.createContext();
    const page = await context.newPage();
    await scraper.setupResourceBlocking(page);

    const allDiscoveredItems: RawListing[] = [];

    // 1. Recorrer ubicaciones y términos de búsqueda para obtener listado inicial
    for (const loc of CONFIG.locations) {
      for (const term of CONFIG.searchTerms) {
        try {
          const items = await scraper.scrapeSearchList(page, loc.path, loc.city, term);
          allDiscoveredItems.push(...items);
        } catch (err) {
          console.error(`Error buscando "${term}" en ${loc.city}:`, err);
        }

        // Pausa breve de cortesía entre búsquedas (3 a 6 seg)
        await sleep(getRandomDelay(3, 6));
      }
    }

    // Deduplicar items encontrados en la misma corrida
    const uniqueMap = new Map<string, RawListing>();
    for (const item of allDiscoveredItems) {
      if (!uniqueMap.has(item.listingId)) {
        uniqueMap.set(item.listingId, item);
      }
    }
    const uniqueItems = Array.from(uniqueMap.values());
    console.log(`\n📊 Total de anuncios únicos recolectados en listados: ${uniqueItems.length}`);

    // 2. Consultar en Firestore cuáles IDs son NUEVOS
    const allListingIds = uniqueItems.map((it) => it.listingId);
    const newListingIds = await filterExistingListingIds(allListingIds);
    const newListingIdSet = new Set(newListingIds);

    console.log(`✨ Anuncios NUEVOS detectados que requieren inspección detallada: ${newListingIds.length}`);

    const itemsToProcess = uniqueItems.filter((it) => newListingIdSet.has(it.listingId));

    // 3. Solo para los IDs nuevos, abrir la URL individual con pausas de 6 a 14 segundos
    let processedCount = 0;
    for (const rawItem of itemsToProcess) {
      processedCount++;
      const pauseMs = getRandomDelay(6, 14);
      console.log(`\n[${processedCount}/${itemsToProcess.length}] Esperando ${(pauseMs / 1000).toFixed(1)}s antes de inspeccionar ${rawItem.listingId}...`);
      await sleep(pauseMs);

      try {
        // Extraer descripción y ubicación completa
        const detailedItem = await scraper.scrapeItemDetails(page, rawItem);

        // 4. Enviar a Gemini 2.5 Flash para extracción estructurada
        console.log(`🤖 Analizando anuncio con Gemini 2.5 Flash...`);
        const specs = await extractSpecsWithGemini(
          detailedItem.title,
          detailedItem.rawPrice,
          detailedItem.description,
          detailedItem.locationText
        );

        console.log(`  Chip: ${specs.chip} | Precio PEN: S/ ${specs.precio_normalizado_pen} | ¿Gancho?: ${specs.es_precio_gancho}`);

        const firestoreRecord: FirestoreListing = {
          ...detailedItem,
          ...specs,
          currentPrice: specs.precio_normalizado_pen,
          updatedAt: new Date().toISOString()
        };

        // 5. Guardar en Firestore y registrar bajada de precio si aplica
        const { isPriceDrop, oldPrice, newPrice } = await saveOrUpdateListing(firestoreRecord);

        if (isPriceDrop && oldPrice !== undefined) {
          console.log(`📉 Bajada de precio guardada en Firestore para ${firestoreRecord.listingId}: S/ ${oldPrice} -> S/ ${newPrice}`);
        }

      } catch (err) {
        console.error(`Error procesando item individual ${rawItem.listingId}:`, err);
      }
    }

    console.log(`\n✅ Ciclo finalizado exitosamente. Total procesados: ${processedCount}`);
    await context.close();
  } catch (globalErr) {
    console.error('Error crítico durante el ciclo de scraping:', globalErr);
  } finally {
    await scraper.close();
  }
}

// Inicializar base de datos
initFirebase();

// Ejecución inicial inmediata si está en modo desarrollo o test
if (process.env.RUN_ON_BOOT === 'true') {
  console.log('🔄 RUN_ON_BOOT activado: Ejecutando primer ciclo de prueba...');
  runScrapingCycle();
}

// Configurar Cron periódicamente (ej: cada 3 horas)
console.log(`⏰ Programando cron schedule: "${CONFIG.cronSchedule}"`);
cron.schedule(CONFIG.cronSchedule, async () => {
  // Jitter aleatorio de 1 a 10 minutos para no ejecutar exactamente en el segundo 0
  const jitterMinutes = Math.floor(Math.random() * 10) + 1;
  console.log(`⏳ Jitter de seguridad activado: esperando ${jitterMinutes} minutos antes de arrancar...`);
  await sleep(jitterMinutes * 60 * 1000);
  await runScrapingCycle();
});

console.log('🛰️ MacRadar Worker iniciado y en espera...');
