import React, { useEffect } from 'react';
import type { ListingItem } from '../types';
import { X, ExternalLink, MapPin, Tag, Cpu, Box, BatteryCharging } from 'lucide-react';

interface Props {
  item: ListingItem | null;
  onClose: () => void;
}

export const ListingDetailModal: React.FC<Props> = ({ item, onClose }) => {
  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const kws = item.matchedKeywords || (item.searchTerm ? [item.searchTerm] : []);
  const itemCat = item.categoria || item.category || 'MacBook Pro';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Detalle del equipo"
    >
      <div
        className="bg-[#111114] border border-white/[0.12] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/[0.08]">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-white/[0.08] text-zinc-200">
                {itemCat}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-sky-500/20 text-sky-300">
                {item.chip}
              </span>
              {item.pulgadas && (
                <span className="px-2 py-0.5 text-xs rounded-md bg-white/[0.06] text-zinc-200 font-mono-nums">
                  {item.pulgadas}"
                </span>
              )}
              {item.status === 'sold' && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-red-500/20 text-red-300">
                  Vendido
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white leading-snug">{item.title}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Price & Location */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#16161b] border border-white/[0.07] rounded-xl p-4">
            <div>
              <span className="text-xs font-medium text-zinc-400 block">
                Precio Normalizado
              </span>
              <span className="text-2xl font-bold text-emerald-400 font-mono-nums mt-0.5 block">
                {item.es_precio_gancho
                  ? `S/ ${item.precio_normalizado_pen} (Gancho)`
                  : `S/ ${item.precio_normalizado_pen.toLocaleString('es-PE')}`}
              </span>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-zinc-400 flex items-center sm:justify-end gap-1">
                <MapPin className="w-3.5 h-3.5" /> Ubicación
              </span>
              <span className="text-sm font-semibold text-white block mt-0.5">{item.city}</span>
              <span className="text-xs text-zinc-300">{item.distrito_ciudad}</span>
            </div>
          </div>

          {/* Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#16161b] border border-white/[0.07] rounded-xl p-3.5">
              <span className="text-zinc-400 block text-xs">RAM</span>
              <span className="font-semibold text-white text-sm font-mono-nums mt-1 block">
                {item.ram_gb ? `${item.ram_gb} GB` : 'N/A'}
              </span>
            </div>
            <div className="bg-[#16161b] border border-white/[0.07] rounded-xl p-3.5">
              <span className="text-zinc-400 block text-xs">SSD</span>
              <span className="font-semibold text-white text-sm font-mono-nums mt-1 block">
                {item.almacenamiento_gb ? `${item.almacenamiento_gb} GB` : 'N/A'}
              </span>
            </div>
            <div className="bg-[#16161b] border border-white/[0.07] rounded-xl p-3.5">
              <span className="text-zinc-400 text-xs flex items-center gap-1">
                <Box className="w-3.5 h-3.5" /> Extras
              </span>
              <span className="text-zinc-200 text-xs font-medium mt-1 block leading-relaxed">
                Caja: {item.incluye_caja ? 'Sí' : 'No'} · Carg.: {item.incluye_cargador ? 'Sí' : 'No'}
              </span>
            </div>
            <div className="bg-[#16161b] border border-white/[0.07] rounded-xl p-3.5">
              <span className="text-zinc-400 text-xs flex items-center gap-1">
                <BatteryCharging className="w-3.5 h-3.5" /> Batería
              </span>
              <span className="font-semibold text-emerald-400 text-sm font-mono-nums mt-1 block">
                {item.ciclos_bateria !== null ? `${item.ciclos_bateria} ciclos` : 'No indica'}
              </span>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Descripción del Anuncio
              </h4>
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line bg-[#16161b] border border-white/[0.07] rounded-xl p-4 max-h-48 overflow-y-auto">
                {item.description}
              </p>
            </div>
          )}

          {/* Keywords & Tags */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Keywords y Tags Detectados
            </h4>
            <div className="flex flex-wrap gap-2">
              {kws.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/25"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {kw}
                </span>
              ))}
              {(item.tags || []).map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.06] text-zinc-200"
                >
                  #{t}
                </span>
              ))}
            </div>
            {item.geminiModelUsed && (
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 pt-1">
                <Cpu className="w-3.5 h-3.5" /> Analizado con {item.geminiModelUsed}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between gap-3 bg-[#0d0d10] rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 text-sm font-medium text-zinc-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition"
          >
            Cerrar
          </button>
          <a
            href={item.itemUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-10 px-5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <span>Abrir en Marketplace</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
