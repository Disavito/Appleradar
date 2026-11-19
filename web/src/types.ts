export interface ListingItem {
  id: string;
  listingId: string;
  title: string;
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
  city: 'Arequipa' | 'Lima';
  itemUrl: string;
  scrapedAt: string;
  updatedAt?: any;
}
