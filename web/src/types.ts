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
  categoria?: 'MacBook Pro' | 'MacBook Air' | 'MacBook' | 'iPad' | 'Mac Mini' | 'iMac' | 'Otro';
  category?: string;
  chip: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'A-Series' | 'Intel' | 'Desconocido';
  pulgadas: number | null;
  ram_gb: number | null;
  almacenamiento_gb: number | null;
  incluye_caja: boolean;
  incluye_cargador: boolean;
  ciclos_bateria: number | null;
  moneda: 'PEN' | 'USD';
  precio_normalizado_pen: number;
  es_precio_gancho: boolean;
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
