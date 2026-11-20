import { chromium, Browser, BrowserContext, Page } from 'patchright';
import { CONFIG } from './config';
import { RawListing, DetailedListing } from './types';

export class ScraperService {
  private browser: Browser | null = null;
  public loginWallDetected = false;

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

  private parseRawCookieString(raw: string): any[] {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }
    const result: any[] = [];
    for (const part of trimmed.split(';')) {
      const eqIdx = part.indexOf('=');
      if (eqIdx > 0) {
        const name = part.slice(0, eqIdx).trim();
        const val = part.slice(eqIdx + 1).trim();
        if (name && val) {
          result.push({ name, value: val, domain: '.facebook.com', path: '/' });
        }
      }
    }
    return result;
  }

  async createContext(
    firestoreSession?: { cookies: any[]; rawString?: string } | null
  ): Promise<BrowserContext> {
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

    // Cargar cookies: 1) Firestore (auto-rotadas o pegadas desde Dashboard), 2) Env FB_COOKIES, 3) fb_cookies.json
    try {
      let cookies: any[] = [];

      if (firestoreSession?.rawString && firestoreSession.rawString.trim().length > 0) {
        cookies = this.parseRawCookieString(firestoreSession.rawString);
        console.log(`🍪 Cargadas ${cookies.length} cookies actualizadas desde Dashboard/Firestore.`);
      } else if (firestoreSession?.cookies && firestoreSession.cookies.length > 0) {
        cookies = firestoreSession.cookies;
        console.log(`🍪 Cargadas ${cookies.length} cookies auto-renovadas desde Firestore.`);
      } else if (process.env.FB_COOKIES && process.env.FB_COOKIES.trim().length > 0) {
        cookies = this.parseRawCookieString(process.env.FB_COOKIES);
        console.log(`🍪 Cargadas ${cookies.length} cookies desde variable FB_COOKIES.`);
      } else {
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
            console.log(`🍪 Cargadas ${cookies.length} cookies desde archivo local ${p}.`);
            break;
          }
        }
      }

      if (cookies.length > 0) {
        await context.addCookies(cookies);
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
    cityName: string,
    searchTerm: string,
    category: string
  ): Promise<RawListing[]> {
    const encodedTerm = encodeURIComponent(searchTerm);
    const searchUrl = `https://www.facebook.com/marketplace/${cityPath}/search?query=${encodedTerm}`;
    console.log(`🔎 Explorando búsqueda: ${cityName} [${category}] -> "${searchTerm}"`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // Si aparece pantalla de login o perfil guardado, intentar login si hay credenciales configuradas
    const needsAuth = await page.evaluate(() => {
      const txt = document.body.innerText || '';
      return txt.includes('Iniciar sesión') || txt.includes('Log in') || txt.includes('Continuar');
    });

    if (needsAuth && process.env.FB_EMAIL && process.env.FB_PASSWORD) {
      console.log('🔐 Intentando inicio de sesión con FB_EMAIL y FB_PASSWORD...');
      try {
        const passInput = await page.$('input[type="password"]');
        if (passInput) {
          const emailInput = await page.$('input[name="email"], input#email');
          if (emailInput) {
            await emailInput.fill(process.env.FB_EMAIL);
          }
          await passInput.fill(process.env.FB_PASSWORD);
          await page.click('button[name="login"], button[type="submit"], div[role="button"]:has-text("Iniciar sesión")').catch(() => {});
          await page.waitForTimeout(5000);
          if (!page.url().includes('/marketplace/')) {
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
            await page.waitForTimeout(3000);
          }
        }
      } catch (err) {
        console.warn('Detalle en login con contraseña:', err);
      }
    }

    // Scroll progresivo (hasta 4 tandas) para cargar más de los primeros 24-33 resultados
    let previousCount = 0;
    for (let s = 0; s < 4; s++) {
      await page.evaluate(() => window.scrollBy(0, 2400));
      await page.waitForTimeout(1800);
      const currentCount = await page.evaluate(
        () => document.querySelectorAll('a[href*="/marketplace/item/"]').length
      );
      if (currentCount <= previousCount && s >= 1) {
        break; // No cargaron más anuncios
      }
      previousCount = currentCount;
    }

    const rawItems = await page.evaluate(
      ({ cityName, searchTerm, category }) => {
        const results: Array<{
          listingId: string;
          title: string;
          rawPrice: string;
          itemUrl: string;
          city: string;
          searchTerm: string;
          category: string;
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

          const rawText = ((link as HTMLElement).innerText || link.textContent || '').trim();
          const lines = rawText
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !/^(Recién publicado|Just listed)$/i.test(s));

          let rawPrice = '';
          let title = '';
          let cardCity = '';

          for (const line of lines) {
            if (/^(S\/|US\$|\$|PEN|USD|Gratis)/i.test(line) && !rawPrice) {
              rawPrice = line;
            } else if (/^[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+,\s*[A-Z]{2}$/.test(line)) {
              cardCity = line;
            } else if (line.length > 4 && !title && line !== rawPrice) {
              title = line;
            }
          }

          let cleanTitle = (title || rawText.slice(0, 120))
            .replace(/^(Recién publicado|Just listed)\s*/i, '')
            .replace(/^(?:S\/\s*[\d.,]+|\$\s*[\d.,]+|US\$\s*[\d.,]+){1,2}\s*/i, '')
            .trim();

          const trailingCityMatch = cleanTitle.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?,\s*(?:PU|MO|AR|LI|CU|PI|LA|TA|JU|IC|CA|AN|AY|SM|LO|UC|TU|AP|HU|PA|AM|HV|MD))\s*$/);
          if (trailingCityMatch) {
            if (!cardCity) cardCity = trailingCityMatch[1];
            cleanTitle = cleanTitle.slice(0, trailingCityMatch.index).trim();
          }

          results.push({
            listingId,
            title: cleanTitle || title || rawText.slice(0, 80),
            rawPrice: rawPrice || 'No especificado',
            itemUrl: `https://www.facebook.com/marketplace/item/${listingId}/`,
            city: cardCity || cityName,
            searchTerm,
            category,
            scrapedAt: new Date().toISOString()
          });
        }

        return results;
      },
      { cityName, searchTerm, category }
    );

    if (rawItems.length === 0) {
      const isLoginWall = await page.evaluate(() => {
        const txt = (document.body.innerText || '').slice(0, 400);
        return (
          txt.includes('Iniciar sesión en Facebook') ||
          txt.includes('Escanea el código QR') ||
          txt.includes('Log in to Facebook')
        );
      });
      if (isLoginWall) {
        this.loginWallDetected = true;
        console.warn('🔒 Sesión de Facebook expirada o bloqueada (muro de login detectado).');
      }
    }

    console.log(`📌 Encontrados ${rawItems.length} anuncios para "${searchTerm}" en ${cityName}`);
    return rawItems;
  }

  private parsePublishedTextToIso(publishedText: string): string {
    const now = Date.now();
    const txt = (publishedText || '').toLowerCase();
    if (!txt) return new Date(now).toISOString();

    const numMatch = txt.match(/(\d+)/);
    const num = numMatch ? parseInt(numMatch[1], 10) : 1;

    let offsetMs = 0;
    if (/minuto|minute|min\b/.test(txt)) offsetMs = num * 60 * 1000;
    else if (/hora|hour|hr\b/.test(txt)) offsetMs = num * 3600 * 1000;
    else if (/día|dias|días|day/.test(txt)) offsetMs = num * 86400 * 1000;
    else if (/semana|week/.test(txt)) offsetMs = num * 7 * 86400 * 1000;
    else if (/mes|month/.test(txt)) offsetMs = num * 30 * 86400 * 1000;
    else if (/año|year/.test(txt)) offsetMs = num * 365 * 86400 * 1000;

    return new Date(now - offsetMs).toISOString();
  }

  async scrapeItemDetails(page: Page, rawListing: RawListing): Promise<DetailedListing> {
    console.log(`📄 Abriendo anuncio individual: ${rawListing.listingId} (${rawListing.itemUrl})`);

    await page.goto(rawListing.itemUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForTimeout(3000);

    const details = await page.evaluate(() => {
      let description = '';
      let locationText = '';
      let publishedText = '';

      const bodyText = document.body.innerText || '';
      const isSold =
        /Vendido|Sold|Este anuncio ya no está disponible|no está disponible/i.test(bodyText.slice(0, 600));

      // Buscar fecha de publicación ("Publicado hace...", "Listed ... ago")
      const pubMatch = bodyText.match(/(Publicado hace [^\n·]+|Listed [^\n·]+ ago|Hace \d+ [^\n·]+)/i);
      if (pubMatch) {
        publishedText = pubMatch[1].trim();
      }

      const spans = Array.from(document.querySelectorAll('span'));
      for (const span of spans) {
        const txt = (span.textContent || '').trim();
        if (!publishedText && /^(Publicado|Listed)\b/i.test(txt) && txt.length < 60) {
          publishedText = txt;
        }
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
        locationText: locationText || '',
        publishedText,
        isSold
      };
    });

    return {
      ...rawListing,
      description: details.description,
      locationText: details.locationText || rawListing.city,
      publishedText: details.publishedText || '',
      publishedAtEstimated: this.parsePublishedTextToIso(details.publishedText),
      isSold: details.isSold
    };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
