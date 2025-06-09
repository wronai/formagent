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

## 🏗 Architektura systemu

FormAgent to system modułowy, który składa się z następujących głównych komponentów:

1. **Silnik przetwarzania zadań** - zarządza wykonywaniem zadań w sekwencji
   - [src/taskRunner.js](src/taskRunner.js) - Główny silnik wykonujący zadania
   - [run-job-applications.js](run-job-applications.js) - Główny skrypt aplikacji

2. **Konfiguracja** - centralne zarządzanie ustawieniami
   - [.env](.env) - Plik konfiguracyjny z danymi użytkownika
   - [src/config.js](src/config.js) - Ładowanie i walidacja konfiguracji

3. **Automatyzacja przeglądarki**
   - [src/browserAutomation.js](src/browserAutomation.js) - Niskopoziomowe funkcje przeglądarki
   - [test/simpleDemo.js](test/simpleDemo.js) - Przykłady użycia automatyzacji

4. **Przetwarzanie formularzy**
   - [tasks/job_application_pipeline.yaml](tasks/job_application_pipeline.yaml) - Definicja kroków wypełniania formularza
   - [tasks/example_pipeline.yaml](tasks/example_pipeline.yaml) - Przykładowa konfiguracja

5. **Narzędzia pomocnicze**
   - [src/utils/logger.js](src/utils/logger.js) - System logowania
   - [src/utils/fileUtils.js](src/utils/fileUtils.js) - Operacje na plikach
   - [scripts/check-setup.js](scripts/check-setup.js) - Weryfikacja konfiguracji

## 📂 Struktura projektu i opis plików

### Główne pliki

- [run-job-applications.js](run-job-applications.js) - Główny skrypt do uruchamiania automatyzacji aplikowania o pracę
  - Wczytuje listę URL-i z `job_urls.txt`
  - Dla każdego URL-a uruchamia odpowiedni pipeline
  - Obsługuje równoległe przetwarzanie zadań
  - Zapisuje szczegółowe logi

- [run-pipeline.js](run-pipeline.js) - Narzędzie do uruchamiania pojedynczych zadań z linii poleceń
  - Umożliwia testowanie pojedynczych zadań YAML
  - Przydatne do debugowania i rozwijania nowych funkcji

- [package.json](package.json) - Konfiguracja projektu i zależności
  - Definicja skryptów (start, test, apply)
  - Lista zależności (playwright, js-yaml, itp.)
  - Metadane projektu

- [.env](.env) - Konfiguracja środowiskowa
  - Dane użytkownika (imię, nazwisko, email, telefon)
  - Ścieżki do dokumentów (CV, list motywacyjny)
  - Ustawienia przeglądarki i logowania

- [job_urls.txt](job_urls.txt) - Lista URL-i ofert pracy
  - Jeden URL w każdej linii
  - Linie zaczynające się od `#` są ignorowane
  - Przykład:
    ```
    # Przykładowe oferty
    https://example.com/job/123
    https://example.com/job/456
    ```

### Katalog `src/` - Kod źródłowy

- [src/taskRunner.js](src/taskRunner.js) - Główny silnik wykonujący zadania zdefiniowane w YAML
  - Wykonuje zadania sekwencyjnie według definicji w plikach YAML
  - Obsługuje różne typy zadań (kliknięcie, wypełnienie formularza, upload pliku)
  - Zapewnia mechanizm ponawiania prób w przypadku błędów
  - Generuje szczegółowe logi z wykonania zadań

- [src/browserAutomation.js](src/browserAutomation.js) - Niskopoziomowe funkcje automatyzacji przeglądarki
  - Inicjalizacja i konfiguracja przeglądarki Playwright
  - Obsługa interakcji ze stroną (nawigacja, kliknięcia, wprowadzanie tekstu)
  - Mechanizmy oczekiwania na elementy (timeout, warunki widoczności)
  - Obsługa okien dialogowych i powiadomień

- [src/config.js](src/config.js) - Zarządzanie konfiguracją
  - Ładowanie i walidacja zmiennych środowiskowych z pliku `.env`
  - Dostarcza domyślne wartości dla brakujących ustawień
  - Centralne miejsce konfiguracji dla całej aplikacji

- [src/utils/](src/utils/) - Narzędzia pomocnicze
  - [fileUtils.js](src/utils/fileUtils.js) - Operacje na plikach
    - Tworzenie katalogów i sprawdzanie uprawnień
    - Operacje na ścieżkach plików
    - Obsługa uploadu plików
  - [logger.js](src/utils/logger.js) - System logowania
    - Poziomy logowania (error, warn, info, debug)
    - Zapisywanie logów do pliku i konsoli
    - Formatowanie wiadomości logów

### Katalog `tasks/` - Definicje zadań (YAML)

- [tasks/job_application_pipeline.yaml](tasks/job_application_pipeline.yaml) - Główna definicja procesu aplikacji o pracę
  - Definiuje kroki automatyzacji w formacie YAML
  - Obsługuje różne typy akcji (nawigacja, kliknięcie, wypełnienie formularza, upload pliku)
  - Umożliwia definiowanie zmiennych i wyrażeń warunkowych
  - Przykładowa struktura:
    ```yaml
    - name: "Accept Cookies"
      type: "click"
      selector: "button:has-text('Accept All')"
      optional: true
    ```

- [tasks/example_pipeline.yaml](tasks/example_pipeline.yaml) - Przykładowa konfiguracja
  - Demonstruje różne możliwości systemu
  - Zawiera komentarze wyjaśniające poszczególne elementy
  - Może być używany jako szablon do tworzenia własnych zadań

### Katalog `documents/` - Dokumenty aplikacyjne

- [documents/cv.pdf](documents/cv.pdf) - Twoje CV (wymagane)
  - Główny dokument aplikacyjny
  - Powinien być w formacie PDF
  - Rekomendowana nazwa pliku: `cv.pdf`

- [documents/cover_letter.pdf](documents/cover_letter.pdf) - List motywacyjny (opcjonalny)
  - Dostosowany do oferty pracy
  - Przechowywany w formacie PDF
  - Może być generowany dynamicznie na podstawie szablonu

- [documents/README.md](documents/README.md) - Instrukcje dotyczące dokumentów
  - Opis wymagań dotyczących plików
  - Wskazówki dotyczące formatowania
  - Najlepsze praktyki dotyczące nazewnictwa plików

### Katalog `scripts/` - Narzędzia pomocnicze

- `check-setup.js` - Skrypt do weryfikacji poprawności konfiguracji

## 🔄 Przepływ danych

1. Użytkownik przygotowuje plik `job_urls.txt` z listą ofert pracy
2. System wczytuje konfigurację z pliku `.env`
3. Dla każdego URL-a z pliku:
   - Wczytuje odpowiednią konfigurację zadania (YAML)
   - Inicjalizuje przeglądarkę
   - Wykonuje zdefiniowane kroki (nawigacja, wypełnianie formularza, upload plików)
   - Obsługuje błędy i podejmuje próby ponowienia
   - Zapisuje logi i zrzuty ekranu

## 🧩 Integracja z zewnętrznymi usługami

- **Playwright** - Automatyzacja przeglądarki
- **Ollama** - Lokalne modele AI do inteligentnego wypełniania formularzy (opcjonalnie)
- **SMTP** - Wysyłanie powiadomień e-mail (konfigurowalne)

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
