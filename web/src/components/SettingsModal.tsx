import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { ScraperSettings } from '../types';
import { X, Settings, MapPin, Search, Cpu, Plus, Trash2, Play, Save, CheckCircle2 } from 'lucide-react';

const DEFAULT_SETTINGS: ScraperSettings = {
  geminiModel: 'gemini-2.5-flash',
  locations: [
    { city: 'Lima', path: 'lima', enabled: true },
    { city: 'Arequipa', path: 'arequipa', enabled: true },
    { city: 'Trujillo', path: 'trujillo', enabled: false },
    { city: 'Cusco', path: 'cusco', enabled: false },
    { city: 'Piura', path: 'piura', enabled: false },
    { city: 'Chiclayo', path: 'chiclayo', enabled: false },
    { city: 'Huancayo', path: 'huancayo', enabled: false },
    { city: 'Tacna', path: 'tacna', enabled: false },
    { city: 'Ica', path: 'ica', enabled: false },
    { city: 'Cajamarca', path: 'cajamarca', enabled: false },
    { city: 'Juliaca', path: 'juliaca', enabled: false },
    { city: 'Pucallpa', path: 'pucallpa', enabled: false },
    { city: 'Iquitos', path: 'iquitos', enabled: false },
    { city: 'Chimbote', path: 'chimbote', enabled: false }
  ],
  searchTerms: [
    { term: 'MacBook Pro M1', category: 'MacBook Pro', enabled: true },
    { term: 'MacBook Pro M2', category: 'MacBook Pro', enabled: true },
    { term: 'MacBook Pro M3', category: 'MacBook Pro', enabled: true },
    { term: 'MacBook Pro M4', category: 'MacBook Pro', enabled: true },
    { term: 'MacBook Pro M5', category: 'MacBook Pro', enabled: true },
    { term: 'MacBook Air M1', category: 'MacBook Air', enabled: true },
    { term: 'MacBook Air M2', category: 'MacBook Air', enabled: true },
    { term: 'MacBook Air M3', category: 'MacBook Air', enabled: true },
    { term: 'MacBook Air M4', category: 'MacBook Air', enabled: false },
    { term: 'MacBook Neo', category: 'MacBook', enabled: false },
    { term: 'iPad Pro M1', category: 'iPad', enabled: false },
    { term: 'iPad Pro M2', category: 'iPad', enabled: false },
    { term: 'iPad Pro M4', category: 'iPad', enabled: false },
    { term: 'iPad Air M1', category: 'iPad', enabled: false },
    { term: 'iPad Air M2', category: 'iPad', enabled: false }
  ]
};

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — Rápido y económico (Recomendado)' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — Máxima precisión de análisis' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — Estable y ligero' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite — Ultra económico' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash — Legacy' }
];

