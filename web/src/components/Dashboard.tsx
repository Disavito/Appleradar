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
  const [selectedLine, setSelectedLine] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedChip, setSelectedChip] = useState<string>('ALL');
  const [selectedVariant, setSelectedVariant] = useState<string>('ALL');
  const [selectedScreen, setSelectedScreen] = useState<string>('ALL');
  const [selectedRam, setSelectedRam] = useState<string>('ALL');
  const [selectedStorage, setSelectedStorage] = useState<string>('ALL');
  const [onlyBox, setOnlyBox] = useState(false);
  const [onlyCharger, setOnlyCharger] = useState(false);
  const [onlyPriceDrops, setOnlyPriceDrops] = useState(false);
  const [onlyNew24h, setOnlyNew24h] = useState(false);
  const [hideHooks, setHideHooks] = useState(false);
  const [hideSold, setHideSold] = useState(true);
  const [highlightItem, setHighlightItem] = useState<ListingItem | null>(null);

  const products = useMemo(() => listings.map(toScrapedProduct), [listings]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.city && set.add(p.city));
    return Array.from(set).sort();
  }, [products]);

  const availableScreens = useMemo(() => {
    const set = new Set<number>();
    products.forEach((p) => {
      if (p.screenSize) set.add(p.screenSize);
    });
    return Array.from(set).sort((a, b) => a - b);
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

      if (selectedLine !== 'ALL' && p.line !== selectedLine) return false;
      if (selectedCity !== 'ALL' && p.city !== selectedCity) return false;
      if (selectedChip !== 'ALL' && p.chip !== selectedChip) return false;
      if (selectedVariant !== 'ALL' && p.chipVariant !== selectedVariant) return false;
      if (selectedScreen !== 'ALL' && p.screenSize !== Number(selectedScreen)) return false;
      if (selectedRam !== 'ALL' && p.ramGb !== Number(selectedRam)) return false;
      if (selectedStorage !== 'ALL' && p.storageGb !== Number(selectedStorage)) return false;
      if (onlyBox && !p.includes.includes('Caja')) return false;
      if (onlyCharger && !p.includes.includes('Cargador')) return false;
      if (onlyPriceDrops && p.priceDropCount === 0) return false;
      if (onlyNew24h && !p.isNew24h) return false;
      if (hideHooks && p.hook_price) return false;
      if (hideSold && p.status === 'sold') return false;

      if (tokens.length > 0) {
        const haystack = [
          p.title,
          p.family,
          p.line,
          p.chipDisplay,
          p.screenSize ? `${p.screenSize}"` : '',
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
    selectedLine,
    selectedCity,
    selectedChip,
    selectedVariant,
    selectedScreen,
    selectedRam,
    selectedStorage,
    onlyBox,
    onlyCharger,
    onlyPriceDrops,
    onlyNew24h,
    hideHooks,
    hideSold
  ]);

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

  const topFindings = useMemo(() => {
    const candidates = filteredProducts.filter(
      (p) => !p.hook_price && p.pricePen > 300 && p.status !== 'sold'
    );
    if (candidates.length === 0) return [];

    const median = kpis.medianPrice || 0;

    return [...candidates]
      .sort((a, b) => {
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
    selectedLine !== 'ALL' ||
    selectedCity !== 'ALL' ||
    selectedChip !== 'ALL' ||
    selectedVariant !== 'ALL' ||
    selectedScreen !== 'ALL' ||
    selectedRam !== 'ALL' ||
    selectedStorage !== 'ALL' ||
    onlyBox ||
    onlyCharger ||
    onlyPriceDrops ||
    onlyNew24h ||
    hideHooks;

  const clearAll = () => {
    setSearchText('');
    setSelectedFamily('ALL');
    setSelectedLine('ALL');
    setSelectedCity('ALL');
    setSelectedChip('ALL');
    setSelectedVariant('ALL');
    setSelectedScreen('ALL');
    setSelectedRam('ALL');
    setSelectedStorage('ALL');
    setOnlyBox(false);
    setOnlyCharger(false);
    setOnlyPriceDrops(false);
    setOnlyNew24h(false);
    setHideHooks(false);
  };

  return (
    <div className="space-y-5">
      {/* Barra de Filtros Visuales Sticky */}
      <section
        aria-label="Filtros de mercado"
        className="sticky top-[65px] z-30 bg-white/95 dark:bg-[#202024]/95 backdrop-blur-md border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 space-y-3.5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder='Busca por modelo, chip, distrito o palabra clave (ej. "Cayma M1 Max", "Miraflores 32GB")...'
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full h-10 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] rounded-lg pl-10 pr-4 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="h-10 px-3.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:text-zinc-200 dark:bg-zinc-700/60 dark:hover:bg-zinc-700 dark:border-zinc-600 transition shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>

        {/* Toggle Group de Familia + Selectores de Hardware */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-lg bg-zinc-100 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.08] overflow-x-auto max-w-full">
            {FAMILY_TABS.map((tab) => {
              const active = selectedFamily === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFamily(tab.id)}
                  className={`h-8 px-3 rounded-md text-xs font-medium whitespace-nowrap transition ${
                    active
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              aria-label="Filtrar por línea"
              className="h-9 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] text-xs text-zinc-800 dark:text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-zinc-400"
            >
              <option value="ALL">Línea: Todas</option>
              <option value="Air">Air</option>
              <option value="Pro">Pro</option>
              <option value="Mini">Mini</option>
              <option value="Max">Max</option>
              <option value="Standard">Standard</option>
            </select>

            <select
              value={selectedChip}
              onChange={(e) => setSelectedChip(e.target.value)}
              aria-label="Filtrar por chip"
              className="h-9 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] text-xs text-zinc-800 dark:text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-zinc-400"
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
              className="h-9 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] text-xs text-zinc-800 dark:text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-zinc-400"
            >
              <option value="ALL">Gama: Todas</option>
              <option value="Base">Base</option>
              <option value="Pro">Pro</option>
              <option value="Max">Max</option>
              <option value="Ultra">Ultra</option>
            </select>

            <select
              value={selectedScreen}
              onChange={(e) => setSelectedScreen(e.target.value)}
              aria-label="Filtrar por pulgadas"
              className="h-9 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] text-xs text-zinc-800 dark:text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-zinc-400"
            >
              <option value="ALL">Pulg.: Todas</option>
              {availableScreens.map((s) => (
                <option key={s} value={String(s)}>
                  {s}"
                </option>
              ))}
            </select>

            <select
              value={selectedRam}
              onChange={(e) => setSelectedRam(e.target.value)}
              aria-label="Filtrar por RAM"
              className="h-9 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] text-xs text-zinc-800 dark:text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-zinc-400"
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
              className="h-9 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] text-xs text-zinc-800 dark:text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-zinc-400"
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
              className="h-9 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] text-xs text-zinc-800 dark:text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-zinc-400"
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
                ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:bg-[#18181b] dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {onlyBox ? '✓ ' : ''}Con Caja
          </button>

          <button
            type="button"
            onClick={() => setOnlyCharger(!onlyCharger)}
            className={`h-7 px-2.5 rounded-md border font-medium transition ${
              onlyCharger
                ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:bg-[#18181b] dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {onlyCharger ? '✓ ' : ''}Con Cargador
          </button>

          <button
            type="button"
            onClick={() => setOnlyPriceDrops(!onlyPriceDrops)}
            className={`h-7 px-2.5 rounded-md border font-medium transition ${
              onlyPriceDrops
                ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-500/15 dark:border-amber-400/50 dark:text-amber-300'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:bg-[#18181b] dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {onlyPriceDrops ? '✓ ' : ''}Bajadas de Precio
          </button>

          <button
            type="button"
            onClick={() => setOnlyNew24h(!onlyNew24h)}
            className={`h-7 px-2.5 rounded-md border font-medium transition ${
              onlyNew24h
                ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-500/15 dark:border-amber-400/50 dark:text-amber-300'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:bg-[#18181b] dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {onlyNew24h ? '✓ ' : ''}Publicados hoy (FB 24h)
          </button>

          <button
            type="button"
            onClick={() => setHideHooks(!hideHooks)}
            className={`h-7 px-2.5 rounded-md border font-medium transition ${
              hideHooks
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:bg-[#18181b] dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {hideHooks ? '✓ ' : ''}Ocultar Ganchos (S/ 1)
          </button>

          <button
            type="button"
            onClick={() => setHideSold(!hideSold)}
            className={`h-7 px-2.5 rounded-md border font-medium transition ${
              hideSold
                ? 'bg-zinc-200 border-zinc-300 text-zinc-900 dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:bg-[#18181b] dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {hideSold ? '✓ ' : ''}Ocultar Vendidos
          </button>
        </div>
      </section>

      {/* 4 Tarjetas de Resumen (KPIs Reactivos) */}
      <section aria-label="Métricas de la vista actual" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#202024] border border-zinc-200 dark:border-white/[0.08] rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total de Anuncios</p>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white font-mono-nums">
              {kpis.total}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-nums">{kpis.validCount} válidos</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#202024] border border-zinc-200 dark:border-white/[0.08] rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Precio Promedio</p>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white font-mono-nums">
              {kpis.avgPrice !== null ? `S/ ${kpis.avgPrice.toLocaleString('es-PE')}` : '-'}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">sin S/ 1</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#202024] border border-zinc-200 dark:border-white/[0.08] rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Precio Mediana</p>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-400 font-mono-nums">
              {kpis.medianPrice !== null ? `S/ ${kpis.medianPrice.toLocaleString('es-PE')}` : '-'}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">valor central</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#202024] border border-zinc-200 dark:border-white/[0.08] rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Anuncio más reciente</p>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200 font-mono-nums">
              {kpis.latestRelative}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">en vista</span>
          </div>
        </div>
      </section>

      {/* Comparativa por Ciudad & Mejores Hallazgos */}
      {(cityStats.length > 0 || topFindings.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cityStats.length > 0 && (
            <div className="bg-white dark:bg-[#202024] border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  Precios por Ciudad (Mediana)
                </h2>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Clic para filtrar</span>
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
                          ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                          : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 dark:bg-[#27272c] dark:border-white/[0.08] dark:hover:border-white/[0.2]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{st.city}</span>
                        <span className="text-[11px] opacity-70 font-mono-nums">({st.count})</span>
                      </div>
                      <div
                        className={`text-xs font-semibold font-mono-nums mt-0.5 ${
                          active
                            ? 'text-emerald-300 dark:text-emerald-700'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        Med. S/ {st.median.toLocaleString('es-PE')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {topFindings.length > 0 && (
            <div className="bg-white dark:bg-[#202024] border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                Hallazgos Destacados (Calidad / Precio)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {topFindings.map(({ product, pctBelow }) => (
                  <button
                    key={product.listingId}
                    type="button"
                    onClick={() => setHighlightItem(product.raw)}
                    className="text-left p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 hover:border-zinc-300 dark:bg-[#27272c] dark:border-white/[0.08] dark:hover:border-white/[0.2] transition space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 truncate">
                        {product.chipDisplay} · {product.ramGb ? `${product.ramGb}GB` : ''}
                      </span>
                      {product.priceDropCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                          <TrendingDown className="w-3 h-3" /> Bajó
                        </span>
                      ) : pctBelow > 5 ? (
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                          -{pctBelow}%
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs font-medium text-zinc-900 dark:text-white line-clamp-1">
                      {product.title}
                    </p>
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono-nums">
                        S/ {product.pricePen.toLocaleString('es-PE')}
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[80px]">
                        {product.city}
                      </span>
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
