import React, { useState, useMemo } from 'react';
import { toScrapedProduct, type ListingItem, type ScrapedProduct } from '../types';
import { MarketTable } from './MarketTable';
import { formatRelativeTime } from './columns';
import { ListingDetailModal } from './ListingDetailModal';
import { Search, RotateCcw, MapPin, TrendingDown, Sparkles } from 'lucide-react';

interface Props {
  listings: ListingItem[];
}

const FAMILY_TABS = [
  { id: 'ALL', label: 'Todas' },
  { id: 'MacBook', label: 'MacBooks' },
  { id: 'Desktop', label: 'Mac Mini / iMac' },
  { id: 'iPad', label: 'iPads' },
  { id: 'iPhone', label: 'iPhones' }
] as const;

function calcMedian(sortedAsc: number[]): number | null {
  if (sortedAsc.length === 0) return null;
  const mid = Math.floor(sortedAsc.length / 2);
  return sortedAsc.length % 2 !== 0
    ? sortedAsc[mid]
    : Math.round((sortedAsc[mid - 1] + sortedAsc[mid]) / 2);
}

export const Dashboard: React.FC<Props> = ({ listings }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedChip, setSelectedChip] = useState<string>('ALL');
  const [selectedVariant, setSelectedVariant] = useState<string>('ALL');
  const [selectedRam, setSelectedRam] = useState<string>('ALL');
  const [selectedStorage, setSelectedStorage] = useState<string>('ALL');
  const [onlyBox, setOnlyBox] = useState(false);
  const [onlyCharger, setOnlyCharger] = useState(false);
  const [onlyPriceDrops, setOnlyPriceDrops] = useState(false);
  const [hideHooks, setHideHooks] = useState(false);
  const [hideSold, setHideSold] = useState(true);
  const [highlightItem, setHighlightItem] = useState<ListingItem | null>(null);

  const products = useMemo(() => listings.map(toScrapedProduct), [listings]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.city && set.add(p.city));
    return Array.from(set).sort();
  }, [products]);

  const availableRams = useMemo(() => {
    const set = new Set<number>();
    products.forEach((p) => {
      if (p.ramGb) set.add(p.ramGb);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [products]);

  const availableStorages = useMemo(() => {
    const set = new Set<number>();
    products.forEach((p) => {
      if (p.storageGb) set.add(p.storageGb);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [products]);

  // Filtrado instantáneo en cliente (soporta múltiples palabras como "Cayma M1 Max")
  const filteredProducts = useMemo(() => {
    const tokens = searchText
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return products.filter((p) => {
      if (selectedFamily !== 'ALL') {
        if (selectedFamily === 'MacBook' && p.family !== 'MacBook' && p.family !== 'Neo') {
          return false;
        }
        if (
          selectedFamily === 'Desktop' &&
          p.family !== 'Mac Mini' &&
          p.family !== 'iMac' &&
          p.family !== 'Mac Studio'
        ) {
          return false;
        }
        if (
          selectedFamily !== 'MacBook' &&
          selectedFamily !== 'Desktop' &&
          p.family !== selectedFamily
        ) {
          return false;
        }
      }

      if (selectedCity !== 'ALL' && p.city !== selectedCity) return false;
      if (selectedChip !== 'ALL' && p.chip !== selectedChip) return false;
      if (selectedVariant !== 'ALL' && p.chipVariant !== selectedVariant) return false;
      if (selectedRam !== 'ALL' && p.ramGb !== Number(selectedRam)) return false;
      if (selectedStorage !== 'ALL' && p.storageGb !== Number(selectedStorage)) return false;
      if (onlyBox && !p.includes.includes('Caja')) return false;
      if (onlyCharger && !p.includes.includes('Cargador')) return false;
      if (onlyPriceDrops && p.priceDropCount === 0) return false;
      if (hideHooks && p.hook_price) return false;
      if (hideSold && p.status === 'sold') return false;

      if (tokens.length > 0) {
        const haystack = [
          p.title,
          p.family,
          p.line,
          p.chipDisplay,
          p.condition,
          p.ramGb ? `${p.ramGb}gb` : '',
          p.storageGb ? `${p.storageGb}gb` : '',
          p.locationFormatted,
          ...p.includes,
          ...p.tags,
          ...p.matchedKeywords
        ]
          .join(' ')
          .toLowerCase();

        for (const token of tokens) {
          if (!haystack.includes(token)) return false;
        }
      }

      return true;
    });
  }, [
    products,
    searchText,
    selectedFamily,
    selectedCity,
    selectedChip,
    selectedVariant,
    selectedRam,
    selectedStorage,
    onlyBox,
    onlyCharger,
    onlyPriceDrops,
    hideHooks,
    hideSold
  ]);

  // 4 KPIs Reactivos
  const kpis = useMemo(() => {
    const total = filteredProducts.length;
    const validPrices = filteredProducts
      .filter((p) => !p.hook_price && p.pricePen > 100 && p.status !== 'sold')
      .map((p) => p.pricePen)
      .sort((a, b) => a - b);

    const avgPrice =
      validPrices.length > 0
        ? Math.round(validPrices.reduce((acc, v) => acc + v, 0) / validPrices.length)
        : null;

    const medianPrice = calcMedian(validPrices);

    const sortedDates = [...filteredProducts]
      .map((p) => p.publishedAt)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
    const latestRelative = sortedDates.length > 0 ? formatRelativeTime(sortedDates[0]) : '-';

    return { total, avgPrice, medianPrice, latestRelative, validCount: validPrices.length };
  }, [filteredProducts]);

  // Precios por Ciudad (Mediana & Cantidad)
  const cityStats = useMemo(() => {
    const map = new Map<string, number[]>();
    filteredProducts.forEach((p) => {
      if (!p.hook_price && p.pricePen > 100 && p.status !== 'sold' && p.city) {
        const arr = map.get(p.city) || [];
        arr.push(p.pricePen);
        map.set(p.city, arr);
      }
    });

    return Array.from(map.entries())
      .map(([city, prices]) => {
        prices.sort((a, b) => a - b);
        return {
          city,
          count: prices.length,
          median: calcMedian(prices) || 0,
          min: prices[0]
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [filteredProducts]);

  // Mejores Hallazgos (Bajadas de precio o mejores precios vs mediana)
  const topFindings = useMemo(() => {
    const candidates = filteredProducts.filter(
      (p) => !p.hook_price && p.pricePen > 300 && p.status !== 'sold'
    );
    if (candidates.length === 0) return [];

    const median = kpis.medianPrice || 0;

    return [...candidates]
      .sort((a, b) => {
        // Priorizar bajadas de precio, luego menor precio respecto a la mediana
        if (a.priceDropCount !== b.priceDropCount) return b.priceDropCount - a.priceDropCount;
        const scoreA = ((a.ramGb || 8) * 120 + (a.storageGb || 256)) / Math.max(a.pricePen, 500);
        const scoreB = ((b.ramGb || 8) * 120 + (b.storageGb || 256)) / Math.max(b.pricePen, 500);
        return scoreB - scoreA;
      })
      .slice(0, 3)
      .map((p: ScrapedProduct) => {
        const pctBelow =
          median > 0 && p.pricePen < median
            ? Math.round(((median - p.pricePen) / median) * 100)
            : 0;
        return { product: p, pctBelow };
      });
  }, [filteredProducts, kpis.medianPrice]);

  const hasActiveFilters =
    searchText.trim() !== '' ||
    selectedFamily !== 'ALL' ||
    selectedCity !== 'ALL' ||
    selectedChip !== 'ALL' ||
    selectedVariant !== 'ALL' ||
    selectedRam !== 'ALL' ||
    selectedStorage !== 'ALL' ||
    onlyBox ||
    onlyCharger ||
    onlyPriceDrops ||
    hideHooks;

  const clearAll = () => {
    setSearchText('');
    setSelectedFamily('ALL');
    setSelectedCity('ALL');
    setSelectedChip('ALL');
    setSelectedVariant('ALL');
    setSelectedRam('ALL');
    setSelectedStorage('ALL');
    setOnlyBox(false);
    setOnlyCharger(false);
    setOnlyPriceDrops(false);
    setHideHooks(false);
  };

  return (
    <div className="space-y-5">
      {/* Barra de Filtros Visuales Sticky */}
      <section
        aria-label="Filtros de mercado"
        className="sticky top-[65px] z-30 bg-[#0d0d10]/95 backdrop-blur-md border border-white/[0.08] rounded-xl p-4 space-y-3.5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder='Busca por modelo, chip, distrito o palabra clave (ej. "Cayma M1 Max", "Miraflores 32GB")...'
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full h-10 bg-[#09090b] border border-white/[0.1] rounded-lg pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="h-10 px-3.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 transition shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>

        {/* Toggle Group de Familia + Selectores de Hardware */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-lg bg-[#09090b] border border-white/[0.08] overflow-x-auto max-w-full">
            {FAMILY_TABS.map((tab) => {
              const active = selectedFamily === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFamily(tab.id)}
                  className={`h-8 px-3 rounded-md text-xs font-medium whitespace-nowrap transition ${
                    active ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedChip}
              onChange={(e) => setSelectedChip(e.target.value)}
              aria-label="Filtrar por chip"
              className="h-9 bg-[#09090b] border border-white/[0.1] text-xs text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Chip: Todos</option>
              <option value="M1">M1</option>
              <option value="M2">M2</option>
              <option value="M3">M3</option>
              <option value="M4">M4</option>
              <option value="M5">M5</option>
              <option value="Intel i9">Intel i9</option>
              <option value="Intel i7">Intel i7</option>
              <option value="Intel i5">Intel i5</option>
              <option value="A-Series">A-Series</option>
            </select>

            <select
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(e.target.value)}
              aria-label="Filtrar por variante de chip"
              className="h-9 bg-[#09090b] border border-white/[0.1] text-xs text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Gama: Todas</option>
              <option value="Base">Base</option>
              <option value="Pro">Pro</option>
              <option value="Max">Max</option>
              <option value="Ultra">Ultra</option>
            </select>

            <select
              value={selectedRam}
              onChange={(e) => setSelectedRam(e.target.value)}
              aria-label="Filtrar por RAM"
              className="h-9 bg-[#09090b] border border-white/[0.1] text-xs text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">RAM: Todas</option>
              {availableRams.map((r) => (
                <option key={r} value={String(r)}>
                  {r} GB
                </option>
              ))}
            </select>

            <select
              value={selectedStorage}
              onChange={(e) => setSelectedStorage(e.target.value)}
              aria-label="Filtrar por almacenamiento"
              className="h-9 bg-[#09090b] border border-white/[0.1] text-xs text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">SSD: Todos</option>
              {availableStorages.map((s) => (
                <option key={s} value={String(s)}>
                  {s >= 1000 ? `${s / 1000} TB` : `${s} GB`}
                </option>
              ))}
            </select>

            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              aria-label="Filtrar por ciudad"
              className="h-9 bg-[#09090b] border border-white/[0.1] text-xs text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Ciudad: Todo Perú ({availableCities.length})</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggles Secundarios */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
          <button
            type="button"
            onClick={() => setOnlyBox(!onlyBox)}
            className={`h-7 px-2.5 rounded-md border font-medium transition ${
              onlyBox
                ? 'bg-sky-500/15 border-sky-400/50 text-sky-300'
                : 'bg-[#09090b] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {onlyBox ? '✓ ' : ''}Con Caja
          </button>

          <button
            type="button"
            onClick={() => setOnlyCharger(!onlyCharger)}
            className={`h-7 px-2.5 rounded-md border font-medium transition ${
              onlyCharger
                ? 'bg-sky-500/15 border-sky-400/50 text-sky-300'
                : 'bg-[#09090b] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {onlyCharger ? '✓ ' : ''}Con Cargador
          </button>

          <button
            type="button"
            onClick={() => setOnlyPriceDrops(!onlyPriceDrops)}
            className={`h-7 px-2.5 rounded-md border font-medium transition ${
              onlyPriceDrops
                ? 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                : 'bg-[#09090b] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {onlyPriceDrops ? '✓ ' : ''}Bajadas de Precio
          </button>

          <button
            type="button"
            onClick={() => setHideHooks(!hideHooks)}
            className={`h-7 px-2.5 rounded-md border font-medium transition ${
              hideHooks
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-[#09090b] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {hideHooks ? '✓ ' : ''}Ocultar Ganchos (S/ 1)
          </button>

          <button
            type="button"
            onClick={() => setHideSold(!hideSold)}
            className={`h-7 px-2.5 rounded-md border font-medium transition ${
              hideSold
                ? 'bg-white/[0.08] border-white/[0.18] text-zinc-200'
                : 'bg-[#09090b] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {hideSold ? '✓ ' : ''}Ocultar Vendidos
          </button>
        </div>
      </section>

      {/* 4 Tarjetas de Resumen (KPIs Reactivos) */}
      <section aria-label="Métricas de la vista actual" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#111114] border border-white/[0.08] rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-zinc-400">Total de Anuncios</p>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-white font-mono-nums">
              {kpis.total}
            </span>
            <span className="text-xs text-zinc-400 font-mono-nums">{kpis.validCount} válidos</span>
          </div>
        </div>

        <div className="bg-[#111114] border border-white/[0.08] rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-zinc-400">Precio Promedio</p>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-white font-mono-nums">
              {kpis.avgPrice !== null ? `S/ ${kpis.avgPrice.toLocaleString('es-PE')}` : '-'}
            </span>
            <span className="text-xs text-zinc-400">sin S/ 1</span>
          </div>
        </div>

        <div className="bg-[#111114] border border-white/[0.08] rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-zinc-400">Precio Mediana</p>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-emerald-400 font-mono-nums">
              {kpis.medianPrice !== null ? `S/ ${kpis.medianPrice.toLocaleString('es-PE')}` : '-'}
            </span>
            <span className="text-xs text-zinc-400">valor central</span>
          </div>
        </div>

        <div className="bg-[#111114] border border-white/[0.08] rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-zinc-400">Anuncio más reciente</p>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-semibold tracking-tight text-sky-400 font-mono-nums">
              {kpis.latestRelative}
            </span>
            <span className="text-xs text-zinc-400">en vista</span>
          </div>
        </div>
      </section>

      {/* Comparativa por Ciudad & Mejores Hallazgos */}
      {(cityStats.length > 0 || topFindings.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Precios por Ciudad */}
          {cityStats.length > 0 && (
            <div className="bg-[#111114] border border-white/[0.08] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  Precios por Ciudad (Mediana)
                </h2>
                <span className="text-[11px] text-zinc-400">Clic para filtrar</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cityStats.map((st) => {
                  const active = selectedCity === st.city;
                  return (
                    <button
                      key={st.city}
                      type="button"
                      onClick={() => setSelectedCity(active ? 'ALL' : st.city)}
                      className={`px-3 py-2 rounded-lg border text-left transition ${
                        active
                          ? 'bg-sky-500/15 border-sky-400/50'
                          : 'bg-[#16161b] border-white/[0.07] hover:border-white/[0.16]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{st.city}</span>
                        <span className="text-[11px] text-zinc-400 font-mono-nums">({st.count})</span>
                      </div>
                      <div className="text-xs text-emerald-400 font-semibold font-mono-nums mt-0.5">
                        Med. S/ {st.median.toLocaleString('es-PE')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mejores Hallazgos */}
          {topFindings.length > 0 && (
            <div className="bg-[#111114] border border-white/[0.08] rounded-xl p-4 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Hallazgos Destacados (Calidad / Precio)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {topFindings.map(({ product, pctBelow }) => (
                  <button
                    key={product.listingId}
                    type="button"
                    onClick={() => setHighlightItem(product.raw)}
                    className="text-left p-2.5 rounded-lg bg-[#16161b] border border-white/[0.07] hover:border-white/[0.18] transition space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-semibold text-sky-300 truncate">
                        {product.chipDisplay} · {product.ramGb ? `${product.ramGb}GB` : ''}
                      </span>
                      {product.priceDropCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-300 font-medium">
                          <TrendingDown className="w-3 h-3" /> Bajó
                        </span>
                      ) : pctBelow > 5 ? (
                        <span className="text-[10px] text-amber-300 font-medium">-{pctBelow}%</span>
                      ) : null}
                    </div>
                    <p className="text-xs font-medium text-white line-clamp-1">{product.title}</p>
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="font-semibold text-emerald-400 font-mono-nums">
                        S/ {product.pricePen.toLocaleString('es-PE')}
                      </span>
                      <span className="text-[11px] text-zinc-400 truncate max-w-[80px]">{product.city}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla Protagonista (TanStack Table) */}
      <MarketTable data={filteredProducts} />

      <ListingDetailModal item={highlightItem} onClose={() => setHighlightItem(null)} />
    </div>
  );
};
