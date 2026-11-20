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

export interface RawListing {
  listingId: string;
  title: string;
  rawPrice: string;
  itemUrl: string;
  city: string;
  searchTerm: string;
  category: string;
  scrapedAt: string;
}

export interface DetailedListing extends RawListing {
  description: string;
  locationText: string;
  publishedText: string;
  publishedAtEstimated: string;
  isSold: boolean;
}

export interface ExtractedMacSpecs {
  categoria:
    | 'MacBook Pro'
    | 'MacBook Air'
    | 'MacBook'
    | 'Mac Mini'
    | 'iMac'
    | 'Mac Studio'
    | 'iPad'
    | 'iPhone'
    | 'Otro';
  chip:
    | 'M1'
    | 'M2'
    | 'M3'
    | 'M4'
    | 'M5'
    | 'Intel i9'
    | 'Intel i7'
    | 'Intel i5'
    | 'A-Series'
    | 'Desconocido';
  chip_variante: 'Base' | 'Pro' | 'Max' | 'Ultra' | 'N/A';
  pulgadas: number | null;
  ram_gb: number | null;
  almacenamiento_gb: number | null;
  incluye_caja: boolean;
  incluye_cargador: boolean;
  ciclos_bateria: number | null;
  porcentaje_bateria?: number | null;
  condicion_estetica: 'Sellado' | 'Como nuevo' | 'Buen estado' | 'Con detalle' | 'No indica';
  moneda: 'PEN' | 'USD';
  precio_normalizado_pen: number;
  es_precio_gancho: boolean;
  price_corrected?: boolean;
  ciudad_real: string;
  distrito_ciudad: string;
  tags: string[];
}

export interface FirestoreListing extends DetailedListing, ExtractedMacSpecs {
  updatedAt: string;
  lastSeenAt: string;
  currentPrice: number;
  status: 'active' | 'sold';
  matchedKeywords: string[];
  analyzedWithGemini: boolean;
  geminiModelUsed: string;
  priceDropCount?: number;
}

export interface PriceHistoryRecord {
  previousPrice: number;
  newPrice: number;
  changeDate: string;
  differencePen: number;
}
