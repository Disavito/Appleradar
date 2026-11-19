import React, { useState, useMemo } from 'react';
import type { ListingItem } from '../types';
import { ExternalLink, Filter, ArrowUpDown, Box, BatteryCharging } from 'lucide-react';

interface Props {
  listings: ListingItem[];
}

export const ListingsTable: React.FC<Props> = ({ listings }) => {
  const [selectedChip, setSelectedChip] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [filterBox, setFilterBox] = useState<boolean>(false);
  const [filterCharger, setFilterCharger] = useState<boolean>(false);
  const [hideGanchos, setHideGanchos] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'ram_desc' | 'best_deal'>('best_deal');

  const filtered = useMemo(() => {
    return listings.filter((item) => {
      if (selectedChip !== 'ALL' && item.chip !== selectedChip) return false;
      if (selectedCity !== 'ALL' && item.city !== selectedCity) return false;
      if (filterBox && !item.incluye_caja) return false;
      if (filterCharger && !item.incluye_cargador) return false;
      if (hideGanchos && item.es_precio_gancho) return false;
      return true;
    });
  }, [listings, selectedChip, selectedCity, filterBox, filterCharger, hideGanchos]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'price_asc') {
        return a.precio_normalizado_pen - b.precio_normalizado_pen;
      }
      if (sortBy === 'price_desc') {
        return b.precio_normalizado_pen - a.precio_normalizado_pen;
      }
      if (sortBy === 'ram_desc') {
        return (b.ram_gb || 0) - (a.ram_gb || 0);
      }
      // 'best_deal': Score calculado (RAM + SSD) / Precio
      const scoreA = ((a.ram_gb || 8) * 100 + (a.almacenamiento_gb || 256)) / Math.max(a.precio_normalizado_pen, 500);
      const scoreB = ((b.ram_gb || 8) * 100 + (b.almacenamiento_gb || 256)) / Math.max(b.precio_normalizado_pen, 500);
      return scoreB - scoreA;
    });
  }, [filtered, sortBy]);

  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Barra de Filtros */}
      <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          {/* Chip */}
          <select
            value={selectedChip}
            onChange={(e) => setSelectedChip(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Todos los Chips</option>
            <option value="M1">M1</option>
            <option value="M2">M2</option>
            <option value="M3">M3</option>
            <option value="M4">M4</option>
            <option value="M5">M5</option>
          </select>

          {/* Ciudad */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Lima y Arequipa</option>
            <option value="Lima">Lima</option>
            <option value="Arequipa">Arequipa</option>
          </select>

          {/* Checkboxes */}
          <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterBox}
              onChange={(e) => setFilterBox(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
            />
            Con Caja
          </label>

          <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterCharger}
              onChange={(e) => setFilterCharger(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
            />
            Con Cargador
          </label>

          <label className="flex items-center gap-1.5 text-xs text-emerald-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideGanchos}
              onChange={(e) => setHideGanchos(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0"
            />
            Ocultar ganchos (S/ 1)
          </label>
        </div>

        {/* Orden */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="best_deal">🔥 Mejor Calidad / Precio</option>
            <option value="price_asc">Precio: Menor a Mayor</option>
            <option value="price_desc">Precio: Mayor a Menor</option>
            <option value="ram_desc">Mayor Memoria RAM</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/60 text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4">Equipo / Chip</th>
              <th className="py-3 px-4">Especificaciones</th>
              <th className="py-3 px-4">Accesorios / Batería</th>
              <th className="py-3 px-4">Ubicación</th>
              <th className="py-3 px-4 text-right">Precio Real</th>
              <th className="py-3 px-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500 text-sm">
                  No se encontraron anuncios que coincidan con los filtros aplicados.
                </td>
              </tr>
            ) : (
              sorted.map((item) => (
                <tr key={item.listingId} className="hover:bg-zinc-900/40 transition">
                  {/* Título y Chip */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                        {item.chip}
                      </span>
                      {item.pulgadas && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-300">
                          {item.pulgadas}"
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-medium text-zinc-200 line-clamp-1 max-w-xs">{item.title}</p>
                  </td>

                  {/* RAM y Almacenamiento */}
                  <td className="py-3.5 px-4 text-zinc-300">
                    <div className="space-y-0.5">
                      <div>
                        RAM: <span className="font-semibold text-white">{item.ram_gb ? `${item.ram_gb} GB` : 'N/A'}</span>
                      </div>
                      <div>
                        SSD: <span className="text-zinc-400">{item.almacenamiento_gb ? `${item.almacenamiento_gb} GB` : 'N/A'}</span>
                      </div>
                    </div>
                  </td>

                  {/* Accesorios y Ciclos */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Box className="w-3 h-3 text-zinc-500" />
                        <span>Caja: {item.incluye_caja ? '✅' : '❌'}</span>
                        <span className="mx-1">|</span>
                        <span>Cargador: {item.incluye_cargador ? '✅' : '❌'}</span>
                      </div>
                      {item.ciclos_bateria !== null && (
                        <div className="flex items-center gap-1 text-emerald-400">
                          <BatteryCharging className="w-3 h-3" />
                          <span>{item.ciclos_bateria} ciclos</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Ubicación */}
                  <td className="py-3.5 px-4 text-zinc-300">
                    <span className="font-medium text-zinc-200">{item.city}</span>
                    <span className="block text-[11px] text-zinc-500 truncate max-w-[140px]">
                      {item.distrito_ciudad}
                    </span>
                  </td>

                  {/* Precio */}
                  <td className="py-3.5 px-4 text-right">
                    {item.es_precio_gancho ? (
                      <div>
                        <span className="px-2 py-0.5 text-[10px] rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Precio Gancho
                        </span>
                        <div className="text-[11px] text-zinc-500 mt-0.5">{item.precio_normalizado_pen} PEN pub.</div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-base font-bold text-emerald-400">
                          S/ {item.precio_normalizado_pen.toLocaleString('es-PE')}
                        </span>
                        {item.moneda === 'USD' && (
                          <div className="text-[10px] text-zinc-500">Conv. de USD</div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Botón Anuncio */}
                  <td className="py-3.5 px-4 text-center">
                    <a
                      href={item.itemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs transition shadow-sm"
                    >
                      <span>Ver Anuncio</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
