export interface LocationConfig {
  city: string;
  path: string;
  enabled: boolean;
}

export interface SearchTermConfig {
  term: string;
  category: string;
  enabled: boolean;
}

export interface ScraperSettings {
  locations: LocationConfig[];
  searchTerms: SearchTermConfig[];
  geminiModel: string;
  triggerNow?: boolean;
  updatedAt?: string;
}

export interface ListingItem {
  id: string;
  listingId: string;
  title: string;
  categoria?: 'MacBook Pro' | 'MacBook Air' | 'MacBook' | 'iPad' | 'Mac Mini' | 'iMac' | 'iPhone' | 'Otro';
  category?: string;
  chip: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'A-Series' | 'Intel' | 'Desconocido';
  pulgadas: number | null;
  ram_gb: number | null;
  almacenamiento_gb: number | null;
  incluye_caja: boolean;
  incluye_cargador: boolean;
  ciclos_bateria: number | null;
  porcentaje_bateria?: number | null;
  moneda: 'PEN' | 'USD';
  precio_normalizado_pen: number;
  es_precio_gancho: boolean;
  price_corrected?: boolean;
  distrito_ciudad: string;
  city: string;
  searchTerm?: string;
  matchedKeywords?: string[];
  tags?: string[];
  status?: 'active' | 'sold';
  priceDropCount?: number;
  geminiModelUsed?: string;
  analyzedWithGemini?: boolean;
  description?: string;
  locationText?: string;
  itemUrl: string;
  scrapedAt: string;
  lastSeenAt?: string;
  updatedAt?: any;
}

export interface ScrapedProduct {
  id: string;
  listingId: string;
  title: string;
  family: 'MacBook' | 'iPad' | 'iPhone' | 'Neo' | 'Mac' | 'Otro';
  line: 'Pro' | 'Air' | 'Mini' | 'Max' | 'Standard';
  chip: string;
  storageGb: number | null;
  ramGb: number | null;
  batteryCycles: number | null;
  batteryPct: number | null;
  includes: string[];
  city: string;
  district: string;
  locationFormatted: string;
  publishedAt: string;
  pricePen: number;
  currency: 'PEN' | 'USD';
  price_corrected: boolean;
  hook_price: boolean;
  priceDropCount: number;
  status: 'active' | 'sold';
  matchedKeywords: string[];
  tags: string[];
  itemUrl: string;
  raw: ListingItem;
}

export function toScrapedProduct(item: ListingItem): ScrapedProduct {
  const cat = item.categoria || item.category || '';
  const titleLower = (item.title || '').toLowerCase();

  let family: ScrapedProduct['family'] = 'MacBook';
  if (cat.includes('iPad') || titleLower.includes('ipad')) family = 'iPad';
  else if (cat.includes('iPhone') || titleLower.includes('iphone')) family = 'iPhone';
  else if (titleLower.includes('neo')) family = 'Neo';
  else if (cat.includes('Mac Mini') || cat.includes('iMac')) family = 'Mac';
  else if (cat === 'Otro' && !titleLower.includes('macbook')) family = 'Otro';

  let line: ScrapedProduct['line'] = 'Standard';
  if (cat.includes('Pro') || titleLower.includes('pro')) line = 'Pro';
  else if (cat.includes('Air') || titleLower.includes('air')) line = 'Air';
  else if (titleLower.includes('mini')) line = 'Mini';
  else if (titleLower.includes('max')) line = 'Max';

  const includes: string[] = [];
  if (item.incluye_caja) includes.push('Caja');
  if (item.incluye_cargador) includes.push('Cargador');
  if (includes.length === 0) includes.push('Solo equipo');

  const city = item.city || 'Perú';
  let district = (item.distrito_ciudad || '').trim();
  // Evitar repetir "Lima, Lima" o "Arequipa, Arequipa"
  if (district.toLowerCase() === city.toLowerCase()) {
    district = '';
  } else if (district.toLowerCase().endsWith(`, ${city.toLowerCase()}`)) {
    district = district.slice(0, -(city.length + 2)).trim();
  }
  const locationFormatted = district ? `${city} - ${district}` : city;

  const isHook = Boolean(item.es_precio_gancho || item.precio_normalizado_pen <= 50);
  const isCorrected = Boolean(item.price_corrected && !isHook);

  return {
    id: item.id || item.listingId,
    listingId: item.listingId,
    title: item.title,
    family,
    line,
    chip: item.chip || 'Desconocido',
    storageGb: item.almacenamiento_gb ?? null,
    ramGb: item.ram_gb ?? null,
    batteryCycles: item.ciclos_bateria ?? null,
    batteryPct: item.porcentaje_bateria ?? null,
    includes,
    city,
    district,
    locationFormatted,
    publishedAt: item.scrapedAt || new Date().toISOString(),
    pricePen: item.precio_normalizado_pen || 0,
    currency: item.moneda || 'PEN',
    price_corrected: isCorrected,
    hook_price: isHook,
    priceDropCount: item.priceDropCount || 0,
    status: item.status || 'active',
    matchedKeywords: item.matchedKeywords || (item.searchTerm ? [item.searchTerm] : []),
    tags: item.tags || [],
    itemUrl: item.itemUrl,
    raw: item
  };
}
