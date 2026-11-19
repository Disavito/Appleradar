# 🛰️ MacRadar: Monitor Inteligente de MacBooks en Marketplace

Aplicación full-stack para rastrear ofertas de MacBook Pro (M1, M2, M3, M4, M5) en **Facebook Marketplace (Lima y Arequipa)** con extracción estructurada mediante **Gemini 2.5 Flash**, almacenamiento en **Firebase Firestore**, **notificaciones Push nativas para Web y Móvil (PWA)** y despliegue listo en **Coolify / Docker**.

---

## 🔔 Notificaciones Push en Celular y PC (Sin Telegram)
- **Cero aplicaciones externas:** No necesitas instalar Telegram ni configurar bots.
- **PWA (Progressive Web App):** Puedes abrir la web en tu celular (Chrome / Safari / Firefox) y pulsar *"Agregar a la pantalla de inicio"* para instalarla como una app nativa.
- **Notificaciones Nativas:** Al pulsar el botón **"Activar Notificaciones Push"** en el encabezado, el Service Worker te enviará alertas nativas de escritorio y del sistema operativo móvil cuando:
  1. Se detecte una **bajada de precio** en cualquier MacBook monitoreada.
  2. Aparezca una **nueva publicación de MacBook** con precio real verificado.
- Al tocar o hacer clic en la notificación, te llevará directamente al anuncio en Facebook Marketplace.

---

## 📁 Estructura del Proyecto

```text
macradar/
├── docker-compose.yml          # Despliegue con un solo clic en Coolify
├── worker/                     # Servicio de Scraping e Inteligencia Artificial
│   ├── Dockerfile              # Imagen de producción con dependencias Chromium
│   ├── .env.example            # Variables de entorno requeridas
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config.ts           # Configuración central y constantes
│       ├── scraper.ts          # Patchright + Bloqueo de multimedia/fuentes
│       ├── gemini.ts           # Extracción JSON estricta (Gemini 2.5 Flash)
│       ├── firestore.ts        # Admin SDK: Deduplicación e historial de precios
│       ├── telegram.ts         # Notificaciones al detectar bajadas de precio
│       ├── types.ts            # Tipado TypeScript
│       └── index.ts            # Cronjob (cada 3h con jitter aleatorio)
└── web/                        # Dashboard en Tiempo Real (React + Vite + Tailwind)
    ├── Dockerfile              # Imagen Nginx lista para Coolify
    ├── package.json
    ├── tailwind.config.js
    └── src/
        ├── App.tsx             # Conexión onSnapshot con Firestore
        ├── components/
        │   ├── MetricsCards.tsx # Métricas de precios min/avg por M1-M5
        │   └── ListingsTable.tsx# Tabla con filtros de chip, caja, cargador y gancho
        └── types.ts
```

---

## 🚀 Despliegue en tu VPS con Coolify

Dado que ya tienes **Coolify** instalado en tu VPS Leaseweb (8 vCPUs, 24GB RAM):

### Opción 1: Despliegue mediante Docker Compose (Recomendado)
1. En tu panel de Coolify, crea un nuevo **Project** o entra a uno existente.
2. Haz clic en **+ New Resource** -> **Docker Compose**.
3. Pega el contenido de `docker-compose.yml` de este repositorio o conecta tu repo de GitHub.
4. En la pestaña **Environment Variables**, configura tus claves (ver sección de variables).
5. Haz clic en **Deploy**. ¡Coolify se encargará de compilar las imágenes y mantener los contenedores activos con auto-restart!

### Opción 2: Correr solo el Worker en Coolify y la Web en Firebase Hosting
* Si prefieres usar Firebase Hosting gratuito para la web:
  1. En Coolify crea un recurso apuntando únicamente a la carpeta `worker/` (usará `worker/Dockerfile`).
  2. En tu PC ejecutas `cd web && npm run build && firebase deploy --only hosting`.

---

## 🔐 Variables de Entorno para el Worker

Copia y pega estas variables en la sección de **Environment Variables** en Coolify:

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `PROXY_SERVER` | Servidor proxy residencial | `http://pr.oxylabs.io:7777` |
| `PROXY_USER` | Usuario del proxy | `customer_123` |
| `PROXY_PASS` | Contraseña del proxy | `secreta_pass` |
| `GEMINI_API_KEY` | Llave API de Google AI Studio | `AIzaSy...` |
| `FIREBASE_SERVICE_ACCOUNT` | Credenciales de servicio Firebase (JSON en una línea) | `{"type":"service_account",...}` |
| `CRON_SCHEDULE` | Frecuencia de ejecución | `0 */3 * * *` (Cada 3 horas) |
| `RUN_ON_BOOT` | Ejecutar ciclo de prueba al iniciar | `true` |

---

## 💡 Mecanismo de Ahorro y Antibanqueo Implementado
1. **Bloqueo de Multimedia:** En `scraper.ts`, toda solicitud con resourceType `image`, `media` o `font` es abortada inmediatamente vía `page.route()`.
2. **Doble Filtro de Firestore:** El worker nunca abre la URL individual de un anuncio que ya esté registrado en la base de datos. Solo consume navegación individual (6 a 14 segundos de espera) para IDs nuevos.
3. **Consumo de Datos:** ~15 MB/día monitoreando 5 generaciones en 2 ciudades cada 3 horas.
