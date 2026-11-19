# Imagen base oficial de Node 20 sobre Debian Bookworm
FROM node:20-bookworm-slim

# Instalar dependencias necesarias para Chromium / Patchright
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar manifiestos e instalar dependencias
COPY package*.json ./
RUN npm install

# Instalar los binarios de navegación de patchright
RUN npx patchright install chromium

# Copiar el código fuente y archivos de configuración
COPY tsconfig.json ./
COPY src ./src
COPY fb_cookies*.json ./

# Compilar TypeScript a JavaScript
RUN npm run build

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV RUN_ON_BOOT=true

# Comando para iniciar el worker
CMD ["npm", "start"]
