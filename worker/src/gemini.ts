import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { CONFIG } from './config';
import { ExtractedMacSpecs } from './types';

let genAI: GoogleGenerativeAI | null = null;

function getGenerativeModel() {
  if (!genAI) {
    if (!CONFIG.geminiApiKey) {
      throw new Error('GEMINI_API_KEY no está configurada.');
    }
    genAI = new GoogleGenerativeAI(CONFIG.geminiApiKey);
  }
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          chip: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['M1', 'M2', 'M3', 'M4', 'M5', 'Intel', 'Desconocido']
          },
          pulgadas: { type: SchemaType.NUMBER, nullable: true },
          ram_gb: { type: SchemaType.INTEGER, nullable: true },
          almacenamiento_gb: { type: SchemaType.INTEGER, nullable: true },
          incluye_caja: { type: SchemaType.BOOLEAN },
          incluye_cargador: { type: SchemaType.BOOLEAN },
          ciclos_bateria: { type: SchemaType.INTEGER, nullable: true },
          moneda: { type: SchemaType.STRING, format: 'enum', enum: ['PEN', 'USD'] },
          precio_normalizado_pen: { type: SchemaType.NUMBER },
          es_precio_gancho: { type: SchemaType.BOOLEAN },
          distrito_ciudad: { type: SchemaType.STRING }
        },
        required: [
          'chip',
          'incluye_caja',
          'incluye_cargador',
          'moneda',
          'precio_normalizado_pen',
          'es_precio_gancho',
          'distrito_ciudad'
        ]
      }
    }
  });
}

export async function extractSpecsWithGemini(
  title: string,
  rawPrice: string,
  description: string,
  locationText: string
): Promise<ExtractedMacSpecs> {
  const model = getGenerativeModel();

  const prompt = `
Eres un experto tasador y técnico de hardware Apple en Perú.
Analiza el siguiente anuncio de Facebook Marketplace de una MacBook Pro:
- TÍTULO: "${title}"
- PRECIO PUBLICADO: "${rawPrice}"
- DESCRIPCIÓN: "${description}"
- UBICACIÓN PUBLICADA: "${locationText}"

OBJETIVOS:
1. Identifica el chip procesador Apple Silicon: 'M1', 'M2', 'M3', 'M4', 'M5', o si es 'Intel' o 'Desconocido'.
2. Tamaño de pantalla en pulgadas (ej: 13, 14, 16 o null).
3. Memoria RAM en GB (ej: 8, 16, 18, 24, 32, 36, etc. o null).
4. Almacenamiento SSD en GB (ej: 256, 512, 1000 para 1TB, 2000 para 2TB o null).
5. Indica si incluye caja original (true/false) y si incluye cargador (true/false).
6. Ciclos de batería si se mencionan en número, de lo contrario null.
7. Moneda: 'PEN' o 'USD'. Si el precio original está en USD ($), conviértelo a Soles (tipo de cambio referencial ~3.75).
8. Normaliza el precio final en Soles (PEN) como entero o decimal positivo.
9. Determina si 'es_precio_gancho' (true si el precio publicado es absurdo como S/ 1, S/ 0, S/ 1234, o no tiene sentido real con el valor del equipo para obligar a preguntar por inbox).
10. Distrito o ciudad específica donde se encuentra el vendedor.
`;

  try {
    const response = await model.generateContent(prompt);
    const text = response.response.text()?.trim() || '{}';
    const parsed = JSON.parse(text) as ExtractedMacSpecs;
    return parsed;
  } catch (err) {
    console.error('Error procesando especificaciones con Gemini:', err);
    return {
      chip: 'Desconocido',
      pulgadas: null,
      ram_gb: null,
      almacenamiento_gb: null,
      incluye_caja: false,
      incluye_cargador: false,
      ciclos_bateria: null,
      moneda: 'PEN',
      precio_normalizado_pen: 0,
      es_precio_gancho: true,
      distrito_ciudad: locationText || 'Perú'
    };
  }
}
