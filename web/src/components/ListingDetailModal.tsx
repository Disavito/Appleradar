import React from 'react';
import type { ListingItem } from '../types';
import { X, ExternalLink, MapPin, Tag, Cpu, Box, BatteryCharging } from 'lucide-react';

interface Props {
  item: ListingItem | null;
  onClose: () => void;
}

export const ListingDetailModal: React.FC<Props> = ({ item, onClose }) => {
  if (!item) return null;

  const kws = item.matchedKeywords || (item.searchTerm ? [item.searchTerm] : []);
  const itemCat = item.categoria || item.category || 'MacBook Pro';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111114] border border-white/[0.1] rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-white/[0.07]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-white/[0.06] text-zinc-200">
                {itemCat}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-sky-500/15 text-sky-300">
                {item.chip}
              </span>
              {item.pulgadas && (
                <span className="px-2 py-0.5 text-[11px] rounded bg-white/[0.05] text-zinc-300 font-mono-nums">
                  {item.pulgadas}"
                </span>
              )}
              {item.status === 'sold' && (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-red-500/20 text-red-400">
                  Vendido
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-white leading-snug">{item.title}</h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Price & Location */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#16161a] border border-white/[0.06] rounded-xl p-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 block">
                Precio Normalizado
              </span>
              <span className="text-2xl font-bold text-emerald-400 font-mono-nums">
                {item.es_precio_gancho
                  ? `S/ ${item.precio_normalizado_pen} (Gancho)`
                  : `S/ ${item.precio_normalizado_pen.toLocaleString('es-PE')}`}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 flex items-center justify-end gap-1">
                <MapPin className="w-3 h-3" /> Ubicación
              </span>
              <span className="text-sm font-medium text-zinc-200">{item.city}</span>
              <span className="block text-xs text-zinc-400">{item.distrito_ciudad}</span>
            </div>
          </div>

          {/* Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-[#16161a] border border-white/[0.06] rounded-lg p-3">
              <span className="text-zinc-500 block text-[11px]">RAM</span>
              <span className="font-semibold text-white font-mono-nums mt-0.5 block">
                {item.ram_gb ? `${item.ram_gb} GB` : 'N/A'}
              </span>
            </div>
            <div className="bg-[#16161a] border border-white/[0.06] rounded-lg p-3">
              <span className="text-zinc-500 block text-[11px]">Almacenamiento</span>
              <span className="font-semibold text-white font-mono-nums mt-0.5 block">
                {item.almacenamiento_gb ? `${item.almacenamiento_gb} GB` : 'N/A'}
              </span>
            </div>
            <div className="bg-[#16161a] border border-white/[0.06] rounded-lg p-3">
              <span className="text-zinc-500 block text-[11px] flex items-center gap-1">
                <Box className="w-3 h-3" /> Accesorios
              </span>
              <span className="text-zinc-200 mt-0.5 block">
                Caja: {item.incluye_caja ? 'Sí' : 'No'} · Carg.: {item.incluye_cargador ? 'Sí' : 'No'}
              </span>
            </div>
            <div className="bg-[#16161a] border border-white/[0.06] rounded-lg p-3">
              <span className="text-zinc-500 block text-[11px] flex items-center gap-1">
                <BatteryCharging className="w-3 h-3" /> Batería
              </span>
              <span className="font-semibold text-emerald-400 font-mono-nums mt-0.5 block">
                {item.ciclos_bateria !== null ? `${item.ciclos_bateria} ciclos` : 'No indica'}
              </span>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Descripción del Anuncio
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line bg-[#16161a] border border-white/[0.06] rounded-xl p-3.5 max-h-40 overflow-y-auto">
                {item.description}
              </p>
            </div>
          )}

          {/* Keywords & Tags */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Keywords y Tags de Análisis
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {kws.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20"
                >
                  <Tag className="w-3 h-3" />
                  {kw}
                </span>
              ))}
              {(item.tags || []).map((t) => (
                <span
                  key={t}
                  className="px-2 py-1 text-[11px] rounded-md bg-white/[0.05] text-zinc-300"
                >
                  #{t}
                </span>
              ))}
            </div>
            {item.geminiModelUsed && (
              <p className="text-[11px] text-zinc-500 flex items-center gap-1 pt-1">
                <Cpu className="w-3 h-3" /> Analizado con {item.geminiModelUsed}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.07] flex items-center justify-between gap-3 bg-[#0d0d10] rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
          >
            Cerrar
          </button>
          <a
            href={item.itemUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition"
          >
            <span>Abrir en Facebook Marketplace</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
