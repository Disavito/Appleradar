import { ExtractedMacSpecs } from './types';

const VALID_RAMS = new Set([4, 6, 8, 12, 16, 18, 24, 32, 36, 48, 64, 96, 128, 192]);
const VALID_STORAGES = new Set([64, 128, 256, 512, 1000, 2000, 4000, 8000]);

const PERU_CITY_PATTERNS: Array<{ regex: RegExp; city: string; district?: string }> = [
  { regex: /\bjuliaca\b/i, city: 'Puno', district: 'Juliaca' },
  { regex: /\bpuno\b/i, city: 'Puno' },
  { regex: /\bilo\b/i, city: 'Moquegua', district: 'Ilo' },
  { regex: /\bmoquegua\b/i, city: 'Moquegua' },
  { regex: /\btacna\b/i, city: 'Tacna' },
  { regex: /\b(?:cusco|cuzco)\b/i, city: 'Cusco' },
  { regex: /\bwanchaq\b/i, city: 'Cusco', district: 'Wanchaq' },
  { regex: /\bpiura\b/i, city: 'Piura' },
  { regex: /\btrujillo\b/i, city: 'Trujillo' },
  { regex: /\bchiclayo\b/i, city: 'Chiclayo' },
  { regex: /\bhuancayo\b/i, city: 'Huancayo' },
  { regex: /\bica\b/i, city: 'Ica' },
  { regex: /\bcajamarca\b/i, city: 'Cajamarca' },
  { regex: /\bchimbote\b/i, city: 'Chimbote' },
  { regex: /\biquitos\b/i, city: 'Iquitos' },
  { regex: /\bpucallpa\b/i, city: 'Pucallpa' },
  { regex: /\bayacucho\b/i, city: 'Ayacucho' },
  { regex: /\barequipa\b/i, city: 'Arequipa' },
  { regex: /\b(?:cayma|yanahuara|cerro\s*colorado|paucarpata|bustamante|jlbyr|sachaca|hunter)\b/i, city: 'Arequipa' },
  { regex: /\blima\b/i, city: 'Lima' },
  {
    regex: /\b(?:miraflores|surco|santiago\s*de\s*surco|san\s*isidro|san\s*borja|la\s*molina|barranco|jes[uú]s\s*mar[ií]a|lince|magdalena|pueblo\s*libre|san\s*miguel|los\s*olivos|chorrillos|ate|surquillo|breña|callao|san\s*mart[ií]n|independencia|comas|villa\s*el\s*salvador|san\s*juan\s*de\s*lurigancho|sjl)\b/i,
    city: 'Lima'
  }
];

function parseNumericPrice(raw: string): { amount: number; currency: 'PEN' | 'USD' } | null {
  const txt = (raw || '').trim();
  if (!txt || /gratis|free|no especificado/i.test(txt)) return null;

  const isUsd = /US\$|\$|USD|d[oó]lares/i.test(txt);
  const match = txt.match(/(\d[\d.,]*)/);
  if (!match) return null;

  // Normalizar separadores de miles (S/3.000 o S/ 3,000) vs decimales
  let numStr = match[1].replace(/[.,](?=\d{3}\b)/g, '');
  numStr = numStr.replace(',', '.');
  const num = parseFloat(numStr);
  if (!Number.isFinite(num) || num <= 0) return null;

  return {
    amount: Math.round(isUsd ? num * 3.75 : num),
    currency: isUsd ? 'USD' : 'PEN'
  };
}

