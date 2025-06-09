Poniżej znajdziesz kompletną dokumentację techniczną projektu **FormAgent**. Dokumentacja zawiera:

* Cel projektu
* Ogólny opis działania
* Struktura katalogów
* Opis plików i modułów
* Diagramy ASCII pokazujące przepływ danych
* Instrukcję instalacji i uruchomienia

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
