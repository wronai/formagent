# FormAgent - Automated Form Filling and Job Application Tool

FormAgent to zaawansowane narzędzie do automatyzacji wypełniania formularzy i aplikowania o pracę. Wspiera:

* Automatyczne wypełnianie formularzy internetowych
* Aplikowanie o pracę na wielu portalach
* Obsługę plików (CV, listy motywacyjne)
* Lokalne modele LLM (poprzez Ollama) do inteligentnego wypełniania pól
* Pełną prywatność i działanie offline

## 📋 Spis treści

1. [Szybki start](#-szybki-start)
2. [Funkcje](#-funkcje)
3. [Struktura projektu](#-struktura-projektu)
4. [Konfiguracja](#-konfiguracja)
5. [Użycie](#-użycie)
6. [Przykłady](#-przykłady)
7. [Rozwój](#-rozwój)

---

## 🚀 Szybki start

1. **Zainstaluj zależności:**
   ```bash
   npm install
   npx playwright install
   ```

2. **Skonfiguruj dane użytkownika:**
   ```bash
   cp .env.example .env
   # Edytuj plik .env i ustaw swoje dane
   ```

3. **Dodaj oferty pracy do pliku `job_urls.txt`**

4. **Uruchom aplikację:**
   ```bash
   npm run apply
   ```

## ✨ Funkcje

- **Automatyczne wypełnianie formularzy** - Wykrywa i wypełnia pola formularzy na podstawie konfiguracji
- **Obsługa plików** - Automatyczny upload CV i listu motywacyjnego
- **Zarządzanie ciasteczkami** - Automatyczna akceptacja powiadomień o ciasteczkach
- **Konfigurowalne zadania** - Definiuj niestandardowe przepływy pracy w plikach YAML
- **Obsługa wielu ofert** - Przetwarzaj wiele ofert pracy z pojedynczego pliku
- **Logowanie** - Szczegółowe logi wszystkich akcji

## 📂 Struktura projektu

```
formagent/
├── src/                  # Kod źródłowy
│   ├── taskRunner.js     # Silnik przetwarzania zadań
│   └── ...
├── tasks/               # Definicje zadań (YAML)
│   ├── job_application_pipeline.yaml
│   └── example_pipeline.yaml
├── documents/            # Dokumenty (CV, listy motywacyjne)
├── job_urls.txt         # Lista URL-i ofert pracy
├── .env                 # Konfiguracja środowiskowa
└── package.json         # Zależności i skrypty
```

## ⚙️ Konfiguracja

Skopiuj plik `.env.example` do `.env` i dostosuj ustawienia:

```env
# Dane użytkownika
USER_FIRST_NAME=Jan
USER_LAST_NAME=Kowalski
USER_EMAIL=jan.kowalski@example.com
USER_PHONE=+48123456789

# Ścieżki do dokumentów
CV_PATH=./documents/cv.pdf
COVER_LETTER_PATH=./documents/cover_letter.pdf

# Ustawienia przeglądarki
HEADLESS=false
TIMEOUT=30000
```

## 🚀 Użycie

1. **Uruchamianie aplikacji:**
   ```bash
   # Uruchomienie głównego serwera
   npm start
   
   # Uruchomienie automatyzacji aplikowania o pracę
   npm run apply
   ```

2. **Dodawanie ofert pracy:**
   Edytuj plik `job_urls.txt` i dodaj adresy URL ofert pracy, po jednym w każdej linii.

3. **Dostosowywanie procesu aplikacji:**
   Modyfikuj pliki w katalogu `tasks/` aby dostosować proces aplikacji do różnych portali.

## 📝 Przykłady

### Przykładowy plik zadań (YAML)

```yaml
# tasks/example_pipeline.yaml
version: '1.0'
name: "Job Application Pipeline"
tasks:
  - name: "Accept Cookies"
    type: "click"
    selector: "button:has-text('Alle akzeptieren')"
    optional: true

  - name: "Fill Personal Information"
    type: "fill"
    fields:
      - selector: "input[name='first_name']"
        value: "${user.firstName}"
      - selector: "input[name='last_name']"
        value: "${user.lastName}"
      - selector: "input[type='email']"
        value: "${user.email}"
```

## 🛠 Rozwój

1. **Instalacja zależności developerskich:**
   ```bash
   npm install
   ```

2. **Uruchomienie testów:**
   ```bash
   npm test
   ```

3. **Tworzenie nowego zadania:**
   - Dodaj nowy plik YAML w katalogu `tasks/`
   - Zdefiniuj kroki wypełniania formularza
   - Przetestuj za pomocą `npm run pipeline -- tasks/twoje_zadanie.yaml`

## 📄 Licencja

MIT

---

# 📘 **Dokumentacja techniczna: FormAgent**

## 🎯 Cel projektu

**FormAgent** to narzędzie do automatycznego wypełniania formularzy internetowych z wykorzystaniem:

* lokalnych modeli LLM (np. LLaMA, Mistral, LLava przez Ollama)
* Playwrighta do automatyzacji przeglądarki
* specyfikacji formularzy zapisanych w Markdown
* możliwości uploadu plików (CV, obrazy itp.)
* pełnej prywatności i działania offline

## 🧠 Jak to działa?

1. Markdown z definicją formularza i danych wejściowych
2. Parser konwertuje Markdown do JSON (field → value)
3. LLM (Ollama) analizuje HTML strony i specyfikację
4. Tworzona jest mapa pól formularza (selektor → wartość)
5. Playwright wypełnia formularz w przeglądarce i uploaduje pliki
6. Tworzy się zrzut ekranu lub potwierdzenie
7. Możliwe dalsze akcje (np. wysłanie e-maila)

. dane prywatne pobieraj z .env
stworz env.example, zeby pokazac przyklad
---

## 📂 Struktura katalogu

```
formagent/
│
├── agent/
│   ├── main.js         # Główna logika wykonania
│   ├── parser.js       # Parser Markdown → JSON
│   ├── ollama.js       # Klient lokalnego LLM (Ollama)
│   └── config.js       # Konfiguracja (porty, modele)
│
├── specs/
│   └── form_acme.md    # Przykładowa specyfikacja formularza
│
├── test/
│   ├── test-parser.js  # Testy parsera
│   ├── test-run.js     # Test integracyjny
│   └── test_files/
│       └── form_sample.html # Mock HTML formularza
│
├── uploads/            # Katalog na załączniki
├── screenshots/        # Zrzuty ekranu z Playwrighta
├── .gitignore
└── package.json
```

---

## 📄 Opis plików

### `agent/main.js`

> Punkt wejścia aplikacji.
> Wczytuje specyfikację formularza, odpytuje LLM, wykonuje akcje w przeglądarce.

---

### `agent/parser.js`

> Konwertuje Markdown do obiektu JSON mapującego pola na wartości.
> Umożliwia walidację obecności wymaganych danych.

---

### `agent/ollama.js`

> Interfejs do lokalnego modelu LLM przez `ollama generate`.
> Wysyła prompt zawierający HTML strony + dane w Markdown.

---

### `agent/config.js`

> Centralna konfiguracja projektu – ścieżki, nazwy modeli, porty.

---

### `specs/form_acme.md`

> Plik wejściowy – Markdown z opisem pól formularza i zmiennych w stylu `${email}`.
> Umożliwia szybkie tworzenie nowych formularzy przez nieprogramistów.

---

### `test/test-parser.js`

> Test jednostkowy dla parsera Markdown. Upewnia się, że dane są poprawnie rozpoznawane.

---

### `test/test-run.js`

> Test integracyjny uruchamiający pełny cykl na przykładzie.

---

## 🔁 Diagram przepływu danych

```
+--------------------+
|  form_acme.md      |
+--------------------+
         |
         v
+--------------------+
|  parser.js         |  => { "first_name": "Jan", ... }
+--------------------+
         |
         v
+----------------------------+
|  page.content() + JSON     |
+----------------------------+
         |
         v
+------------------------+
|  ollama.js             | → prompt
|  (LLM analiza HTML)    |
+------------------------+
         |
         v
+-----------------------------+
|  { "#fname": "Jan", ... }  |
+-----------------------------+
         |
         v
+--------------------------+
|  main.js + Playwright   |
|  (wypełnianie + upload) |
+--------------------------+
         |
         v
+--------------------------+
|  screenshot.png / PDF   |
+--------------------------+
```

---

## ⚙️ Instalacja i uruchomienie

1. **Zainstaluj zależności**:

```bash
npm install
```

2. **Uruchom testy**:

```bash
npm test
```

3. **Uruchom pełny agent**:

```bash
npm start
```

---

## 🧪 Testy

* `mocha` + `chai` do testów jednostkowych
* Test integracyjny uruchamiający `main.js` i sprawdzający, czy formularz został wypełniony

---

## 📈 Możliwości rozbudowy

* Obsługa CAPTCHA z użyciem OCR (`llava`)
* Generowanie danych z LinkedIn (np. do CV)
* Dashboard z wynikami (sukcesy / błędy)
* Wersjonowanie specyfikacji formularzy

---

## 📌 Wymagania systemowe

* Node.js 18+
* Docker (dla Ollama)
* Ollama CLI (`ollama run llama3`)
* Linux z X11 lub headless browser

---

Chcesz, żebym teraz uzupełnił pliki `main.js`, `parser.js`, `ollama.js` i `config.js` konkretną implementacją?
