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
            enum: ['MacBook Pro', 'MacBook Air', 'MacBook', 'Mac Mini', 'iMac', 'Mac Studio', 'iPad', 'iPhone', 'Otro']
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
1. Categoría exacta: 'MacBook Pro', 'MacBook Air', 'MacBook', 'Mac Mini', 'iMac', 'Mac Studio', 'iPad', 'iPhone', u 'Otro'.
2. Chip principal: 'M1', 'M2', 'M3', 'M4', 'M5', 'Intel i9', 'Intel i7', 'Intel i5', 'A-Series', o 'Desconocido'.
3. Variante del chip Apple Silicon: 'Base' (si es M1/M2/M3/M4 normal), 'Pro' (si es M1 Pro, M2 Pro, M3 Pro, M4 Pro), 'Max' (M1/M2/M3/M4 Max), 'Ultra' (M1/M2 Ultra), o 'N/A' si es Intel/A-Series/Desconocido.
4. Tamaño de pantalla en pulgadas (ej: 6.1, 6.7, 11, 12.9, 13, 14, 15, 16, 24, 27 o null para Mac Mini/Studio).
5. Memoria RAM en GB (ej: 8, 16, 18, 24, 32, 36, 48, 64, 96, 128 o null).
6. Almacenamiento SSD en GB (ej: 128, 256, 512, 1000 para 1TB, 2000 para 2TB, 4000 para 4TB o null).
7. Indica si incluye caja original (true/false) y si incluye cargador (true/false).
8. Ciclos de batería en número y porcentaje de batería si se menciona (ej: 94), de lo contrario null.
9. Condición estética: 'Sellado', 'Como nuevo', 'Buen estado', 'Con detalle', o 'No indica'.
10. Moneda: 'PEN' o 'USD'. Si está en USD ($), conviértelo a Soles (tipo de cambio ~3.75).
11. Si el PRECIO PUBLICADO es gancho (S/ 1, S/ 0, S/ 123), busca el precio real en DESCRIPCIÓN o TÍTULO. Si lo encuentras, ponlo en 'precio_normalizado_pen', pon 'es_precio_gancho: false' y 'price_corrected: true'. Si no hay precio real, pon 'es_precio_gancho: true' y 'price_corrected: false'.
12. Distrito o zona específica del vendedor (ej: "Miraflores", "Cayma", "Wanchaq").
13. De 2 a 5 'tags' cortos y útiles en español (ej: ["M2 Max", "64GB RAM", "Sellado", "Garantía Apple"]).
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
        distrito_ciudad: locationText || 'Perú',
        tags: []
      }
    };
  }
}
