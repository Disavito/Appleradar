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
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rápido y económico)' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Máxima precisión)' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Legacy)' }
];

const CATEGORIES = ['MacBook Pro', 'MacBook Air', 'MacBook', 'iPad', 'Mac Mini', 'iMac', 'Otro'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<ScraperSettings>(DEFAULT_SETTINGS);
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

  if (!isOpen) return null;

  const toggleLocation = (idx: number) => {
    const updated = [...settings.locations];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    setSettings({ ...settings, locations: updated });
  };

  const addLocation = () => {
    const city = newCity.trim();
    const path = (newCityPath.trim() || city.toLowerCase().replace(/\s+/g, '-'));
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
      setSavedMsg(triggerNow ? '¡Guardado y escaneo iniciado!' : '¡Configuración guardada en Firestore!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e: any) {
      alert('Error guardando configuración: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const isKnownModel = GEMINI_MODELS.some((m) => m.id === settings.geminiModel);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#141417] border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Configuración del Radar (Perú, Keywords & IA)</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* 1. Modelo Gemini */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-zinc-200">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>Modelo de Inteligencia Artificial (Gemini)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={isKnownModel ? settings.geminiModel : 'CUSTOM'}
                onChange={(e) => {
                  if (e.target.value !== 'CUSTOM') {
                    setSettings({ ...settings, geminiModel: e.target.value });
                    setCustomModel('');
                  }
                }}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
                <option value="CUSTOM">Otro modelo personalizado...</option>
              </select>

              <input
                type="text"
                placeholder="Modelo personalizado (ej: gemini-2.5-flash-preview-05-20)"
                value={customModel || (!isKnownModel ? settings.geminiModel : '')}
                onChange={(e) => setCustomModel(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Zonas del Perú */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-zinc-200">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Zonas / Ciudades del Perú</span>
              </div>
              <span className="text-xs text-zinc-500">
                {settings.locations.filter((l) => l.enabled).length} activas
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings.locations.map((loc, idx) => (
                <button
                  key={`${loc.path}-${idx}`}
                  onClick={() => toggleLocation(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    loc.enabled
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {loc.enabled ? '✓ ' : ''}
                  {loc.city}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <input
                type="text"
                placeholder="Agregar ciudad o distrito (ej: Miraflores)"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="flex-1 min-w-[180px] bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Slug Marketplace (opcional, ej: lima)"
                value={newCityPath}
                onChange={(e) => setNewCityPath(e.target.value)}
                className="w-48 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={addLocation}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Zona
              </button>
            </div>
          </div>

          {/* 3. Palabras Clave y Categorías */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-zinc-200">
                <Search className="w-4 h-4 text-cyan-400" />
                <span>Palabras Clave y Productos Apple</span>
              </div>
              <span className="text-xs text-zinc-500">
                {settings.searchTerms.filter((t) => t.enabled).length} activas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {settings.searchTerms.map((kw, idx) => (
                <div
                  key={`${kw.term}-${idx}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                    kw.enabled
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                  }`}
                >
                  <button onClick={() => toggleTerm(idx)} className="flex-1 text-left truncate">
                    <span className="font-medium">{kw.enabled ? '✓ ' : ''}{kw.term}</span>
                    <span className="block text-[10px] opacity-70">{kw.category}</span>
                  </button>
                  <button
                    onClick={() => removeTerm(idx)}
                    className="p-1 text-zinc-500 hover:text-red-400"
                    title="Eliminar palabra clave"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <input
                type="text"
                placeholder="Nueva palabra clave (ej: MacBook Air M4, iPad Pro)"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTerm()}
                className="flex-1 min-w-[200px] bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                onClick={addTerm}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Keyword
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/60 rounded-b-2xl">
          <div className="text-xs text-emerald-400 flex items-center gap-1.5">
            {savedMsg && (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{savedMsg}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              Guardar y Escanear Ahora
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
