FROM node:20-slim

# Instalacja Playwright i zależności do przeglądarki
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    unzip \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Instalacja Playwright i pozostałych zależności
RUN npm i -g pnpm && pnpm dlx playwright install chromium

WORKDIR /app

# Instalacja zależności Node.js
COPY package*.json ./
RUN npm install

# Kopiujemy cały kod aplikacji
COPY . .

# Domyślny port API
EXPOSE 3000

CMD ["node", "server.js"]
