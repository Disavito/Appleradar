import { chromium, Browser, BrowserContext, Page } from 'patchright';
import { CONFIG } from './config';
import { RawListing, DetailedListing } from './types';

export class ScraperService {
  private browser: Browser | null = null;

  async initBrowser(): Promise<Browser> {
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled'
      ]
    };

    if (CONFIG.proxyServer) {
      launchOptions.proxy = {
        server: CONFIG.proxyServer,
        username: CONFIG.proxyUser || undefined,
        password: CONFIG.proxyPass || undefined
      };
      console.log(`🌐 Usando proxy configurado: ${CONFIG.proxyServer}`);
    } else {
      console.log('ℹ️ Corriendo sin proxy residencial (conexión directa)');
    }

    this.browser = await chromium.launch(launchOptions);
    return this.browser;
  }

  async createContext(): Promise<BrowserContext> {
    if (!this.browser) {
      await this.initBrowser();
    }

    const context = await this.browser!.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'es-PE',
      viewport: { width: 1280, height: 800 }
    });

    return context;
  }

  /**
   * Configura bloqueo estricto de recursos pesados para ahorrar ancho de banda
   */
  async setupResourceBlocking(page: Page) {
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      // Bloquear imágenes, fuentes, estilos pesados y medios
      if (['image', 'media', 'font'].includes(resourceType)) {
        return route.abort();
      }
      return route.continue();
    });
  }

  /**
   * Extrae los anuncios del listado inicial de búsqueda
   */
  async scrapeSearchList(
    page: Page,
    cityPath: string,
    cityName: 'Arequipa' | 'Lima',
    searchTerm: string
  ): Promise<RawListing[]> {
    const encodedTerm = encodeURIComponent(searchTerm);
    const searchUrl = `https://www.facebook.com/marketplace/${cityPath}/search?query=${encodedTerm}`;
    console.log(`🔎 Explorando búsqueda: ${cityName} -> "${searchTerm}"`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Pequeña espera para hidratación de contenido dinámico
    await page.waitForTimeout(3000);

    // Scroll ligero para cargar los primeros resultados
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(2000);

    // Extraer enlaces a anuncios de Marketplace
    const rawItems = await page.evaluate(
      ({ cityName, searchTerm }) => {
        const results: Array<{
          listingId: string;
          title: string;
          rawPrice: string;
          itemUrl: string;
          city: 'Arequipa' | 'Lima';
          searchTerm: string;
          scrapedAt: string;
        }> = [];

        // Buscar enlaces con formato /marketplace/item/{id}
        const links = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));
        const seenIds = new Set<string>();

        for (const link of links) {
          const href = (link as HTMLAnchorElement).href;
          const match = href.match(/\/marketplace\/item\/(\d+)/);
          if (!match) continue;

          const listingId = match[1];
          if (seenIds.has(listingId)) continue;
          seenIds.add(listingId);

          // Extraer texto dentro del bloque del card
          const cardText = (link.textContent || '').trim();
          const lines = cardText.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);

          // La estructura común suele contener Precio en una línea y Título en otra
          let rawPrice = '';
          let title = '';

          for (const line of lines) {
            if (/^(S\/|\$|PEN|USD|Gratis|\d+)/i.test(line) && !rawPrice) {
              rawPrice = line;
            } else if (line.length > 5 && !title && line !== rawPrice) {
              title = line;
            }
          }

          results.push({
            listingId,
            title: title || cardText.slice(0, 80),
            rawPrice: rawPrice || 'No especificado',
            itemUrl: `https://www.facebook.com/marketplace/item/${listingId}/`,
            city: cityName as 'Arequipa' | 'Lima',
            searchTerm,
            scrapedAt: new Date().toISOString()
          });
        }

        return results;
      },
      { cityName, searchTerm }
    );

    console.log(`📌 Encontrados ${rawItems.length} anuncios para "${searchTerm}" en ${cityName}`);
    return rawItems;
  }

  /**
   * Abre la URL individual del anuncio para extraer descripción y ubicación exacta
   */
  async scrapeItemDetails(page: Page, rawListing: RawListing): Promise<DetailedListing> {
    console.log(`📄 Abriendo anuncio individual: ${rawListing.listingId} (${rawListing.itemUrl})`);

    await page.goto(rawListing.itemUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    const details = await page.evaluate(() => {
      // Intentar extraer descripción y ubicación
      // Facebook usa diferentes selectores y spans anidados para descripción
      let description = '';
      let locationText = '';

      // Buscar posibles encabezados de detalles o descripción
      const bodyText = document.body.innerText || '';

      // Búsqueda de ubicación típica en Marketplace
      const spans = Array.from(document.querySelectorAll('span'));
      for (const span of spans) {
        const txt = (span.textContent || '').trim();
        if (/Ubicación|Location/i.test(txt)) {
          const nextEl = span.parentElement?.nextElementSibling || span.nextElementSibling;
          if (nextEl) locationText = (nextEl.textContent || '').trim();
        }
        if (/Descripción|Description/i.test(txt)) {
          const descEl = span.parentElement?.nextElementSibling || span.nextElementSibling;
          if (descEl) description = (descEl.textContent || '').trim();
        }
      }

      // Si no se encontró por selectores específicos, buscar párrafos largos
      if (!description) {
        const paragraphs = Array.from(document.querySelectorAll('div[dir="auto"], span[dir="auto"]'))
          .map((el) => (el.textContent || '').trim())
          .filter((t) => t.length > 30 && !t.includes('Facebook') && !t.includes('Marketplace'));

        if (paragraphs.length > 0) {
          // El párrafo más largo con alta probabilidad es la descripción
          paragraphs.sort((a, b) => b.length - a.length);
          description = paragraphs[0];
        }
      }

      return {
        description: description || 'Sin descripción detallada disponible en el anuncio.',
        locationText: locationText || ''
      };
    });

    return {
      ...rawListing,
      description: details.description,
      locationText: details.locationText || rawListing.city
    };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
