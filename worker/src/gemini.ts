import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { CONFIG } from './config';
import { ExtractedMacSpecs } from './types';

let genAI: GoogleGenerativeAI | null = null;

function getGenerativeModel(modelName: string) {
  if (!genAI) {
    if (!CONFIG.geminiApiKey) {
      throw new Error('GEMINI_API_KEY no está configurada.');
    }
    genAI = new GoogleGenerativeAI(CONFIG.geminiApiKey);
  }
  return genAI.getGenerativeModel({
    model: modelName || 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          categoria: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['MacBook Pro', 'MacBook Air', 'MacBook Neo', 'MacBook', 'Mac Mini', 'iMac', 'Mac Studio', 'iPad', 'iPhone', 'Otro']
          },
          chip: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['M1', 'M2', 'M3', 'M4', 'M5', 'Intel i9', 'Intel i7', 'Intel i5', 'A-Series', 'Desconocido']
          },
          chip_variante: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['Base', 'Pro', 'Max', 'Ultra', 'N/A']
          },
          pulgadas: { type: SchemaType.NUMBER, nullable: true },
          ram_gb: { type: SchemaType.INTEGER, nullable: true },
          almacenamiento_gb: { type: SchemaType.INTEGER, nullable: true },
          incluye_caja: { type: SchemaType.BOOLEAN },
          incluye_cargador: { type: SchemaType.BOOLEAN },
          ciclos_bateria: { type: SchemaType.INTEGER, nullable: true },
          porcentaje_bateria: { type: SchemaType.INTEGER, nullable: true },
          condicion_estetica: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['Sellado', 'Como nuevo', 'Buen estado', 'Con detalle', 'No indica']
          },
          moneda: { type: SchemaType.STRING, format: 'enum', enum: ['PEN', 'USD'] },
          precio_normalizado_pen: { type: SchemaType.NUMBER },
          es_precio_gancho: { type: SchemaType.BOOLEAN },
          price_corrected: { type: SchemaType.BOOLEAN },
          ciudad_real: { type: SchemaType.STRING },
          distrito_ciudad: { type: SchemaType.STRING },
          tags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          }
        },
        required: [
          'categoria',
          'chip',
          'chip_variante',
          'incluye_caja',
          'incluye_cargador',
          'condicion_estetica',
          'moneda',
          'precio_normalizado_pen',
          'es_precio_gancho',
          'price_corrected',
          'ciudad_real',
          'distrito_ciudad',
          'tags'
        ]
      }
    }
  });
}

