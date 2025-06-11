# Jak działa aplikacja Skyvern?

Ten dokument opisuje, w jaki sposób aplikacja automatyzuje proces wypełniania formularzy na podstawie przesłanego pliku CV. Użyjemy diagramów ASCII i Mermaid, aby zilustrować kluczowe kroki.

## Ogólny schemat działania

Aplikacja została zaprojektowana, aby uprościć proces aplikacji o pracę poprzez automatyczne wypełnianie formularzy rekrutacyjnych danymi z CV kandydata.

## Diagram przepływu (Mermaid)

Poniższy diagram przedstawia cały proces, od momentu przesłania CV przez użytkownika, aż do wypełnienia i wysłania formularza.

```mermaid
graph TD
    A[Użytkownik inicjuje proces] --> B{Przesłanie pliku CV};
    B --> C[Analiza CV i ekstrakcja danych];
    C --> D{Otwarcie strony z formularzem};
    D --> E[Detekcja pól w formularzu<br>(np. Imię, Nazwisko, Email)];
    E --> F[Mapowanie danych z CV na pola formularza];
    F --> G[Automatyczne wypełnianie pól];
    G --> H{Znalezienie pola do uploadu pliku};
    H --> I[Przesłanie pliku CV];
    I --> J[Zatwierdzenie i wysłanie formularza];
    J --> K[Zakończenie procesu];
```

## Szczegółowy opis kroków

Poniżej znajduje się szczegółowy opis każdego etapu z wizualizacjami w postaci ASCII art.

### Krok 1: Użytkownik przesyła CV

Użytkownik wybiera plik CV (np. w formacie PDF lub DOCX) i przekazuje go do systemu.

```ascii
+-------------------+      +----------------------+
|   Użytkownik      |----->|   Aplikacja Skyvern  |
| (przeglądarka)    |      |                      |
|                   |      | Oczekiwanie na plik  |
|  [Wybierz plik]   |      |                      |
|  cv_jan_kowal.pdf |      +----------------------+
+-------------------+
```

### Krok 2: Analiza CV i ekstrakcja danych

Aplikacja analizuje treść dokumentu CV, aby wyodrębnić kluczowe informacje, takie jak:
- Imię i nazwisko
- Adres e-mail
- Numer telefonu
- Doświadczenie zawodowe
- Wykształcenie
- Umiejętności

```ascii
+----------------------+      +--------------------------+
|   Aplikacja Skyvern  |      |   Wyodrębnione dane      |
|                      |      +--------------------------+
|  [cv_jan_kowal.pdf]  |----->| Imię: Jan                |
|                      |      | Nazwisko: Kowalski       |
|   Parser CV         |      | Email: jan@example.com   |
|                      |      | Telefon: 123-456-789     |
+----------------------+      | ...                      |
                            +--------------------------+
```

### Krok 3: Detekcja pól w formularzu

Aplikacja nawiguje do docelowej strony internetowej i analizuje jej strukturę (DOM), aby zidentyfikować pola formularza do wypełnienia. Wykorzystuje do tego etykiety pól (`<label>`), atrybuty `name`, `id` oraz inne wskazówki.

```ascii
+----------------------+      +--------------------------------+
|   Aplikacja Skyvern  |      |      Strona internetowa        |
|                      |      +--------------------------------+
|  Analizator DOM      |----->| <label>Imię:</label>           |
|                      |      | <input type="text" id="fname"> |
|                      |      |                                |
|                      |      | <label>E-mail:</label>         |
|                      |      | <input type="email" id="email">|
+----------------------+      +--------------------------------+
```

### Krok 4: Wypełnianie formularza

Wyodrębnione dane z CV są wprowadzane w odpowiednie pola zidentyfikowanego formularza.

```ascii
+--------------------------+      +--------------------------------+
|   Wyodrębnione dane      |      |      Strona internetowa        |
+--------------------------+      +--------------------------------+
| Imię: Jan                |----->| <input value="Jan">            |
| Email: jan@example.com   |----->| <input value="jan@example.com">|
+--------------------------+      +--------------------------------+
```

### Krok 5: Przesłanie pliku CV

Aplikacja znajduje na stronie pole typu `file input` przeznaczone do załączenia CV i automatycznie przesyła oryginalny plik.

```ascii
+----------------------+      +--------------------------------+
|   Aplikacja Skyvern  |      |      Strona internetowa        |
|                      |      +--------------------------------+
|  [cv_jan_kowal.pdf]  |----->| <input type="file">            |
|                      |      |  -> cv_jan_kowal.pdf           |
+----------------------+      +--------------------------------+
```

### Krok 6: Zakończenie

Po wypełnieniu wszystkich wymaganych pól i załączeniu pliku, aplikacja może (opcjonalnie) kliknąć przycisk "Wyślij" lub "Aplikuj", finalizując proces.

```ascii
+----------------------+      +--------------------------------+
|   Aplikacja Skyvern  |      |      Strona internetowa        |
|                      |      +--------------------------------+
|   Akcja końcowa      |----->|      [ Przycisk APLIKUJ ]      |
|                      |      |         *kliknięcie*           |
+----------------------+      +--------------------------------+

```
