import React from 'react';
import type { ListingItem } from '../types';
import { TrendingDown, Laptop, DollarSign, Sparkles } from 'lucide-react';

interface Props {
  listings: ListingItem[];
}

export const MetricsCards: React.FC<Props> = ({ listings }) => {
  const validListings = listings.filter(
    (l) => !l.es_precio_gancho && l.precio_normalizado_pen > 200 && l.status !== 'sold'
  );

  const chips = ['M1', 'M2', 'M3', 'M4', 'M5'] as const;

  const chipStats = chips.map((chip) => {
    const matching = validListings.filter((l) => l.chip === chip);
    if (matching.length === 0) return { chip, count: 0, min: null, avg: null };
    const prices = matching.map((l) => l.precio_normalizado_pen);
    const min = Math.min(...prices);
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    return { chip, count: matching.length, min, avg };
  });

  const today = new Date().toISOString().split('T')[0];
  const newToday = listings.filter((l) => l.scrapedAt && l.scrapedAt.startsWith(today)).length;
  const priceDrops = listings.filter((l) => (l.priceDropCount || 0) > 0).length;
  const uniqueCities = new Set(listings.map((l) => l.city).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Equipos Monitoreados</span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Laptop className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white">{listings.length}</span>
            <span className="text-xs text-zinc-500">en {uniqueCities || 1} zonas de Perú</span>
          </div>
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Nuevos Detectados Hoy</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-400">+{newToday}</span>
            <span className="text-xs text-zinc-500">últimas 24 horas</span>
          </div>
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Bajadas de Precio</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-amber-400">{priceDrops}</span>
            <span className="text-xs text-zinc-500">con descuento detectado</span>
          </div>
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Precios Verificados</span>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white">{validListings.length}</span>
            <span className="text-xs text-zinc-500">activos sin gancho</span>
          </div>
        </div>
      </div>

      <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-emerald-400" />
          Precios de Mercado por Generación (M1 - M5)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {chipStats.map(({ chip, count, min, avg }) => (
            <div
              key={chip}
              className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-3 hover:border-zinc-700 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-zinc-800 text-cyan-400 border border-cyan-500/20">
                  {chip}
                </span>
                <span className="text-[11px] text-zinc-500">{count} disp.</span>
              </div>

              {min !== null ? (
                <div className="space-y-1">
                  <div>
                    <span className="text-[10px] text-zinc-400 block uppercase">Mínimo</span>
                    <span className="text-sm font-bold text-emerald-400">S/ {min.toLocaleString('es-PE')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block uppercase">Promedio</span>
                    <span className="text-xs text-zinc-300">S/ {avg?.toLocaleString('es-PE')}</span>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-center text-xs text-zinc-600">Sin datos</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