function detectCategory(title: string, description: string): { categoria: ExtractedMacSpecs['categoria']; isAccessoryOnly: boolean } {
  const t = (title || '').toLowerCase();
  const full = `${title} ${description}`.toLowerCase();

  // Detectar si el título vende únicamente un accesorio suelto
  const startsWithAccessory = /^(?:vendo\s+|remato\s+|se\s+vende\s+)?(?:cargador|magsafe|funda|case|protector|mochila|malet[ií]n|cable|adaptador|hub|dock|caja\s+vac[ií]a|teclado|magic\s*keyboard|magic\s*mouse|trackpad|apple\s*pencil|airpods|correa|mica|vidrio|bater[ií]a|pantalla|repuesto|placa)\b/i.test(t);
  const forDevice = /\b(?:para|compatible\s+con)\s+(?:macbook|mac|ipad|iphone)\b/i.test(t);
  const hasDeviceWord = /\b(?:macbook|mac\s*mini|mac\s*studio|imac|ipad|iphone)\b/i.test(t);

  if (startsWithAccessory || (forDevice && !hasDeviceWord)) {
    return { categoria: 'Otro', isAccessoryOnly: true };
  }

  // Priorizar título para identificar el equipo principal (evita confundir combos o texto de compatibilidad)
  if (/\bmac\s*mini\b/i.test(t)) return { categoria: 'Mac Mini', isAccessoryOnly: false };
  if (/\bmac\s*studio\b/i.test(t)) return { categoria: 'Mac Studio', isAccessoryOnly: false };
  if (/\bimac\b/i.test(t)) return { categoria: 'iMac', isAccessoryOnly: false };
  if (/\bmacbook\b/i.test(t)) {
    if (/\bair\b/i.test(t) || /\bair\b/i.test(description)) return { categoria: 'MacBook Air', isAccessoryOnly: false };
    if (/\bpro\b/i.test(t) || /\bpro\b/i.test(description)) return { categoria: 'MacBook Pro', isAccessoryOnly: false };
    return { categoria: 'MacBook', isAccessoryOnly: false };
  }
  if (/\bipad\b/i.test(t)) return { categoria: 'iPad', isAccessoryOnly: false };
  if (/\biphone\b/i.test(t)) return { categoria: 'iPhone', isAccessoryOnly: false };

  // Fallback a descripción solo si el título era genérico (ej. "Laptop Apple M2")
  if (/\bmac\s*mini\b/i.test(full)) return { categoria: 'Mac Mini', isAccessoryOnly: false };
  if (/\bmac\s*studio\b/i.test(full)) return { categoria: 'Mac Studio', isAccessoryOnly: false };
  if (/\bimac\b/i.test(full)) return { categoria: 'iMac', isAccessoryOnly: false };
  if (/\bmacbook\b/i.test(full)) {
    if (/\bair\b/i.test(full)) return { categoria: 'MacBook Air', isAccessoryOnly: false };
    if (/\bpro\b/i.test(full)) return { categoria: 'MacBook Pro', isAccessoryOnly: false };
    return { categoria: 'MacBook', isAccessoryOnly: false };
  }
  if (/\bipad\b/i.test(full)) return { categoria: 'iPad', isAccessoryOnly: false };
  if (/\biphone\b/i.test(full)) return { categoria: 'iPhone', isAccessoryOnly: false };

  return { categoria: 'Otro', isAccessoryOnly: false };
}

function detectChip(fullText: string): { chip: ExtractedMacSpecs['chip']; chip_variante: ExtractedMacSpecs['chip_variante'] } {
  const varMatch = fullText.match(/\b(m[1-5])\s*(ultra|max|pro)\b/i);
  if (varMatch) {
    const chip = varMatch[1].toUpperCase() as ExtractedMacSpecs['chip'];
    const rawVar = varMatch[2].toLowerCase();
    const chip_variante = (rawVar.charAt(0).toUpperCase() + rawVar.slice(1)) as ExtractedMacSpecs['chip_variante'];
    return { chip, chip_variante };
  }

  const baseMatch = fullText.match(/\b(m[1-5])\b/i);
  if (baseMatch) {
    return { chip: baseMatch[1].toUpperCase() as ExtractedMacSpecs['chip'], chip_variante: 'Base' };
  }

  if (/\b(?:core\s*)?i9\b/i.test(fullText)) return { chip: 'Intel i9', chip_variante: 'N/A' };
  if (/\b(?:core\s*)?i7\b/i.test(fullText)) return { chip: 'Intel i7', chip_variante: 'N/A' };
  if (/\b(?:core\s*)?i5\b/i.test(fullText)) return { chip: 'Intel i5', chip_variante: 'N/A' };
  if (/\bA1[0-9](?:\s*(?:Pro|Bionic))?\b/i.test(fullText)) return { chip: 'A-Series', chip_variante: 'N/A' };

  return { chip: 'Desconocido', chip_variante: 'N/A' };
}

