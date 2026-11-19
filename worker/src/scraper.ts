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
      console.log(`🌐 Usando proxy: ${CONFIG.proxyServer}`);
    } else {
      console.log('ℹ️ Modo directo (sin proxy).');
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
      locale: 'es-PE',
      timezoneId: 'America/Lima',
      viewport: { width: 1366, height: 768 }
    });

    try {
      let cookies: any[] = [];
      const fs = require('fs');
      const path = require('path');
      const candidates = [
        path.resolve(process.cwd(), 'fb_cookies.json'),
        path.resolve(__dirname, '../fb_cookies.json'),
        '/app/fb_cookies.json'
      ];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          cookies = JSON.parse(fs.readFileSync(p, 'utf8'));
          break;
        }
      }

      if (cookies.length === 0 && process.env.FB_COOKIES) {
        if (process.env.FB_COOKIES.trim().startsWith('[')) {
          cookies = JSON.parse(process.env.FB_COOKIES);
        } else {
          const parts = process.env.FB_COOKIES.split(';');
          for (const part of parts) {
            const [name, val] = part.trim().split('=');
            if (name && val) {
              cookies.push({
                name: name.trim(),
                value: val.trim(),
                domain: '.facebook.com',
                path: '/'
              });
            }
          }
        }
      }

      if (cookies.length > 0) {
        await context.addCookies(cookies);
        console.log(`🍪 ${cookies.length} cookies de sesión de Facebook inyectadas.`);
      }
    } catch (e) {
      console.warn('Advertencia inyectando cookies:', e);
    }

    return context;
  }

  async setupResourceBlocking(page: Page) {
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
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

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // Si aparece la tarjeta de perfil "Diego Vito - Continuar", hacer clic y navegar a destino
    const isProfilePrompt = await page.evaluate(() => {
      return document.body.innerText.includes('Continuar') && document.body.innerText.includes('Diego Vito');
    });

    if (isProfilePrompt) {
      console.log('👆 Detectado perfil guardado. Desbloqueando sesión...');
      try {
        // En Facebook esta tarjeta suele ser un botón o link general
        await page.locator('text=Continuar').first().click({ timeout: 5000 }).catch(async () => {
          await page.click('[role="button"]').catch(() => {});
        });
        await page.waitForTimeout(4000);

        // Si aún no redirigió a la búsqueda tras el clic, volver a cargar la URL de marketplace
        if (!page.url().includes('/marketplace/')) {
          console.log('🔄 Re-ingresando a Marketplace post-continuar...');
          await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
          await page.waitForTimeout(3000);
        }
      } catch (err) {
        console.warn('Detalle al dar clic en continuar:', err);
      }
    }

    // Diagnóstico exacto del HTML que recibe el navegador
    const debugInfo = await page.evaluate(() => {
      const title = document.title;
      const snippet = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200);
      return { title, snippet };
    });

    console.log(`📄 Título de página: "${debugInfo.title}"`);
    console.log(`📝 Texto visible en pantalla: "${debugInfo.snippet}"`);

    // Scroll para forzar render de React en Marketplace
    await page.evaluate(() => window.scrollBy(0, 1500));
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
