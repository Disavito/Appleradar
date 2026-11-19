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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#111114] border border-white/[0.07] rounded-xl px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Equipos Monitoreados
          </p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tracking-tight text-white font-mono-nums">
              {listings.length}
            </span>
            <span className="text-[11px] text-zinc-500">
              {uniqueCities || 1} {uniqueCities === 1 ? 'zona' : 'zonas'} en Perú
            </span>
          </div>
        </div>

        <div className="bg-[#111114] border border-white/[0.07] rounded-xl px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Nuevos Hoy
          </p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tracking-tight text-emerald-400 font-mono-nums">
              +{newToday}
            </span>
            <span className="text-[11px] text-zinc-500">últimas 24h</span>
          </div>
        </div>

        <div className="bg-[#111114] border border-white/[0.07] rounded-xl px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Bajadas de Precio
          </p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tracking-tight text-amber-400 font-mono-nums">
              {priceDrops}
            </span>
            <span className="text-[11px] text-zinc-500">con descuento</span>
          </div>
        </div>

        <div className="bg-[#111114] border border-white/[0.07] rounded-xl px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Precios Verificados
          </p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tracking-tight text-white font-mono-nums">
              {validListings.length}
            </span>
            <span className="text-[11px] text-zinc-500">sin gancho S/ 1</span>
          </div>
        </div>
      </div>

      {/* Apple Silicon Generation Benchmark Strip (Interactive) */}
      <div className="bg-[#111114] border border-white/[0.07] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Referencia por Generación Apple Silicon
          </h2>
          {selectedChip !== 'ALL' && (
            <button
              onClick={() => onSelectChip('ALL')}
              className="text-[11px] text-sky-400 hover:text-sky-300 transition"
            >
              Mostrar todos los chips
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {chipStats.map(({ chip, count, min, avg }) => {
            const isSelected = selectedChip === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => onSelectChip(isSelected ? 'ALL' : chip)}
                className={`text-left rounded-lg p-3 border transition-all ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-400/50 ring-1 ring-sky-400/20'
                    : 'bg-[#16161a] border-white/[0.06] hover:border-white/[0.15] hover:bg-[#1a1a1f]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-semibold tracking-tight ${
                      isSelected ? 'text-sky-300' : 'text-white'
                    }`}
                  >
                    Apple {chip}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono-nums">{count}</span>
                </div>

                {min !== null ? (
                  <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-white/[0.05]">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Mínimo</span>
                      <span className="text-sm font-semibold text-emerald-400 font-mono-nums">
                        S/ {min.toLocaleString('es-PE')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 block">Promedio</span>
                      <span className="text-xs text-zinc-300 font-mono-nums">
                        S/ {avg?.toLocaleString('es-PE')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 text-[11px] text-zinc-600 border-t border-white/[0.05]">
                    Sin registros
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