function detectPulgadas(fullText: string, categoria: ExtractedMacSpecs['categoria']): number | null {
  if (categoria === 'Mac Mini' || categoria === 'Mac Studio' || categoria === 'Otro') return null;

  const decMatch = fullText.match(
    /\b(13\.3|13\.6|15\.3|12\.9|10\.9|10\.2|10\.5|21\.5|6\.1|6\.7|6\.9|5\.4|5\.8)\s*(?:pulgadas|pulg|inches|inch|"|”|'')?\b/i
  );
  if (decMatch) return parseFloat(decMatch[1]);

  const unitMatch = fullText.match(/\b(11|12|13|14|15|16|24|27)\s*(?:pulgadas|pulg|inches|inch|"|”|'')/i);
  if (unitMatch) return parseFloat(unitMatch[1]);

  const modelSize = fullText.match(/\b(?:macbook\s*(?:pro|air)|imac|ipad\s*(?:pro|air)?)\s*(11|12|13|14|15|16|24|27)\b/i);
  if (modelSize) return parseFloat(modelSize[1]);

  return null;
}

function detectRamGb(fullText: string): number | null {
  // Ej: "16GB RAM", "16 GB de ram", "memoria unificada 18gb"
  const ramLabeled = fullText.match(/\b(\d{1,3})\s*(?:gb|g)?\s*(?:de\s*)?(?:ram|memoria\s*unificada|unified\s*memory|memoria\s*ram)\b/i);
  if (ramLabeled) {
    const val = parseInt(ramLabeled[1], 10);
    if (VALID_RAMS.has(val)) return val;
  }

  // Ej: "RAM: 16GB" o "RAM 16"
  const ramPrefix = fullText.match(/\b(?:ram|memoria)\s*[:\-]?\s*(\d{1,3})\s*(?:gb|g)?\b/i);
  if (ramPrefix) {
    const val = parseInt(ramPrefix[1], 10);
    if (VALID_RAMS.has(val)) return val;
  }

  // Ej: "16GB / 512GB" o "8/256" o "16 / 1TB"
  const pairMatch = fullText.match(/\b(4|8|16|18|24|32|36|48|64|96|128)\s*(?:gb|g)?\s*[\/|·]\s*(?:64|128|256|512|1\s*tb|2\s*tb|4\s*tb)/i);
  if (pairMatch) {
    const val = parseInt(pairMatch[1], 10);
    if (VALID_RAMS.has(val)) return val;
  }

  return null;
}

function detectStorageGb(fullText: string): number | null {
  // TB primero (1TB, 2TB, 4TB)
  const tbMatch = fullText.match(/\b([1248])\s*tb\b/i);
  if (tbMatch) {
    const val = parseInt(tbMatch[1], 10) * 1000;
    if (VALID_STORAGES.has(val)) return val;
  }

  // GB explícitos con SSD/almacenamiento/disco o en pares tipo "16/512"
  const ssdMatch = fullText.match(/\b(64|128|256|512)\s*(?:gb|g)?\s*(?:ssd|nvme|almacenamiento|disco|rom|interno)\b/i);
  if (ssdMatch) {
    const val = parseInt(ssdMatch[1], 10);
    if (VALID_STORAGES.has(val)) return val;
  }

  const pairMatch = fullText.match(/\b(?:4|8|16|18|24|32|36|48|64)\s*(?:gb|g)?\s*[\/|·]\s*(64|128|256|512)\s*(?:gb|g)?\b/i);
  if (pairMatch) {
    const val = parseInt(pairMatch[1], 10);
    if (VALID_STORAGES.has(val)) return val;
  }

  // Números estándar de SSD con "GB" (256GB, 512GB, 128GB) que no sean RAM
  const gbMatches = fullText.match(/\b(64|128|256|512)\s*gb\b/gi);
  if (gbMatches) {
    for (const m of gbMatches) {
      const val = parseInt(m, 10);
      if (VALID_STORAGES.has(val)) return val;
    }
  }

  return null;
}

function detectLocation(title: string, locationText: string, defaultCity: string): { ciudad_real: string; distrito_ciudad: string } {
  const combined = `${locationText} ${title}`.trim();
  let ciudad_real = defaultCity || 'Perú';
  let distrito_ciudad = '';

  for (const entry of PERU_CITY_PATTERNS) {
    const match = combined.match(entry.regex);
    if (match) {
      ciudad_real = entry.city;
      if (entry.district) {
        distrito_ciudad = entry.district;
      } else if (match[0].toLowerCase() !== entry.city.toLowerCase()) {
        distrito_ciudad = match[0].trim();
      }
      break;
    }
  }

  return { ciudad_real, distrito_ciudad };
}

export function parseSpecsDeterministically(
  title: string,
  rawPrice: string,
  description: string,
  locationText: string,
  defaultCity: string
): ExtractedMacSpecs {
  const fullText = `${title} ${description}`.trim();
  const { categoria, isAccessoryOnly } = detectCategory(title, description);
  const { chip, chip_variante } = detectChip(fullText);
  const pulgadas = detectPulgadas(fullText, categoria);
  const ram_gb = detectRamGb(fullText);
  const almacenamiento_gb = detectStorageGb(fullText);

  // Batería
  const cyclesMatch =
    fullText.match(/(\d{1,4})\s*ciclos?\b/i) ||
    fullText.match(/ciclos?\s*(?:de\s*bater[ií]a)?\s*[:\-]?\s*(\d{1,4})\b/i);
  const ciclos_bateria = cyclesMatch ? parseInt(cyclesMatch[1], 10) : null;

  const pctMatch =
    fullText.match(/(?:bater[ií]a|salud|condici[oó]n)\s*(?:al|en|:|-)?\s*(\d{2,3})\s*%/i) ||
    fullText.match(/(\d{2,3})\s*%\s*(?:de\s*)?(?:bater[ií]a|salud|vida)/i);
  const rawPct = pctMatch ? parseInt(pctMatch[1], 10) : null;
  const porcentaje_bateria = rawPct !== null && rawPct >= 40 && rawPct <= 100 ? rawPct : null;

  const incluye_caja = /\b(?:con\s*caja|en\s*caja|incluye\s*caja|caja\s*original|sellado|sellada|sealed)\b/i.test(fullText) && !/\bsin\s*caja\b/i.test(fullText);
  const incluye_cargador = /\b(?:con\s*cargador|incluye\s*cargador|cargador\s*original|magsafe)\b/i.test(fullText) && !/\bsin\s*cargador\b/i.test(fullText);

  let condicion_estetica: ExtractedMacSpecs['condicion_estetica'] = 'No indica';
  if (/\b(?:sellado|sellada|nuevo\s*en\s*caja|caja\s*sellada|sealed)\b/i.test(fullText)) {
    condicion_estetica = 'Sellado';
  } else if (/\b(?:como\s*nuevo|como\s*nueva|impecable|10\/10|9\.9\/10|mint|sin\s*detalles)\b/i.test(fullText)) {
    condicion_estetica = 'Como nuevo';
  } else if (/\b(?:detalle|detalles|golpe|ray[oó]n|trizado|roto|falla|para\s*repuesto|icloud|bloqueado)\b/i.test(fullText)) {
    condicion_estetica = 'Con detalle';
  } else if (/\b(?:buen\s*estado|conservado|operativo|9\/10|8\/10)\b/i.test(fullText)) {
    condicion_estetica = 'Buen estado';
  }

  // Precio
  const parsedMain = parseNumericPrice(rawPrice);
  let moneda: 'PEN' | 'USD' = parsedMain?.currency || 'PEN';
  let precio_normalizado_pen = parsedMain?.amount || 0;
  let es_precio_gancho = !parsedMain || parsedMain.amount <= 50 || parsedMain.amount === 123 || parsedMain.amount === 1234;
  let price_corrected = false;

  if (es_precio_gancho) {
    const descPriceMatch = fullText.match(/(?:S\/|US\$|\$)\s*(\d[\d.,]{2,6})/i);
    if (descPriceMatch) {
      const alt = parseNumericPrice(descPriceMatch[0]);
      if (alt && alt.amount > 100) {
        precio_normalizado_pen = alt.amount;
        moneda = alt.currency;
        es_precio_gancho = false;
        price_corrected = true;
      }
    }
  }

  const { ciudad_real, distrito_ciudad } = detectLocation(title, locationText, defaultCity);

  const tags: string[] = [];
  if (isAccessoryOnly) tags.push('Solo Accesorio');
  if (condicion_estetica === 'Sellado') tags.push('Sellado');
  if (incluye_caja) tags.push('Con Caja');
  if (incluye_cargador) tags.push('Con Cargador');
  if (/\btouch\s*bar\b/i.test(fullText)) tags.push('Touch Bar');

  return {
    categoria,
    chip,
    chip_variante,
    pulgadas,
    ram_gb,
    almacenamiento_gb,
    incluye_caja,
    incluye_cargador,
    ciclos_bateria,
    porcentaje_bateria,
    condicion_estetica,
    moneda,
    precio_normalizado_pen,
    es_precio_gancho,
    price_corrected,
    ciudad_real,
    distrito_ciudad,
    tags: tags.slice(0, 5)
  };
}
