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
  isSold: boolean;
}

export interface ExtractedMacSpecs {
  categoria: 'MacBook Pro' | 'MacBook Air' | 'MacBook' | 'iPad' | 'Mac Mini' | 'iMac' | 'Otro';
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