const CATEGORIES = ['MacBook Pro', 'MacBook Air', 'MacBook', 'iPad', 'Mac Mini', 'iMac', 'Otro'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<ScraperSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'zones' | 'keywords' | 'model'>('zones');
  const [newTerm, setNewTerm] = useState('');
  const [newCategory, setNewCategory] = useState('MacBook Pro');
  const [newCity, setNewCity] = useState('');
  const [newCityPath, setNewCityPath] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    const docRef = doc(db, 'settings', 'scraper');
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as ScraperSettings;
          setSettings({
            geminiModel: data.geminiModel || DEFAULT_SETTINGS.geminiModel,
            locations: data.locations?.length ? data.locations : DEFAULT_SETTINGS.locations,
            searchTerms: data.searchTerms?.length ? data.searchTerms : DEFAULT_SETTINGS.searchTerms
          });
        }
      },
      () => {}
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleLocation = (idx: number) => {
    const updated = [...settings.locations];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    setSettings({ ...settings, locations: updated });
  };

  const addLocation = () => {
    const city = newCity.trim();
    const path = newCityPath.trim() || city.toLowerCase().replace(/\s+/g, '-');
    if (!city) return;
    setSettings({
      ...settings,
      locations: [...settings.locations, { city, path, enabled: true }]
    });
    setNewCity('');
    setNewCityPath('');
  };

  const toggleTerm = (idx: number) => {
    const updated = [...settings.searchTerms];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    setSettings({ ...settings, searchTerms: updated });
  };

  const removeTerm = (idx: number) => {
    const updated = settings.searchTerms.filter((_, i) => i !== idx);
    setSettings({ ...settings, searchTerms: updated });
  };

  const addTerm = () => {
    const term = newTerm.trim();
    if (!term) return;
    setSettings({
      ...settings,
      searchTerms: [...settings.searchTerms, { term, category: newCategory, enabled: true }]
    });
    setNewTerm('');
  };

  const handleSave = async (triggerNow = false) => {
    setSaving(true);
    try {
      const modelToSave = customModel.trim() || settings.geminiModel;
      await setDoc(
        doc(db, 'settings', 'scraper'),
        {
          ...settings,
          geminiModel: modelToSave,
          triggerNow,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      setSavedMsg(triggerNow ? 'Guardado y escaneo iniciado' : 'Configuración guardada');
      setTimeout(() => setSavedMsg(''), 3500);
    } catch (e: any) {
      alert('Error guardando configuración: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const isKnownModel = GEMINI_MODELS.some((m) => m.id === settings.geminiModel);
  const activeZonesCount = settings.locations.filter((l) => l.enabled).length;
  const activeKeywordsCount = settings.searchTerms.filter((t) => t.enabled).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Configuración del Radar"
    >
      <div
        className="bg-[#111114] border border-white/[0.12] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">Configurar Radar</h2>
              <p className="text-xs text-zinc-400">
                Personaliza ciudades del Perú, términos de búsqueda y modelo de IA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition"
            aria-label="Cerrar configuración"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto bg-[#0e0e11]">
          <button
            type="button"
            onClick={() => setActiveTab('zones')}
            className={`h-9 px-3.5 rounded-lg text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'zones'
                ? 'bg-white text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Zonas del Perú ({activeZonesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('keywords')}
            className={`h-9 px-3.5 rounded-lg text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'keywords'
                ? 'bg-white text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Palabras Clave ({activeKeywordsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('model')}
            className={`h-9 px-3.5 rounded-lg text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'model'
                ? 'bg-white text-zinc-950'
                : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Modelo Gemini</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {activeTab === 'zones' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Selecciona las ciudades o zonas del Perú que el scraper debe explorar en cada ciclo.
              </p>

              <div className="flex flex-wrap gap-2.5">
                {settings.locations.map((loc, idx) => (
                  <button
                    key={`${loc.path}-${idx}`}
                    type="button"
                    onClick={() => toggleLocation(idx)}
                    className={`h-10 px-4 rounded-xl text-[13px] font-medium border transition ${
                      loc.enabled
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : 'bg-[#16161b] border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.16]'
                    }`}
                  >
                    {loc.enabled ? '✓ ' : ''}
                    {loc.city}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex flex-wrap gap-2.5">
                <input
                  type="text"
                  placeholder="Agregar ciudad o distrito (ej: Miraflores)"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="flex-1 min-w-[180px] h-10 bg-[#0a0a0c] border border-white/[0.1] rounded-lg px-3 text-sm text-white placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Slug URL (opcional)"
                  value={newCityPath}
                  onChange={(e) => setNewCityPath(e.target.value)}
                  className="w-44 h-10 bg-[#0a0a0c] border border-white/[0.1] rounded-lg px-3 text-sm text-white placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addLocation}
                  className="h-10 px-4 inline-flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.15] text-white rounded-lg text-[13px] font-medium transition"
                >
                  <Plus className="w-4 h-4" /> Agregar Zona
                </button>
              </div>
            </div>
          )}

          {activeTab === 'keywords' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Activa o agrega las palabras clave de productos Apple que quieres monitorear por categoría.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {settings.searchTerms.map((kw, idx) => (
                  <div
                    key={`${kw.term}-${idx}`}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition ${
                      kw.enabled
                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-200'
                        : 'bg-[#16161b] border-white/[0.07] text-zinc-400'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTerm(idx)}
                      className="flex-1 text-left truncate pr-2"
                    >
                      <span className="font-medium block truncate">
                        {kw.enabled ? '✓ ' : ''}{kw.term}
                      </span>
                      <span className="text-xs opacity-75">{kw.category}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTerm(idx)}
                      className="p-2 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-white/[0.06]"
                      title="Eliminar palabra clave"
                      aria-label={`Eliminar ${kw.term}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex flex-wrap gap-2.5">
                <input
                  type="text"
                  placeholder="Nueva keyword (ej: MacBook Air M4, iPad Pro)"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTerm()}
                  className="flex-1 min-w-[200px] h-10 bg-[#0a0a0c] border border-white/[0.1] rounded-lg px-3 text-sm text-white placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none"
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="h-10 bg-[#0a0a0c] border border-white/[0.1] rounded-lg px-3 text-sm text-white focus:border-sky-500 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addTerm}
                  className="h-10 px-4 inline-flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.15] text-white rounded-lg text-[13px] font-medium transition"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Elige el modelo de Google Gemini que analizará las descripciones nuevas o cambios de precio.
              </p>

              <div className="space-y-3">
                <label className="block text-xs font-medium text-zinc-300">
                  Modelos recomendados
                </label>
                <select
                  value={isKnownModel ? settings.geminiModel : 'CUSTOM'}
                  onChange={(e) => {
                    if (e.target.value !== 'CUSTOM') {
                      setSettings({ ...settings, geminiModel: e.target.value });
                      setCustomModel('');
                    }
                  }}
                  className="w-full h-10 bg-[#0a0a0c] border border-white/[0.1] rounded-lg px-3 text-sm text-white focus:border-sky-500 focus:outline-none"
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                  <option value="CUSTOM">Otro modelo personalizado...</option>
                </select>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    O escribe un ID de modelo personalizado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: gemini-2.5-flash-preview-05-20"
                    value={customModel || (!isKnownModel ? settings.geminiModel : '')}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="w-full h-10 bg-[#0a0a0c] border border-white/[0.1] rounded-lg px-3 text-sm text-white placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none font-mono-nums"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 bg-[#0d0d10] rounded-b-2xl">
          <div className="text-xs text-emerald-400 flex items-center gap-1.5 min-h-[20px]">
            {savedMsg && (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">{savedMsg}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="h-10 px-4 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-semibold rounded-lg transition disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Guardar y Escanear
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="h-10 px-4 inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-[13px] font-semibold rounded-lg transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