export async function extractSpecsWithGemini(
  title: string,
  rawPrice: string,
  description: string,
  locationText: string,
  searchTerm: string,
  modelName: string
): Promise<{ specs: ExtractedMacSpecs; success: boolean }> {
  const model = getGenerativeModel(modelName);

  const prompt = `
Eres un experto tasador y técnico de hardware Apple en Perú.
Analiza el siguiente anuncio de Facebook Marketplace encontrado con la palabra clave "${searchTerm}":
- TÍTULO: "${title}"
- PRECIO PUBLICADO: "${rawPrice}"
- DESCRIPCIÓN: "${description}"
- UBICACIÓN PUBLICADA: "${locationText}"

REGLAS ESTRICTAS DE CLASIFICACIÓN (PROHIBIDO ADIVINAR O ASUMIR):
1. REGLA DE ORO — NO ASUMIR DATOS FALTANTES:
   - Si un dato NO aparece explícitamente en el TÍTULO o DESCRIPCIÓN, déjalo vacío/desconocido:
     * Si NO dice si es "Air" o "Pro" -> usa 'MacBook' (NO asumas Air ni Pro).
     * Si NO dice el chip (M1, M2, M3, M4, M5, Intel i5/i7/i9, etc.) -> usa chip: 'Desconocido', chip_variante: 'N/A'.
     * Si NO dice las pulgadas -> usa pulgadas: null (NO las deduzcas por el modelo).
     * Si NO dice la RAM -> usa ram_gb: null.
     * Si NO dice el almacenamiento -> usa almacenamiento_gb: null.

2. CATEGORÍA DEL EQUIPO PRINCIPAL ('categoria'):
   - Identifica el EQUIPO PRINCIPAL en venta, ignorando accesorios incluidos de regalo o combo (ej: "Mac Mini M4 + Hub Ugreen" es 'Mac Mini'; "MacBook Air M2 + funda + adaptador" es 'MacBook Air').
   - Ignora frases de compatibilidad (ej: si vende una MacBook y dice "compatible con iPad/iPhone", sigue siendo 'MacBook Pro' o 'MacBook Air').
   - SEPARA ESTRICTAMENTE 'MacBook Air' de 'MacBook Pro':
     * Solo usa 'MacBook Air' si dice explícitamente "Air".
     * Solo usa 'MacBook Pro' si dice explícitamente "Pro".
     * Si dice solo "MacBook" sin "Air" ni "Pro" -> usa 'MacBook'.
   - Si el anuncio vende ÚNICAMENTE un accesorio suelto (solo cargador, solo hub, solo funda, solo caja vacía, solo cable, sin computador/tablet/teléfono), usa 'Otro' y pon el tag "Solo Accesorio".
   - Valores permitidos: 'MacBook Pro', 'MacBook Air', 'MacBook', 'Mac Mini', 'iMac', 'Mac Studio', 'iPad', 'iPhone', u 'Otro'.

3. CHIP Y VARIANTE ('chip' y 'chip_variante'):
   - ¡NO confundas la línea "MacBook Pro" con el chip "M1 Pro"!
     * "MacBook Pro 13 M1" -> chip: 'M1', chip_variante: 'Base'.
     * "MacBook Pro 14 M1 Pro" o "chip M1 Pro" -> chip: 'M1', chip_variante: 'Pro'.
     * "M1 Max", "M2 Max", "M3 Max", "M4 Max" -> chip_variante: 'Max'.
     * "M1 Ultra", "M2 Ultra", "M3 Ultra", "M4 Ultra" -> chip_variante: 'Ultra'.
   - Aplica la misma separación exacta para M1, M2, M3, M4 y M5 ('Base', 'Pro', 'Max', 'Ultra').
   - Si es Intel Core i9 -> chip: 'Intel i9', chip_variante: 'N/A'. Igual para 'Intel i7' e 'Intel i5'.
   - Si es iPhone o iPad sin chip M (ej. A15, A16, A17 Pro, A18) -> chip: 'A-Series', chip_variante: 'N/A'.

4. HARDWARE Y PULGADAS ('pulgadas'):
   - 'pulgadas': número decimal o entero SOLO si está escrito en el título o descripción (ej: 11, 12, 13, 13.3, 13.6, 14, 15, 15.3, 16, 21.5, 24, 27, 6.1, 6.7, 6.9, 10.9, 12.9). Si no lo dice, usa null.
   - 'ram_gb': entero en GB SOLO si está indicado, o null.
   - 'almacenamiento_gb': entero en GB (64, 128, 256, 512, 1000 para 1TB, 2000 para 2TB, 4000 para 4TB) SOLO si está indicado, o null.
   - 'incluye_caja' y 'incluye_cargador': booleanos.
   - 'ciclos_bateria' y 'porcentaje_bateria': enteros si se mencionan, si no null.
   - 'condicion_estetica': 'Sellado', 'Como nuevo', 'Buen estado', 'Con detalle', o 'No indica'.

5. PRECIO Y MONEDA:
   - 'moneda': 'PEN' o 'USD'. Si está en USD ($), convierte a Soles (~3.75).
   - Si el PRECIO PUBLICADO es gancho (S/ 1, S/ 0, S/ 123), busca el precio real en DESCRIPCIÓN o TÍTULO. Si lo encuentras, ponlo en 'precio_normalizado_pen', pon 'es_precio_gancho: false' y 'price_corrected: true'. Si no hay precio real en ningún lado, pon 'es_precio_gancho: true' y 'price_corrected: false'.

6. UBICACIÓN EXACTA EN PERÚ ('ciudad_real' y 'distrito_ciudad'):
   - 'ciudad_real': la CIUDAD o DEPARTAMENTO principal del Perú donde realmente se encuentra el anuncio (ej: "Lima", "Arequipa", "Trujillo", "Cusco", "Puno", "Moquegua", "Tacna", "Ica", "Piura", "Chiclayo", "Huancayo", "Cajamarca", "Chimbote", "Iquitos", "Pucallpa", "Ayacucho").
   - ¡MUY IMPORTANTE! Si el TÍTULO o UBICACIÓN menciona otra ciudad (ej: "Puno, PU", "Juliaca, PU" -> ciudad_real: "Puno", distrito_ciudad: "Juliaca"; "Ilo, MO" o "Moquegua, MO" -> ciudad_real: "Moquegua", distrito_ciudad: "Ilo"; "Tacna, TA" -> ciudad_real: "Tacna"; "Cusco, CU" -> ciudad_real: "Cusco"), SIEMPRE prioriza esa ciudad real en 'ciudad_real' aunque UBICACIÓN PUBLICADA diga "Arequipa" o "Lima".
   - 'distrito_ciudad': SOLO el distrito o ciudad secundaria si existe (ej: "Miraflores", "Cayma", "Juliaca", "Ilo", "Wanchaq", "Surco"), o cadena vacía "" si solo se conoce la ciudad principal.
   - 'tags': 2 a 5 etiquetas cortas en español (ej: ["Con Hub Ugreen", "Sellado", "Batería 100%"]).
`;

  try {
    const response = await model.generateContent(prompt);
    const text = response.response.text()?.trim() || '{}';
    const parsed = JSON.parse(text) as ExtractedMacSpecs;
    return { specs: parsed, success: true };
  } catch (err) {
    console.error(`Error procesando especificaciones con Gemini (${modelName}):`, err);
    return {
      success: false,
      specs: {
        categoria: 'Otro',
        chip: 'Desconocido',
        chip_variante: 'N/A',
        pulgadas: null,
        ram_gb: null,
        almacenamiento_gb: null,
        incluye_caja: false,
        incluye_cargador: false,
        ciclos_bateria: null,
        porcentaje_bateria: null,
        condicion_estetica: 'No indica',
        moneda: 'PEN',
        precio_normalizado_pen: 0,
        es_precio_gancho: true,
        price_corrected: false,
        ciudad_real: locationText || 'Perú',
        distrito_ciudad: '',
        tags: []
      }
    };
  }
}
