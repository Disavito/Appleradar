import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import type { ListingItem } from './types';
import { MetricsCards } from './components/MetricsCards';
import { ListingsTable } from './components/ListingsTable';
import { SettingsModal } from './components/SettingsModal';
import { Radar, RefreshCw, Radio, Bell, BellRing, Settings } from 'lucide-react';
import { registerServiceWorker, requestNotificationPermission, showPushNotification } from './notifications';

// Muestra de datos referencial
const MOCK_LISTINGS: ListingItem[] = [
  {
    id: '1',
    listingId: '982348271',
    title: 'MacBook Pro 14 M1 Pro 16GB 512GB como nueva',
    chip: 'M1',
    pulgadas: 14,
    ram_gb: 16,
    almacenamiento_gb: 512,
    incluye_caja: true,
    incluye_cargador: true,
    ciclos_bateria: 85,
    moneda: 'PEN',
    precio_normalizado_pen: 4350,
    es_precio_gancho: false,
    distrito_ciudad: 'Miraflores',
    city: 'Lima',
    itemUrl: 'https://www.facebook.com/marketplace/item/982348271/',
    scrapedAt: new Date().toISOString()
  },
  {
    id: '2',
    listingId: '823749823',
    title: 'MacBook Pro M2 Max 32GB 1TB Impecable',
    chip: 'M2',
    pulgadas: 16,
    ram_gb: 32,
    almacenamiento_gb: 1000,
    incluye_caja: true,
    incluye_cargador: true,
    ciclos_bateria: 42,
    moneda: 'PEN',
    precio_normalizado_pen: 6800,
    es_precio_gancho: false,
    distrito_ciudad: 'Yanahuara',
    city: 'Arequipa',
    itemUrl: 'https://www.facebook.com/marketplace/item/823749823/',
    scrapedAt: new Date().toISOString()
  },
  {
    id: '3',
    listingId: '762348911',
    title: 'MacBook Pro M3 8GB 512GB Space Gray',
    chip: 'M3',
    pulgadas: 14,
    ram_gb: 8,
    almacenamiento_gb: 512,
    incluye_caja: false,
    incluye_cargador: true,
    ciclos_bateria: 15,
    moneda: 'PEN',
    precio_normalizado_pen: 5100,
    es_precio_gancho: false,
    distrito_ciudad: 'San Isidro',
    city: 'Lima',
    itemUrl: 'https://www.facebook.com/marketplace/item/762348911/',
    scrapedAt: new Date().toISOString()
  },
  {
    id: '4',
    listingId: '109823741',
    title: 'MacBook Pro M1 remato hoy inbox',
    chip: 'M1',
    pulgadas: 13,
    ram_gb: 8,
    almacenamiento_gb: 256,
    incluye_caja: false,
    incluye_cargador: false,
    ciclos_bateria: null,
    moneda: 'PEN',
    precio_normalizado_pen: 1,
    es_precio_gancho: true,
    distrito_ciudad: 'Los Olivos',
    city: 'Lima',
    itemUrl: 'https://www.facebook.com/marketplace/item/109823741/',
    scrapedAt: new Date().toISOString()
  }
];

