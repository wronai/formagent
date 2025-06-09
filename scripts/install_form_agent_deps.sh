#!/bin/bash

set -e

echo "🔍 Wykrywanie systemu operacyjnego..."
OS=$(grep '^ID=' /etc/os-release | cut -d'=' -f2 | tr -d '"')
echo "🖥️  System: $OS"

install_package() {
  if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    sudo apt update && sudo apt install -y "$@"
  elif [[ "$OS" == "fedora" || "$OS" == "centos" ]]; then
    sudo dnf install -y "$@"
  elif [[ "$OS" == "arch" ]]; then
    sudo pacman -Syu --noconfirm "$@"
  else
    echo "❌ Niewspierany system: $OS"
    exit 1
  fi
}

# 🟢 Node.js
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" < "v20" ]]; then
  echo "📦 Instalacja Node.js 20+..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  install_package nodejs
else
  echo "✅ Node.js już zainstalowany: $(node -v)"
fi

# 🟢 Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "🐳 Instalacja Dockera..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "⚠️  Wyloguj się i zaloguj ponownie, aby Docker działał bez sudo."
else
  echo "✅ Docker już zainstalowany: $(docker --version)"
fi

# 🟢 Docker Compose
if ! command -v docker-compose >/dev/null 2>&1; then
  echo "🔧 Instalacja Docker Compose..."
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
else
  echo "✅ Docker Compose już zainstalowany: $(docker-compose --version)"
fi

# 🟢 Ollama
if ! command -v ollama >/dev/null 2>&1; then
  echo "📥 Instalacja Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo "✅ Ollama już zainstalowany: $(ollama --version || echo '(brak wersji)')"
fi

# 🟢 Zależności Playwright (główne biblioteki dla Chromium)
echo "📦 Instalacja zależności systemowych do Playwright..."
install_package libnss3 libatk-bridge2.0-0 libxss1 libasound2 libgtk-3-0 libx11-xcb1 \
  fonts-liberation xvfb unzip curl wget git ca-certificates

echo "✅ Wszystkie wymagane komponenty są zainstalowane."
echo "ℹ️  Jeśli to pierwsza instalacja Dockera, uruchom ponownie sesję lub użyj: newgrp docker"
