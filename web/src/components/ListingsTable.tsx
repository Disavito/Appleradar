import React, { useState, useMemo } from 'react';
import type { ListingItem } from '../types';
import { ExternalLink, Filter, ArrowUpDown, Box, BatteryCharging, Tag, Search, TrendingDown } from 'lucide-react';

interface Props {
  listings: ListingItem[];
}

export const ListingsTable: React.FC<Props> = ({ listings }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedChip, setSelectedChip] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedKeyword, setSelectedKeyword] = useState<string>('ALL');
  const [searchText, setSearchText] = useState<string>('');
  const [filterBox, setFilterBox] = useState<boolean>(false);
  const [filterCharger, setFilterCharger] = useState<boolean>(false);
  const [hideGanchos, setHideGanchos] = useState<boolean>(true);
  const [hideSold, setHideSold] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'best_deal' | 'price_asc' | 'price_desc' | 'ram_desc' | 'recent'>('recent');

  // Opciones dinámicas de ciudades y keywords encontradas en los datos
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => l.city && set.add(l.city));
    return Array.from(set).sort();
  }, [listings]);

  const availableKeywords = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.searchTerm) set.add(l.searchTerm);
      (l.matchedKeywords || []).forEach((k) => set.add(k));
    });
    return Array.from(set).sort();
  }, [listings]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return listings.filter((item) => {
      const itemCat = item.categoria || item.category || 'MacBook Pro';
      if (selectedCategory !== 'ALL' && itemCat !== selectedCategory) return false;
      if (selectedChip !== 'ALL' && item.chip !== selectedChip) return false;
      if (selectedCity !== 'ALL' && item.city !== selectedCity) return false;

      if (selectedKeyword !== 'ALL') {
        const kws = item.matchedKeywords || (item.searchTerm ? [item.searchTerm] : []);
        if (!kws.includes(selectedKeyword)) return false;
      }

      if (q) {
        const haystack = [
          item.title,
          item.distrito_ciudad,
          item.city,
          ...(item.tags || []),
          ...(item.matchedKeywords || [])
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (filterBox && !item.incluye_caja) return false;
      if (filterCharger && !item.incluye_cargador) return false;
      if (hideGanchos && item.es_precio_gancho) return false;
      if (hideSold && item.status === 'sold') return false;
      return true;
    });
  }, [
    listings,
    selectedCategory,
    selectedChip,
    selectedCity,
    selectedKeyword,
    searchText,
    filterBox,
    filterCharger,
    hideGanchos,
    hideSold
  ]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'recent') {
        return (b.scrapedAt || '').localeCompare(a.scrapedAt || '');
      }
      if (sortBy === 'price_asc') {
        return a.precio_normalizado_pen - b.precio_normalizado_pen;
      }
      if (sortBy === 'price_desc') {
        return b.precio_normalizado_pen - a.precio_normalizado_pen;
      }
      if (sortBy === 'ram_desc') {
        return (b.ram_gb || 0) - (a.ram_gb || 0);
      }
      const scoreA = ((a.ram_gb || 8) * 100 + (a.almacenamiento_gb || 256)) / Math.max(a.precio_normalizado_pen, 500);
      const scoreB = ((b.ram_gb || 8) * 100 + (b.almacenamiento_gb || 256)) / Math.max(b.precio_normalizado_pen, 500);
      return scoreB - scoreA;
    });
  }, [filtered, sortBy]);

  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Barra de Filtros */}
      <div className="p-4 border-b border-zinc-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros:</span>
            </div>

            {/* Categoría */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todas las Categorías</option>
              <option value="MacBook Pro">MacBook Pro</option>
              <option value="MacBook Air">MacBook Air</option>
              <option value="MacBook">MacBook / Neo</option>
              <option value="iPad">iPad</option>
              <option value="Mac Mini">Mac Mini</option>
              <option value="iMac">iMac</option>
              <option value="Otro">Otro</option>
            </select>

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
              <option value="A-Series">A-Series</option>
              <option value="Intel">Intel</option>
            </select>

            {/* Ciudad / Zona del Perú */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todo el Perú ({availableCities.length})</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Palabra clave encontrada */}
            <select
              value={selectedKeyword}
              onChange={(e) => setSelectedKeyword(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todas las Keywords</option>
              {availableKeywords.map((kw) => (
                <option key={kw} value={kw}>
                  🔑 {kw}
                </option>
              ))}
            </select>
          </div>

          {/* Orden */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="recent">🕒 Más Recientes</option>
              <option value="best_deal">🔥 Mejor Calidad / Precio</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
              <option value="ram_desc">Mayor Memoria RAM</option>
            </select>
          </div>
        </div>

        {/* Fila inferior de búsqueda por distrito/tags y checkboxes */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por distrito (ej: Miraflores, Yanahuara), tag o modelo..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
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

            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideSold}
                onChange={(e) => setHideSold(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-700 text-zinc-500 focus:ring-0"
              />
              Ocultar vendidos
            </label>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/60 text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4">Producto / Tags / Keyword</th>
              <th className="py-3 px-4">Especificaciones</th>
              <th className="py-3 px-4">Accesorios / Batería</th>
              <th className="py-3 px-4">Zona / Distrito</th>
              <th className="py-3 px-4 text-right">Precio Real</th>
              <th className="py-3 px-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500 text-sm">
                  No se encontraron anuncios que coincidan con los filtros aplicados ({listings.length} en total).
                </td>
              </tr>
            ) : (
              sorted.map((item) => {
                const kws = item.matchedKeywords || (item.searchTerm ? [item.searchTerm] : []);
                const itemCat = item.categoria || item.category || 'MacBook Pro';

                return (
                  <tr
                    key={item.listingId}
                    className={`hover:bg-zinc-900/40 transition ${item.status === 'sold' ? 'opacity-50' : ''}`}
                  >
                    {/* Producto, Tags y Keywords */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                          {itemCat}
                        </span>
                        <span className="px-2 py-0.5 font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                          {item.chip}
                        </span>
                        {item.pulgadas && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-300">
                            {item.pulgadas}"
                          </span>
                        )}
                        {item.status === 'sold' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-400 border border-red-500/30">
                            VENDIDO
                          </span>
                        )}
                      </div>

                      <p className="mt-1 font-medium text-zinc-200 line-clamp-1 max-w-xs">{item.title}</p>

                      {/* Tags y Palabras Clave */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {kws.map((kw) => (
                          <span
                            key={kw}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-purple-500/10 text-purple-300 border border-purple-500/20"
                            title="Palabra clave con la que se encontró"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {kw}
                          </span>
                        ))}
                        {(item.tags || []).slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800/90 text-zinc-400"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
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

                    {/* Ubicación / Distrito */}
                    <td className="py-3.5 px-4 text-zinc-300">
                      <span className="font-medium text-zinc-200">{item.city}</span>
                      <span className="block text-[11px] text-zinc-400 truncate max-w-[160px]" title={item.distrito_ciudad}>
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
                          {(item.priceDropCount || 0) > 0 && (
                            <div className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/15 text-emerald-300">
                              <TrendingDown className="w-2.5 h-2.5" />
                              Bajó
                            </div>
                          )}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
