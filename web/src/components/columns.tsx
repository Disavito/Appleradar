import type { ColumnDef } from '@tanstack/react-table';
import type { ScrapedProduct } from '../types';
import { ExternalLink, MapPin, ArrowUpDown, Sparkles, AlertTriangle, TrendingDown } from 'lucide-react';

export function formatRelativeTime(isoDate: string): string {
  if (!isoDate) return '-';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'Reciente';

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Hace 1 día' : `Hace ${days} días`;
}

function formatStorage(gb: number | null): string {
  if (!gb) return '-';
  if (gb >= 1000) {
    const tb = gb / 1000;
    return `${Number.isInteger(tb) ? tb : tb.toFixed(1)} TB`;
  }
  return `${gb} GB`;
}

export const marketColumns: ColumnDef<ScrapedProduct>[] = [
  {
    accessorKey: 'title',
    header: 'Producto y Modelo',
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="min-w-[220px] max-w-[320px] space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white/[0.07] text-zinc-200">
              {p.family}
            </span>
            {p.line !== 'Standard' && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white/[0.05] text-zinc-300">
                {p.line}
              </span>
            )}
            {(p.condition === 'Sellado' || p.condition === 'Como nuevo') && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-500/15 text-emerald-300">
                {p.condition}
              </span>
            )}
            {p.status === 'sold' && (
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-red-500/20 text-red-300">
                Vendido
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-white leading-snug line-clamp-2" title={p.title}>
            {p.title}
          </p>
        </div>
      );
    }
  },
  {
    accessorKey: 'chipDisplay',
    header: 'Chip',
    cell: ({ row }) => {
      const chip = row.original.chipDisplay;
      const isAppleSilicon = /^M[1-5]/.test(chip);
      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${
            isAppleSilicon
              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/25'
              : 'bg-white/[0.06] text-zinc-300 border border-white/[0.08]'
          }`}
        >
          {chip}
        </span>
      );
    }
  },
  {
    accessorKey: 'storageGb',
    header: ({ column }) => (
      <button
        type="button"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="inline-flex items-center gap-1 hover:text-white transition"
      >
        <span>Capacidad</span>
        <ArrowUpDown className="w-3 h-3" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="text-[13px] text-zinc-200 font-mono-nums whitespace-nowrap">
        {formatStorage(row.original.storageGb)}
      </span>
    )
  },
  {
    accessorKey: 'ramGb',
    header: ({ column }) => (
      <button
        type="button"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="inline-flex items-center gap-1 hover:text-white transition"
      >
        <span>RAM</span>
        <ArrowUpDown className="w-3 h-3" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="text-[13px] font-semibold text-white font-mono-nums whitespace-nowrap">
        {row.original.ramGb ? `${row.original.ramGb} GB` : '-'}
      </span>
    )
  },
  {
    accessorKey: 'batteryCycles',
    header: 'Batería',
    cell: ({ row }) => {
      const { batteryCycles, batteryPct } = row.original;
      if (batteryPct !== null) {
        return <span className="text-xs font-medium text-emerald-400 font-mono-nums whitespace-nowrap">{batteryPct}%</span>;
      }
      if (batteryCycles !== null) {
        return <span className="text-xs font-medium text-emerald-400 font-mono-nums whitespace-nowrap">{batteryCycles} ciclos</span>;
      }
      return <span className="text-xs text-zinc-500">-</span>;
    }
  },
  {
    accessorKey: 'includes',
    header: 'Incluye',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1 min-w-[110px]">
        {row.original.includes.map((acc) => (
          <span
            key={acc}
            className="px-2 py-0.5 text-[11px] rounded-full bg-white/[0.06] border border-white/[0.08] text-zinc-300 whitespace-nowrap"
          >
            {acc}
          </span>
        ))}
      </div>
    )
  },
  {
    accessorKey: 'locationFormatted',
    header: 'Ubicación',
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-1.5 text-xs text-zinc-300 whitespace-nowrap">
        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        <span className="truncate max-w-[165px]" title={row.original.locationFormatted}>
          {row.original.locationFormatted}
        </span>
      </div>
    )
  },
  {
    accessorKey: 'publishedAt',
    header: ({ column }) => (
      <button
        type="button"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="inline-flex items-center gap-1 hover:text-white transition"
      >
        <span>Publicado</span>
        <ArrowUpDown className="w-3 h-3" />
      </button>
    ),
    cell: ({ row }) => (
      <span
        className="text-xs text-zinc-300 whitespace-nowrap font-mono-nums"
        title={row.original.publishedText || 'Fecha detectada por radar'}
      >
        {formatRelativeTime(row.original.publishedAt)}
      </span>
    )
  },
  {
    accessorKey: 'pricePen',
    header: ({ column }) => (
      <div className="text-right">
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="inline-flex items-center gap-1 hover:text-white transition"
        >
          <span>Precio</span>
          <ArrowUpDown className="w-3 h-3" />
        </button>
      </div>
    ),
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="text-right whitespace-nowrap space-y-1">
          <div
            className={`text-sm sm:text-base font-semibold font-mono-nums ${
              p.hook_price ? 'text-red-300' : 'text-emerald-400'
            }`}
          >
            S/ {p.pricePen.toLocaleString('es-PE')}
          </div>

          {p.hook_price && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-red-500/20 text-red-300 border border-red-500/30"
              title="Precio irreal o gancho (S/ 1). Revisar descripción."
            >
              <AlertTriangle className="w-3 h-3" />
              Posible Gancho
            </span>
          )}

          {p.price_corrected && !p.hook_price && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30"
              title="Precio real extraído de la descripción"
            >
              <Sparkles className="w-3 h-3" />
              Extraído de desc.
            </span>
          )}

          {p.priceDropCount > 0 && !p.hook_price && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-500/15 text-emerald-300">
              <TrendingDown className="w-3 h-3" />
              Bajó
            </span>
          )}
        </div>
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Enlace</div>,
    cell: ({ row }) => (
      <div className="text-right whitespace-nowrap">
        <a
          href={row.original.itemUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/[0.12] bg-transparent hover:bg-white/[0.08] text-zinc-200 hover:text-white text-xs font-medium transition"
        >
          <span>Ver Anuncio</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    )
  }
];
