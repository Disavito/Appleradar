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
  categoria?:
    | 'MacBook Pro'
    | 'MacBook Air'
    | 'MacBook'
    | 'Mac Mini'
    | 'iMac'
    | 'Mac Studio'
    | 'iPad'
    | 'iPhone'
    | 'Otro';
  category?: string;
  chip: string;
  chip_variante?: 'Base' | 'Pro' | 'Max' | 'Ultra' | 'N/A';
  pulgadas: number | null;
  ram_gb: number | null;
  almacenamiento_gb: number | null;
  incluye_caja: boolean;
  incluye_cargador: boolean;
  ciclos_bateria: number | null;
  porcentaje_bateria?: number | null;
  condicion_estetica?: 'Sellado' | 'Como nuevo' | 'Buen estado' | 'Con detalle' | 'No indica';
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
  publishedText?: string;
  publishedAtEstimated?: string;
  itemUrl: string;
  scrapedAt: string;
  lastSeenAt?: string;
  updatedAt?: any;
}

export interface ScrapedProduct {
  id: string;
  listingId: string;
  title: string;
  family: 'MacBook' | 'Mac Mini' | 'iMac' | 'Mac Studio' | 'iPad' | 'iPhone' | 'Neo' | 'Otro';
  line: 'Pro' | 'Air' | 'Mini' | 'Max' | 'Standard';
  chip: string;
  chipVariant: string;
  chipDisplay: string;
  screenSize: number | null;
  storageGb: number | null;
  ramGb: number | null;
  batteryCycles: number | null;
  batteryPct: number | null;
  condition: string;
  includes: string[];
  city: string;
  district: string;
  locationFormatted: string;
  publishedAt: string;
  publishedText: string;
  isNew24h: boolean;
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
  if (cat === 'Mac Mini') family = 'Mac Mini';
  else if (cat === 'iMac') family = 'iMac';
  else if (cat === 'Mac Studio') family = 'Mac Studio';
  else if (cat === 'iPad') family = 'iPad';
  else if (cat === 'iPhone') family = 'iPhone';
  else if (cat === 'MacBook Pro' || cat === 'MacBook Air' || cat === 'MacBook') {
    family = titleLower.includes('neo') ? 'Neo' : 'MacBook';
  } else if (cat === 'Otro') {
    family = 'Otro';
  } else {
    // Fallback solo si no hay categoria de Gemini
    if (titleLower.includes('mac mini')) family = 'Mac Mini';
    else if (titleLower.includes('imac')) family = 'iMac';
    else if (titleLower.includes('mac studio')) family = 'Mac Studio';
    else if (titleLower.includes('ipad')) family = 'iPad';
    else if (titleLower.includes('iphone')) family = 'iPhone';
    else if (titleLower.includes('neo')) family = 'Neo';
  }

  let line: ScrapedProduct['line'] = 'Standard';
  if (cat === 'MacBook Pro') line = 'Pro';
  else if (cat === 'MacBook Air') line = 'Air';
  else if (family === 'MacBook' && titleLower.includes('pro')) line = 'Pro';
  else if (family === 'MacBook' && titleLower.includes('air')) line = 'Air';
  else if ((family === 'iPad' || family === 'iPhone') && titleLower.includes('pro')) line = 'Pro';
  else if (family === 'iPad' && titleLower.includes('air')) line = 'Air';
  else if ((family === 'iPad' || family === 'iPhone') && titleLower.includes('mini')) line = 'Mini';
  else if (family === 'iPhone' && titleLower.includes('max')) line = 'Max';

  const chip = item.chip || 'Desconocido';
  const chipVariant = item.chip_variante && item.chip_variante !== 'N/A' && item.chip_variante !== 'Base'
    ? item.chip_variante
    : '';
  const chipDisplay = chipVariant ? `${chip} ${chipVariant}` : chip;

  const includes: string[] = [];
  if (item.incluye_caja) includes.push('Caja');
  if (item.incluye_cargador) includes.push('Cargador');
  if (includes.length === 0) includes.push('Solo equipo');

  const city = item.city || 'Perú';
  let district = (item.distrito_ciudad || '').trim();
  if (district.toLowerCase() === city.toLowerCase()) {
    district = '';
  } else if (district.toLowerCase().endsWith(`, ${city.toLowerCase()}`)) {
    district = district.slice(0, -(city.length + 2)).trim();
  }
  const locationFormatted = district ? `${city} - ${district}` : city;

  const isHook = Boolean(item.es_precio_gancho || item.precio_normalizado_pen <= 50);
  const isCorrected = Boolean(item.price_corrected && !isHook);

  const pubMs = item.publishedAtEstimated ? new Date(item.publishedAtEstimated).getTime() : 0;
  const isNew24h = pubMs > 0 && Date.now() - pubMs <= 24 * 3600 * 1000;

  return {
    id: item.id || item.listingId,
    listingId: item.listingId,
    title: item.title,
    family,
    line,
    chip,
    chipVariant: item.chip_variante || 'Base',
    chipDisplay,
    screenSize: item.pulgadas ?? null,
    storageGb: item.almacenamiento_gb ?? null,
    ramGb: item.ram_gb ?? null,
    batteryCycles: item.ciclos_bateria ?? null,
    batteryPct: item.porcentaje_bateria ?? null,
    condition: item.condicion_estetica || 'No indica',
    includes,
    city,
    district,
    locationFormatted,
    publishedAt: item.publishedAtEstimated || item.scrapedAt || new Date().toISOString(),
    publishedText: item.publishedText || '',
    isNew24h,
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
