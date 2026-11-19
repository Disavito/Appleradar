import React, { useState, useMemo } from 'react';
import type { ListingItem } from '../types';
import { ExternalLink, ArrowUpDown, Tag, Search, TrendingDown, RotateCcw } from 'lucide-react';
import { ListingDetailModal } from './ListingDetailModal';

interface Props {
  listings: ListingItem[];
  selectedChip: string;
  onSelectChip: (chip: string) => void;
}

const CATEGORY_TABS = ['ALL', 'MacBook Pro', 'MacBook Air', 'MacBook', 'iPad', 'Mac Mini', 'iMac'] as const;

export const ListingsTable: React.FC<Props> = ({ listings, selectedChip, onSelectChip }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedKeyword, setSelectedKeyword] = useState<string>('ALL');
  const [searchText, setSearchText] = useState<string>('');
  const [filterBox, setFilterBox] = useState<boolean>(false);
  const [filterCharger, setFilterCharger] = useState<boolean>(false);
  const [hideGanchos, setHideGanchos] = useState<boolean>(true);
  const [hideSold, setHideSold] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'best_deal' | 'price_asc' | 'price_desc' | 'ram_desc' | 'recent'>('recent');
  const [activeItem, setActiveItem] = useState<ListingItem | null>(null);

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

  const hasActiveFilters =
    selectedCategory !== 'ALL' ||
    selectedChip !== 'ALL' ||
    selectedCity !== 'ALL' ||
    selectedKeyword !== 'ALL' ||
    searchText.trim() !== '' ||
    filterBox ||
    filterCharger;

  const clearFilters = () => {
    setSelectedCategory('ALL');
    onSelectChip('ALL');
    setSelectedCity('ALL');
    setSelectedKeyword('ALL');
    setSearchText('');
    setFilterBox(false);
    setFilterCharger(false);
  };

  return (
    <section aria-label="Listado de equipos" className="bg-[#111114] border border-white/[0.07] rounded-xl overflow-hidden">
      {/* Category Segmented Tabs + Counter */}
      <div className="px-4 pt-3.5 pb-2 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {CATEGORY_TABS.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                {cat === 'ALL' ? 'Todos' : cat}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="font-mono-nums">
            Mostrando <strong className="text-zinc-200">{sorted.length}</strong> de {listings.length}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 transition font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 border-b border-white/[0.06] space-y-3 bg-[#131317]">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar distrito (Miraflores, Yanahuara), tag o modelo..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedChip}
              onChange={(e) => onSelectChip(e.target.value)}
              className="bg-[#0a0a0c] border border-white/[0.08] text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500/60"
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

            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-[#0a0a0c] border border-white/[0.08] text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500/60"
            >
              <option value="ALL">Todo el Perú ({availableCities.length})</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={selectedKeyword}
              onChange={(e) => setSelectedKeyword(e.target.value)}
              className="bg-[#0a0a0c] border border-white/[0.08] text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500/60 max-w-[180px]"
            >
              <option value="ALL">Todas las Keywords</option>
              {availableKeywords.map((kw) => (
                <option key={kw} value={kw}>
                  {kw}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 pl-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#0a0a0c] border border-white/[0.08] text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500/60"
              >
                <option value="recent">Más Recientes</option>
                <option value="best_deal">Mejor Calidad / Precio</option>
                <option value="price_asc">Precio: Menor a Mayor</option>
                <option value="price_desc">Precio: Mayor a Menor</option>
                <option value="ram_desc">Mayor Memoria RAM</option>
              </select>
            </div>
          </div>
        </div>

        {/* Toggle Checkboxes */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterBox}
              onChange={(e) => setFilterBox(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-sky-500 focus:ring-0"
            />
            Con Caja
          </label>

          <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterCharger}
              onChange={(e) => setFilterCharger(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-sky-500 focus:ring-0"
            />
            Con Cargador
          </label>

          <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideGanchos}
              onChange={(e) => setHideGanchos(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
            />
            Ocultar ganchos (S/ 1)
          </label>

          <label className="flex items-center gap-1.5 text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideSold}
              onChange={(e) => setHideSold(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-zinc-500 focus:ring-0"
            />
            Ocultar vendidos
          </label>
        </div>
      </div>

      {/* Empty State */}
      {sorted.length === 0 ? (
        <div className="py-16 px-4 text-center space-y-2">
          <p className="text-sm font-medium text-zinc-300">No hay equipos que coincidan con tus filtros</p>
          <p className="text-xs text-zinc-500">
            Prueba limpiar los filtros o habilitar más zonas/keywords en Configurar Radar.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e0e11] text-[11px] text-zinc-400 uppercase tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="py-3 px-4 font-medium">Equipo & Keywords</th>
                  <th className="py-3 px-4 font-medium">Specs</th>
                  <th className="py-3 px-4 font-medium">Estado / Extras</th>
                  <th className="py-3 px-4 font-medium">Ubicación</th>
                  <th className="py-3 px-4 font-medium text-right">Precio</th>
                  <th className="py-3 px-4 font-medium text-right">Enlace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {sorted.map((item) => {
                  const kws = item.matchedKeywords || (item.searchTerm ? [item.searchTerm] : []);
                  const itemCat = item.categoria || item.category || 'MacBook Pro';

                  return (
                    <tr
                      key={item.listingId}
                      onClick={() => setActiveItem(item)}
                      className={`cursor-pointer hover:bg-white/[0.03] transition ${
                        item.status === 'sold' ? 'opacity-45' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-white/[0.06] text-zinc-300">
                            {itemCat}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-sky-500/15 text-sky-300">
                            {item.chip}
                          </span>
                          {item.pulgadas && (
                            <span className="text-[11px] text-zinc-400 font-mono-nums">{item.pulgadas}"</span>
                          )}
                          {item.status === 'sold' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-500/20 text-red-400">
                              Vendido
                            </span>
                          )}
                        </div>

                        <p className="mt-1 font-medium text-zinc-100 line-clamp-1">{item.title}</p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {kws.map((kw) => (
                            <span
                              key={kw}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-sky-500/10 text-sky-300"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {kw}
                            </span>
                          ))}
                          {(item.tags || []).slice(0, 3).map((t) => (
                            <span key={t} className="px-1.5 py-0.5 text-[10px] rounded bg-white/[0.04] text-zinc-400">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono-nums text-zinc-300 whitespace-nowrap">
                        <div>
                          <span className="text-zinc-500">RAM</span>{' '}
                          <span className="font-semibold text-white">
                            {item.ram_gb ? `${item.ram_gb}GB` : '—'}
                          </span>
                        </div>
                        <div className="mt-0.5">
                          <span className="text-zinc-500">SSD</span>{' '}
                          <span className="text-zinc-300">
                            {item.almacenamiento_gb ? `${item.almacenamiento_gb}GB` : '—'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-zinc-400 whitespace-nowrap">
                        <div>
                          Caja: <span className="text-zinc-200">{item.incluye_caja ? 'Sí' : 'No'}</span> · Carg.:{' '}
                          <span className="text-zinc-200">{item.incluye_cargador ? 'Sí' : 'No'}</span>
                        </div>
                        {item.ciclos_bateria !== null && (
                          <div className="text-emerald-400 font-mono-nums mt-0.5">
                            {item.ciclos_bateria} ciclos
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-zinc-200 block">{item.city}</span>
                        <span className="text-[11px] text-zinc-500 block truncate max-w-[150px]">
                          {item.distrito_ciudad}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {item.es_precio_gancho ? (
                          <span className="px-2 py-0.5 text-[10px] rounded bg-amber-500/15 text-amber-300">
                            Gancho (S/ {item.precio_normalizado_pen})
                          </span>
                        ) : (
                          <div>
                            <span className="text-sm font-semibold text-emerald-400 font-mono-nums">
                              S/ {item.precio_normalizado_pen.toLocaleString('es-PE')}
                            </span>
                            {(item.priceDropCount || 0) > 0 && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/15 text-emerald-300">
                                <TrendingDown className="w-2.5 h-2.5" />
                                Bajó
                              </span>
                            )}
                            {item.moneda === 'USD' && (
                              <span className="block text-[10px] text-zinc-500">Conv. USD</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <a
                          href={item.itemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.07] hover:bg-white/[0.14] text-zinc-100 font-medium rounded-lg text-xs transition"
                        >
                          <span>Abrir</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-white/[0.06]">
            {sorted.map((item) => {
              const kws = item.matchedKeywords || (item.searchTerm ? [item.searchTerm] : []);
              const itemCat = item.categoria || item.category || 'MacBook Pro';

              return (
                <div
                  key={item.listingId}
                  onClick={() => setActiveItem(item)}
                  className={`p-4 space-y-2.5 active:bg-white/[0.03] ${
                    item.status === 'sold' ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-white/[0.06] text-zinc-300">
                          {itemCat}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-sky-500/15 text-sky-300">
                          {item.chip}
                        </span>
                        {item.pulgadas && (
                          <span className="text-[11px] text-zinc-400 font-mono-nums">{item.pulgadas}"</span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-zinc-100 leading-snug">{item.title}</h3>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-bold text-emerald-400 font-mono-nums block">
                        {item.es_precio_gancho
                          ? `S/ ${item.precio_normalizado_pen}`
                          : `S/ ${item.precio_normalizado_pen.toLocaleString('es-PE')}`}
                      </span>
                      {item.es_precio_gancho && (
                        <span className="text-[10px] text-amber-400">Gancho</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 font-mono-nums">
                    <span>RAM {item.ram_gb ? `${item.ram_gb}GB` : '—'}</span>
                    <span>SSD {item.almacenamiento_gb ? `${item.almacenamiento_gb}GB` : '—'}</span>
                    <span className="font-sans text-zinc-300">
                      {item.city} · {item.distrito_ciudad}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-1">
                      {kws.slice(0, 1).map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-sky-500/10 text-sky-300"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {kw}
                        </span>
                      ))}
                    </div>

                    <a
                      href={item.itemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white font-medium rounded-lg text-xs"
                    >
                      <span>Ver</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ListingDetailModal item={activeItem} onClose={() => setActiveItem(null)} />
    </section>
  );
};
