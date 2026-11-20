import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { ScraperSettings } from '../types';
import { X, Settings, MapPin, Search, Cpu, Plus, Trash2, Play, Save, CheckCircle2, KeyRound } from 'lucide-react';

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
    { term: 'MacBook Pro i9', category: 'MacBook Pro', enabled: false },
    { term: 'Mac Mini M1', category: 'Mac Mini', enabled: false },
    { term: 'Mac Mini M2', category: 'Mac Mini', enabled: false },
    { term: 'Mac Mini M4', category: 'Mac Mini', enabled: false },
    { term: 'iMac M1', category: 'iMac', enabled: false },
    { term: 'iMac M3', category: 'iMac', enabled: false },
    { term: 'iPad Pro M1', category: 'iPad', enabled: false },
    { term: 'iPad Pro M2', category: 'iPad', enabled: false },
    { term: 'iPad Pro M4', category: 'iPad', enabled: false },
    { term: 'iPad Air M1', category: 'iPad', enabled: false },
    { term: 'iPad Air M2', category: 'iPad', enabled: false },
    { term: 'iPhone 15 Pro', category: 'iPhone', enabled: false },
    { term: 'iPhone 16 Pro', category: 'iPhone', enabled: false }
  ]
};

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — Rápido y económico (Recomendado)' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — Máxima precisión de análisis' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — Estable y ligero' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite — Ultra económico' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash — Legacy' }
];

const CATEGORIES = ['MacBook Pro', 'MacBook Air', 'MacBook', 'Mac Mini', 'iMac', 'Mac Studio', 'iPad', 'iPhone', 'Otro'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'zones' | 'keywords' | 'model' | 'session';
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, initialTab = 'zones' }) => {
  const [settings, setSettings] = useState<ScraperSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'zones' | 'keywords' | 'model' | 'session'>(initialTab);
  const [newTerm, setNewTerm] = useState('');
  const [newCategory, setNewCategory] = useState('MacBook Pro');
  const [newCity, setNewCity] = useState('');
  const [newCityPath, setNewCityPath] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [fbCookiesInput, setFbCookiesInput] = useState('');
  const [fbExpired, setFbExpired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

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
    const unsubSession = onSnapshot(
      doc(db, 'settings', 'fb_session'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setFbExpired(Boolean(data.expired));
        }
      },
      () => {}
    );
    return () => {
      unsub();
      unsubSession();
    };
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
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Configuración del Radar"
    >
      <div
        className="bg-white dark:bg-[#202024] border border-zinc-200 dark:border-white/[0.12] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
                Configurar Radar
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Personaliza ciudades del Perú, términos de búsqueda y modelo de IA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition"
            aria-label="Cerrar configuración"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-zinc-200 dark:border-white/[0.08] flex items-center gap-2 overflow-x-auto bg-zinc-50 dark:bg-[#1b1b1f]">
          <button
            type="button"
            onClick={() => setActiveTab('zones')}
            className={`h-9 px-3.5 rounded-lg text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'zones'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/[0.06]'
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
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/[0.06]'
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
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/[0.06]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Modelo Gemini</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('session')}
            className={`h-9 px-3.5 rounded-lg text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'session'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : fbExpired
                  ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/[0.06]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sesión FB {fbExpired ? '(!)' : ''}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {activeTab === 'zones' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
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
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/50 dark:text-emerald-300'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:bg-[#27272c] dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    {loc.enabled ? '✓ ' : ''}
                    {loc.city}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-white/[0.08] flex flex-wrap gap-2.5">
                <input
                  type="text"
                  placeholder="Agregar ciudad o distrito (ej: Miraflores)"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="flex-1 min-w-[180px] h-10 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] rounded-lg px-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Slug URL (opcional)"
                  value={newCityPath}
                  onChange={(e) => setNewCityPath(e.target.value)}
                  className="w-44 h-10 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] rounded-lg px-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addLocation}
                  className="h-10 px-4 inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-white/[0.08] dark:hover:bg-white/[0.15] dark:text-white rounded-lg text-[13px] font-medium transition"
                >
                  <Plus className="w-4 h-4" /> Agregar Zona
                </button>
              </div>
            </div>
          )}

          {activeTab === 'keywords' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Activa o agrega las palabras clave de productos Apple que quieres monitorear por categoría.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {settings.searchTerms.map((kw, idx) => (
                  <div
                    key={`${kw.term}-${idx}`}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition ${
                      kw.enabled
                        ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-[#27272c] dark:border-white/[0.08] dark:text-zinc-400'
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
                      className="p-2 opacity-70 hover:opacity-100 hover:text-red-500 rounded-lg"
                      title="Eliminar palabra clave"
                      aria-label={`Eliminar ${kw.term}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-white/[0.08] flex flex-wrap gap-2.5">
                <input
                  type="text"
                  placeholder="Nueva keyword (ej: Mac Mini M4, MacBook Pro i9)"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTerm()}
                  className="flex-1 min-w-[200px] h-10 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] rounded-lg px-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="h-10 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] rounded-lg px-3 text-sm text-zinc-900 dark:text-white focus:border-zinc-400 focus:outline-none"
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
                  className="h-10 px-4 inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-white/[0.08] dark:hover:bg-white/[0.15] dark:text-white rounded-lg text-[13px] font-medium transition"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Elige el modelo de Google Gemini que analizará las descripciones nuevas o cambios de precio.
              </p>

              <div className="space-y-3">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
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
                  className="w-full h-10 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] rounded-lg px-3 text-sm text-zinc-900 dark:text-white focus:border-zinc-400 focus:outline-none"
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                  <option value="CUSTOM">Otro modelo personalizado...</option>
                </select>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    O escribe un ID de modelo personalizado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: gemini-2.5-flash-preview-05-20"
                    value={customModel || (!isKnownModel ? settings.geminiModel : '')}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="w-full h-10 bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] rounded-lg px-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none font-mono-nums"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'session' && (
            <div className="space-y-4">
              <div
                className={`p-3.5 rounded-xl border text-xs ${
                  fbExpired
                    ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-500/30 dark:text-red-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300'
                }`}
              >
                {fbExpired
                  ? '⚠️ La sesión de Facebook expiró. Pega unas cookies nuevas abajo y dale a "Guardar y Escanear" sin necesidad de entrar a Coolify.'
                  : '✅ La sesión de Facebook está activa. El worker auto-renueva y guarda tus cookies automáticamente en Firestore después de cada ciclo.'}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Actualizar cookies de Facebook (opcional si ya funciona)
                </label>
                <textarea
                  rows={3}
                  placeholder="Pega aquí: c_user=...; xs=...; datr=...; sb=..."
                  value={fbCookiesInput}
                  onChange={(e) => setFbCookiesInput(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-white/[0.1] rounded-lg p-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none font-mono-nums"
                />
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  En tu navegador: F12 ➔ Application ➔ Cookies ➔ facebook.com (copia c_user y xs). No cierres sesión en esa pestaña; solo ciérrala con la X.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-[#1b1b1f] rounded-b-2xl">
          <div className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 min-h-[20px]">
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
              className="h-10 px-4 inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-[13px] font-semibold rounded-lg transition disabled:opacity-50"
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
