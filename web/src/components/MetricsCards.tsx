import React from 'react';
import type { ListingItem } from '../types';

interface Props {
  listings: ListingItem[];
  selectedChip: string;
  onSelectChip: (chip: string) => void;
}

export const MetricsCards: React.FC<Props> = ({ listings, selectedChip, onSelectChip }) => {
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
    <section aria-label="Resumen de mercado" className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#111114] border border-white/[0.08] rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-zinc-400">Equipos Monitoreados</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-white font-mono-nums">
              {listings.length}
            </span>
            <span className="text-xs text-zinc-400">
              {uniqueCities || 1} {uniqueCities === 1 ? 'zona' : 'zonas'}
            </span>
          </div>
        </div>

        <div className="bg-[#111114] border border-white/[0.08] rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-zinc-400">Nuevos Hoy</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-400 font-mono-nums">
              +{newToday}
            </span>
            <span className="text-xs text-zinc-400">últimas 24h</span>
          </div>
        </div>

        <div className="bg-[#111114] border border-white/[0.08] rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-zinc-400">Bajadas de Precio</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-amber-400 font-mono-nums">
              {priceDrops}
            </span>
            <span className="text-xs text-zinc-400">descuentos</span>
          </div>
        </div>

        <div className="bg-[#111114] border border-white/[0.08] rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-zinc-400">Precios Verificados</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-white font-mono-nums">
              {validListings.length}
            </span>
            <span className="text-xs text-zinc-400">sin gancho</span>
          </div>
        </div>
      </div>

      {/* Apple Silicon Generation Benchmark Strip */}
      <div className="bg-[#111114] border border-white/[0.08] rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Precios por Generación Apple Silicon
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Haz clic en un chip para filtrar el listado inferior
            </p>
          </div>
          {selectedChip !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectChip('ALL')}
              className="h-8 px-3 rounded-lg text-xs font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
            >
              Ver todos
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {chipStats.map(({ chip, count, min, avg }) => {
            const isSelected = selectedChip === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => onSelectChip(isSelected ? 'ALL' : chip)}
                className={`text-left rounded-xl p-3.5 border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-400/60'
                    : 'bg-[#16161b] border-white/[0.07] hover:border-white/[0.18] hover:bg-[#1b1b21]'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span
                    className={`text-sm font-semibold tracking-tight ${
                      isSelected ? 'text-sky-300' : 'text-white'
                    }`}
                  >
                    Apple {chip}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono-nums">{count} disp.</span>
                </div>

                {min !== null ? (
                  <div className="flex items-baseline justify-between gap-2 pt-2 border-t border-white/[0.06]">
                    <div>
                      <span className="text-[11px] text-zinc-400 block">Mínimo</span>
                      <span className="text-sm font-semibold text-emerald-400 font-mono-nums">
                        S/ {min.toLocaleString('es-PE')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-zinc-400 block">Promedio</span>
                      <span className="text-xs font-medium text-zinc-200 font-mono-nums">
                        S/ {avg?.toLocaleString('es-PE')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2.5 text-xs text-zinc-500 border-t border-white/[0.06]">
                    Sin registros aún
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
