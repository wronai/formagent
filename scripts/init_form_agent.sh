#!/bin/bash

PROJECT_NAME="form-agent"

echo "📁 Tworzenie projektu: $PROJECT_NAME"
mkdir -p $PROJECT_NAME/{src,uploads,logs}

echo "📄 Tworzenie plików projektu..."

touch $PROJECT_NAME/package.json
touch $PROJECT_NAME/Dockerfile
touch $PROJECT_NAME/docker-compose.yml
touch $PROJECT_NAME/server.js
touch $PROJECT_NAME/.gitignore

# Pliki źródłowe
touch $PROJECT_NAME/src/autoFillForm.js
touch $PROJECT_NAME/src/markdownParser.js
touch $PROJECT_NAME/src/ollamaClient.js
touch $PROJECT_NAME/src/validator.js

# Przykładowe dane wejściowe
echo "# Specyfikacja formularza" > $PROJECT_NAME/uploads/form_spec.md
touch $PROJECT_NAME/uploads/cv.pdf

# README
cat <<EOF > $PROJECT_NAME/README.md
# Form Agent 🤖

System do automatycznego wypełniania formularzy z wykorzystaniem:
- Node.js (Express)
- Playwright
- Lokalny LLM przez Ollama

## Uruchomienie

\`\`\`bash
docker-compose up --build
\`\`\`

## Struktura
- \`server.js\` – punkt wejściowy API
- \`src/autoFillForm.js\` – główna logika Playwright
- \`src/markdownParser.js\` – konwersja Markdown -> JSON
- \`src/ollamaClient.js\` – integracja z lokalnym LLM
- \`uploads/\` – pliki wejściowe użytkownika
EOF

# .gitignore
cat <<EOF > $PROJECT_NAME/.gitignore
node_modules/
uploads/
logs/
*.log
EOF

echo "✅ Projekt $PROJECT_NAME gotowy!"