export function App() {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>('default');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [selectedChip, setSelectedChip] = useState<string>('ALL');

  // Mapa en memoria para detectar cambios de precio o nuevas publicaciones en tiempo real
  const previousListingsRef = useRef<Map<string, number>>(new Map());
  const isFirstLoadRef = useRef<boolean>(true);

  // Registrar Service Worker y verificar permiso de notificaciones
  useEffect(() => {
    registerServiceWorker();
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  const handleEnablePush = async () => {
    const result = await requestNotificationPermission();
    setPushStatus(result);
    if (result === 'granted') {
      showPushNotification('🔔 AppleRadar Activado', {
        body: 'Recibirás notificaciones push al instante cuando baje el precio de un equipo o aparezca una oferta.',
        data: { url: window.location.href }
      });
    }
  };

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'listings'),
        orderBy('updatedAt', 'desc'),
        limit(500)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const items: ListingItem[] = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...(doc.data() as any)
            }));

            // Si no es la primera carga y las notificaciones están activadas, chequear bajadas o nuevos
            if (!isFirstLoadRef.current && Notification.permission === 'granted') {
              for (const item of items) {
                const prevPrice = previousListingsRef.current.get(item.listingId);
                const currentPrice = item.precio_normalizado_pen;

                if (prevPrice !== undefined && currentPrice < prevPrice && !item.es_precio_gancho && currentPrice > 100) {
                  const savings = prevPrice - currentPrice;
                  showPushNotification(`🚨 ¡Bajó de precio! ${item.categoria || 'Apple'} ${item.chip}`, {
                    body: `Ahorro de S/ ${savings.toLocaleString('es-PE')}. Nuevo precio: S/ ${currentPrice.toLocaleString('es-PE')} en ${item.city}`,
                    data: { url: item.itemUrl }
                  });
                } else if (prevPrice === undefined && !item.es_precio_gancho && currentPrice > 500) {
                  showPushNotification(`✨ Nuevo ${item.categoria || 'Equipo'} ${item.chip} (${item.city})`, {
                    body: `S/ ${currentPrice.toLocaleString('es-PE')} - ${item.title.slice(0, 60)}...`,
                    data: { url: item.itemUrl }
                  });
                }
              }
            }

            const newMap = new Map<string, number>();
            items.forEach((it) => newMap.set(it.listingId, it.precio_normalizado_pen));
            previousListingsRef.current = newMap;
            isFirstLoadRef.current = false;

            setListings(items);
            setIsConnected(true);
          } else {
            setListings(MOCK_LISTINGS);
            setIsConnected(true);
          }
          setLoading(false);
        },
        (error) => {
          console.warn('Conexión Firestore en modo preview/mock:', error.message);
          setListings(MOCK_LISTINGS);
          setIsConnected(false);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      setListings(MOCK_LISTINGS);
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#f4f4f6] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.07] bg-[#0a0a0c]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-sky-400">
              <Radar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">
                AppleRadar
              </h1>
              <p className="text-xs text-zinc-400">
                Mercado Apple en Perú · MacBook Pro, Air, Neo, iPad
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16161a] hover:bg-[#1e1e24] text-zinc-100 border border-white/[0.08] font-medium rounded-lg text-xs transition"
              title="Elegir ciudades del Perú, palabras clave y modelo Gemini"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-300" />
              <span>Configurar Radar</span>
            </button>

            {pushStatus !== 'granted' ? (
              <button
                onClick={handleEnablePush}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg text-xs transition"
                title="Activar notificaciones push en esta pantalla o celular"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Activar Push</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-medium rounded-lg text-xs">
                <BellRing className="w-3.5 h-3.5" />
                <span>Push Activo</span>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs bg-[#111114] border border-white/[0.07] px-2.5 py-1.5 rounded-lg">
              <span
                className={`inline-block rounded-full h-2 w-2 ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="text-zinc-400 font-medium">
                {isConnected ? 'En vivo' : 'Preview'}
              </span>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="p-1.5 text-zinc-400 hover:text-white bg-[#16161a] hover:bg-[#1e1e24] border border-white/[0.08] rounded-lg transition"
              title="Refrescar vista"
              aria-label="Refrescar vista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-500 space-y-3">
            <Radio className="w-7 h-7 animate-spin text-sky-500" />
            <p className="text-xs font-medium">Cargando mercado en tiempo real...</p>
          </div>
        ) : (
          <>
            <MetricsCards
              listings={listings}
              selectedChip={selectedChip}
              onSelectChip={setSelectedChip}
            />
            <ListingsTable
              listings={listings}
              selectedChip={selectedChip}
              onSelectChip={setSelectedChip}
            />
          </>
        )}
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-4 px-6 text-center text-[11px] text-zinc-500">
        AppleRadar · Monitoreo autónomo de precios en tiempo real
      </footer>
    </div>
  );
}

export default App;
