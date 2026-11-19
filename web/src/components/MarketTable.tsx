import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState
} from '@tanstack/react-table';
import type { ListingItem, ScrapedProduct } from '../types';
import { marketColumns, formatRelativeTime } from './columns';
import { ListingDetailModal } from './ListingDetailModal';
import { ExternalLink, MapPin, AlertTriangle, Sparkles } from 'lucide-react';

interface Props {
  data: ScrapedProduct[];
}

export const MarketTable: React.FC<Props> = ({ data }) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'publishedAt', desc: true }
  ]);
  const [activeItem, setActiveItem] = useState<ListingItem | null>(null);

  const table = useReactTable({
    data,
    columns: marketColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  if (data.length === 0) {
    return (
      <div className="bg-[#111114] border border-white/[0.08] rounded-xl py-16 px-4 text-center space-y-2">
        <p className="text-base font-medium text-zinc-200">
          No hay equipos que coincidan con los filtros seleccionados
        </p>
        <p className="text-sm text-zinc-400">
          Prueba limpiar el buscador o activar otras zonas y categorías.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#111114] border border-white/[0.08] rounded-xl overflow-hidden">
      {/* Desktop TanStack Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0e0e11] text-[11px] font-medium text-zinc-400 uppercase tracking-wider border-b border-white/[0.08]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="py-3.5 px-4 whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {table.getRowModel().rows.map((row) => {
              const p = row.original;
              const isHook = p.hook_price;
              const isSold = p.status === 'sold';

              return (
                <tr
                  key={row.id}
                  onClick={() => setActiveItem(p.raw)}
                  className={`cursor-pointer transition-colors ${
                    isHook
                      ? 'bg-red-950/25 hover:bg-red-950/40'
                      : 'hover:bg-white/[0.03]'
                  } ${isSold ? 'opacity-50' : ''}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-4 px-4 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-white/[0.07]">
        {table.getRowModel().rows.map((row) => {
          const p = row.original;
          return (
            <div
              key={row.id}
              onClick={() => setActiveItem(p.raw)}
              className={`p-4 space-y-3 transition ${
                p.hook_price ? 'bg-red-950/25' : 'active:bg-white/[0.04]'
              } ${p.status === 'sold' ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-white/[0.07] text-zinc-200">
                      {p.family} {p.line !== 'Standard' ? p.line : ''}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-sky-500/15 text-sky-300">
                      {p.chip}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-white leading-snug">{p.title}</h3>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <span
                    className={`text-base font-bold font-mono-nums block ${
                      p.hook_price ? 'text-red-300' : 'text-emerald-400'
                    }`}
                  >
                    S/ {p.pricePen.toLocaleString('es-PE')}
                  </span>
                  {p.hook_price && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-red-300">
                      <AlertTriangle className="w-3 h-3" /> Gancho
                    </span>
                  )}
                  {p.price_corrected && !p.hook_price && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                      <Sparkles className="w-3 h-3" /> De desc.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-300 font-mono-nums">
                <span>RAM {p.ramGb ? `${p.ramGb}GB` : '-'}</span>
                <span>SSD {p.storageGb ? `${p.storageGb}GB` : '-'}</span>
                <span>Bat. {p.batteryCycles !== null ? `${p.batteryCycles}c` : '-'}</span>
                <span className="font-sans text-zinc-400">{formatRelativeTime(p.publishedAt)}</span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="inline-flex items-center gap-1 text-xs text-zinc-300 truncate">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{p.locationFormatted}</span>
                </div>

                <a
                  href={p.itemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-white/[0.12] text-white text-xs font-medium shrink-0"
                >
                  <span>Ver Anuncio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <ListingDetailModal item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
};
