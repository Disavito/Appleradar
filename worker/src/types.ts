export interface RawListing {
  listingId: string;
  title: string;
  rawPrice: string;
  itemUrl: string;
  city: 'Arequipa' | 'Lima';
  searchTerm: string;
  scrapedAt: string;
}

export interface DetailedListing extends RawListing {
  description: string;
  locationText: string;
}

export interface ExtractedMacSpecs {
  chip: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'Intel' | 'Desconocido';
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
}

export interface FirestoreListing extends DetailedListing, ExtractedMacSpecs {
  updatedAt: string;
  currentPrice: number;
}

export interface PriceHistoryRecord {
  previousPrice: number;
  newPrice: number;
  changeDate: string;
  differencePen: number;
}
