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
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
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
      console.log('ℹ️ Modo directo (sin proxy). Aplicando camuflaje de navegador y headers realistas.');
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
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'es-PE,es;q=0.9,en;q=0.8',
      timezoneId: 'America/Lima',
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-PE,es-419;q=0.9,es;q=0.8,en;q=0.7',
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    // Si el usuario configuró cookies de Facebook, inyectarlas
    if (process.env.FB_COOKIES) {
      try {
        let cookies = [];
        if (process.env.FB_COOKIES.trim().startsWith('[')) {
          cookies = JSON.parse(process.env.FB_COOKIES);
        } else {
          // Formato c_user=xxxx; xs=yyyy
          const parts = process.env.FB_COOKIES.split(';');
          for (const part of parts) {
            const [name, val] = part.trim().split('=');
            if (name && val) {
              cookies.push({
                name,
                value: val,
                domain: '.facebook.com',
                path: '/'
              });
            }
          }
        }
        await context.addCookies(cookies);
        console.log('🍪 Sesión de Facebook inyectada exitosamente.');
      } catch (e) {
        console.warn('Advertencia parseando FB_COOKIES:', e);
      }
    }

    return context;
  }

  async setupResourceBlocking(page: Page) {
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      // Bloquear imágenes, fuentes y medios para ahorrar ancho de banda y acelerar carga
      if (['image', 'media', 'font'].includes(resourceType)) {
        return route.abort();
      }
      return route.continue();
    });
  }

  async scrapeSearchList(
    page: Page,
    cityPath: string,
    cityName: 'Arequipa' | 'Lima',
    searchTerm: string
  ): Promise<RawListing[]> {
    const encodedTerm = encodeURIComponent(searchTerm);
    const searchUrl = `https://www.facebook.com/marketplace/${cityPath}/search?query=${encodedTerm}`;
    console.log(`🔎 Explorando búsqueda: ${cityName} -> "${searchTerm}"`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 50000 });
    await page.waitForTimeout(4000);

    // Si aparece un popup de cookies o login de Facebook, intentar cerrarlo si es posible
    try {
      const closeButtons = await page.$$('div[aria-label="Cerrar"], div[aria-label="Close"], [aria-label="Decline optional cookies"]');
      for (const btn of closeButtons) {
        await btn.click().catch(() => {});
      }
    } catch (_) {}

    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(2500);

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

        const links = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));
        const seenIds = new Set<string>();

        for (const link of links) {
          const href = (link as HTMLAnchorElement).href;
          const match = href.match(/\/marketplace\/item\/(\d+)/);
          if (!match) continue;

          const listingId = match[1];
          if (seenIds.has(listingId)) continue;
          seenIds.add(listingId);

          const cardText = (link.textContent || '').trim();
          const lines = cardText.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);

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

  async scrapeItemDetails(page: Page, rawListing: RawListing): Promise<DetailedListing> {
    console.log(`📄 Abriendo anuncio individual: ${rawListing.listingId} (${rawListing.itemUrl})`);

    await page.goto(rawListing.itemUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForTimeout(3000);

    const details = await page.evaluate(() => {
      let description = '';
      let locationText = '';

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

      if (!description) {
        const paragraphs = Array.from(document.querySelectorAll('div[dir="auto"], span[dir="auto"]'))
          .map((el) => (el.textContent || '').trim())
          .filter((t) => t.length > 30 && !t.includes('Facebook') && !t.includes('Marketplace'));

        if (paragraphs.length > 0) {
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
