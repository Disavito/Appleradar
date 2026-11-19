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
            enum: ['MacBook Pro', 'MacBook Air', 'MacBook', 'iPad', 'Mac Mini', 'iMac', 'Otro']
          },
          chip: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['M1', 'M2', 'M3', 'M4', 'M5', 'A-Series', 'Intel', 'Desconocido']
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
          distrito_ciudad: { type: SchemaType.STRING },
          tags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          }
        },
        required: [
          'categoria',
          'chip',
          'incluye_caja',
          'incluye_cargador',
          'moneda',
          'precio_normalizado_pen',
          'es_precio_gancho',
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

OBJETIVOS:
1. Categoría exacta del producto: 'MacBook Pro', 'MacBook Air', 'MacBook', 'iPad', 'Mac Mini', 'iMac', u 'Otro'.
2. Identifica el chip procesador: 'M1', 'M2', 'M3', 'M4', 'M5', 'A-Series' (para iPads/iPhones sin M), 'Intel', o 'Desconocido'.
3. Tamaño de pantalla en pulgadas (ej: 11, 12.9, 13, 14, 15, 16 o null).
4. Memoria RAM en GB (ej: 8, 16, 18, 24, 32, 36, etc. o null).
5. Almacenamiento SSD en GB (ej: 128, 256, 512, 1000 para 1TB, 2000 para 2TB o null).
6. Indica si incluye caja original (true/false) y si incluye cargador (true/false).
7. Ciclos de batería si se mencionan en número, de lo contrario null.
8. Moneda: 'PEN' o 'USD'. Si el precio original está en USD ($), conviértelo a Soles (tipo de cambio referencial ~3.75).
9. Normaliza el precio final en Soles (PEN) como entero o decimal positivo.
10. Determina si 'es_precio_gancho' (true si el precio publicado es absurdo como S/ 1, S/ 0, S/ 1234, o no tiene sentido real con el valor del equipo para obligar a preguntar por inbox).
11. Distrito o zona específica donde se encuentra el vendedor (ej: "Miraflores, Lima", "Yanahuara, Arequipa", "Trujillo").
12. Genera de 2 a 5 'tags' cortos y útiles en español (ej: ["M3 Pro", "Sellado", "Garantía Apple", "Batería 100%", "Touch Bar", "Apple Pencil"]).
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
        pulgadas: null,
        ram_gb: null,
        almacenamiento_gb: null,
        incluye_caja: false,
        incluye_cargador: false,
        ciclos_bateria: null,
        moneda: 'PEN',
        precio_normalizado_pen: 0,
        es_precio_gancho: true,
        distrito_ciudad: locationText || 'Perú',
        tags: []
      }
    };
  }
}
