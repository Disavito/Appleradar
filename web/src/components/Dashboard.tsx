import React, { useState, useMemo } from 'react';
import { toScrapedProduct, type ListingItem } from '../types';
import { MarketTable } from './MarketTable';
import { formatRelativeTime } from './columns';
import { Search, RotateCcw } from 'lucide-react';

interface Props {
  listings: ListingItem[];
}

const FAMILY_TABS = [
  { id: 'ALL', label: 'Todas' },
  { id: 'MacBook', label: 'MacBooks' },
  { id: 'iPad', label: 'iPads' },
  { id: 'iPhone', label: 'iPhones' }
] as const;

export const Dashboard: React.FC<Props> = ({ listings }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedChip, setSelectedChip] = useState<string>('ALL');
  const [selectedRam, setSelectedRam] = useState<string>('ALL');
  const [onlyBox, setOnlyBox] = useState(false);
  const [onlyCharger, setOnlyCharger] = useState(false);
  const [hideHooks, setHideHooks] = useState(false);
  const [hideSold, setHideSold] = useState(true);

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

  // Filtrado instantáneo en cliente (soporta múltiples palabras como "Cayma M1")
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
        if (selectedFamily !== 'MacBook' && p.family !== selectedFamily) {
          return false;
        }
      }

      if (selectedCity !== 'ALL' && p.city !== selectedCity) return false;
      if (selectedChip !== 'ALL' && p.chip !== selectedChip) return false;
      if (selectedRam !== 'ALL' && p.ramGb !== Number(selectedRam)) return false;
      if (onlyBox && !p.includes.includes('Caja')) return false;
      if (onlyCharger && !p.includes.includes('Cargador')) return false;
      if (hideHooks && p.hook_price) return false;
      if (hideSold && p.status === 'sold') return false;

      if (tokens.length > 0) {
        const haystack = [
          p.title,
          p.family,
          p.line,
          p.chip,
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
    selectedRam,
    onlyBox,
    onlyCharger,
    hideHooks,
    hideSold
  ]);

  // 4 KPIs Reactivos calculados sobre los resultados filtrados actuales
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

    let medianPrice: number | null = null;
    if (validPrices.length > 0) {
      const mid = Math.floor(validPrices.length / 2);
      medianPrice =
        validPrices.length % 2 !== 0
          ? validPrices[mid]
          : Math.round((validPrices[mid - 1] + validPrices[mid]) / 2);
    }

    const sortedDates = [...filteredProducts]
      .map((p) => p.publishedAt)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
    const latestRelative = sortedDates.length > 0 ? formatRelativeTime(sortedDates[0]) : '-';

    return { total, avgPrice, medianPrice, latestRelative, validCount: validPrices.length };
  }, [filteredProducts]);

  const hasActiveFilters =
    searchText.trim() !== '' ||
    selectedFamily !== 'ALL' ||
    selectedCity !== 'ALL' ||
    selectedChip !== 'ALL' ||
    selectedRam !== 'ALL' ||
    onlyBox ||
    onlyCharger ||
    hideHooks;

  const clearAll = () => {
    setSearchText('');
    setSelectedFamily('ALL');
    setSelectedCity('ALL');
    setSelectedChip('ALL');
    setSelectedRam('ALL');
    setOnlyBox(false);
    setOnlyCharger(false);
    setHideHooks(false);
  };

  return (
    <div className="space-y-5">
      {/* Barra de Filtros Visuales Sticky (estilo Notion/Linear) */}
      <section
        aria-label="Filtros de mercado"
        className="sticky top-[65px] z-30 bg-[#0d0d10]/95 backdrop-blur-md border border-white/[0.08] rounded-xl p-4 space-y-3.5"
      >
        {/* Buscador Global de Ancho Completo */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder='Busca por modelo, chip, distrito o palabra clave (ej. "Cayma M1", "Miraflores 16GB")...'
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

        {/* Toggle Group de Familia + Zonas + Selectores */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Familia Toggle Group */}
            <div className="inline-flex p-1 rounded-lg bg-[#09090b] border border-white/[0.08]">
              {FAMILY_TABS.map((tab) => {
                const active = selectedFamily === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedFamily(tab.id)}
                    className={`h-8 px-3 rounded-md text-xs font-medium transition ${
                      active ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Quick City Toggle Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCity('ALL')}
                className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition ${
                  selectedCity === 'ALL'
                    ? 'bg-sky-500/15 border-sky-400/50 text-sky-300'
                    : 'bg-[#09090b] border-white/[0.08] text-zinc-400 hover:text-white'
                }`}
              >
                Todo Perú
              </button>
              {availableCities.slice(0, 5).map((city) => {
                const active = selectedCity === city;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(active ? 'ALL' : city)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition ${
                      active
                        ? 'bg-sky-500/15 border-sky-400/50 text-sky-300'
                        : 'bg-[#09090b] border-white/[0.08] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selectores Limpios */}
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
              <option value="A-Series">A-Series</option>
              <option value="Intel">Intel</option>
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

            {availableCities.length > 5 && (
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                aria-label="Más ciudades"
                className="h-9 bg-[#09090b] border border-white/[0.1] text-xs text-zinc-100 rounded-lg px-2.5 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">Ciudad: Todas ({availableCities.length})</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
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

      {/* 4 Tarjetas de Resumen (KPIs Reactivos a los Filtros) */}
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

      {/* Tabla Protagonista (TanStack Table) */}
      <MarketTable data={filteredProducts} />
    </div>
  );
};
