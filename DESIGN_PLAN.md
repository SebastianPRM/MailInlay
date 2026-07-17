# Mail Inlay — design plan

## 1. Cel produktu

Mail Inlay ma dać użytkownikowi CMS szybki dostęp do codziennej obsługi poczty bez opuszczania panelu administracyjnego. Interfejs nie zakłada pełnego ekranu: stała nawigacja hosta pozostaje widoczna, a wtyczka adaptuje się do szerokości pozostałego obszaru.

Najważniejsze zadania użytkownika:

1. sprawdzić nowe wiadomości i ich priorytet,
2. szybko przeczytać wiadomość bez zmiany kontekstu,
3. odpowiedzieć, przekazać, zarchiwizować lub usunąć,
4. znaleźć wiadomość i przejść do wybranego folderu,
5. napisać nową wiadomość w granicach osadzenia.

## 2. Kierunek wizualny

Kierunek zachowuje charakter załączonego projektu:

- spokojne, neutralne powierzchnie i niebieski akcent działania,
- małe promienie, subtelne obramowania i ograniczone cienie,
- czytelna typografia systemowa Geist,
- avatary inicjałowe i ikony liniowe,
- gęstość właściwa narzędziu administracyjnemu, bez efektu „ściśniętego Gmaila”.

## 3. Architektura osadzenia

Makieta pokazuje dwa warianty hosta przełączane w górnym pasku:

### CMS z menu pionowym

- pełne menu hosta: 224 px,
- przy szerokości viewportu poniżej 1120 px menu przechodzi do raila 68 px,
- poniżej 620 px rail ma 54 px i nadal pozostaje widoczny,
- Mail Inlay zajmuje wyłącznie pozostały obszar roboczy.

### CMS z menu poziomym

- globalny pasek hosta: 64 px,
- pasek kontekstowy: 48 px,
- przy mniejszych szerokościach nazwy sekcji znikają, ale ikony i aktywna sekcja pozostają widoczne,
- Mail Inlay nigdy nie przykrywa nawigacji hosta.

## 4. Responsywność kontenerowa Mail Inlay

Reguły zależą od szerokości kontenera wtyczki, a nie całego viewportu. Dzięki temu komponent może zostać osadzony w różnych CMS-ach, panelach, drawerach i layoutach z dodatkowymi kolumnami.

| Szerokość kontenera | Układ |
|---|---|
| powyżej 1120 px | foldery 202 px + lista 342 px + czytnik |
| 861–1120 px | foldery jako rail 62 px + lista 320 px + czytnik |
| 761–860 px | rail 58 px + lista 292 px + zwarty czytnik |
| do 760 px | lista na pełną szerokość, czytnik jako wsuwany panel, foldery w drawerze |
| do 480 px | skrócone etykiety akcji, pojedyncza kolumna załączników i maksymalnie zwarty toolbar |

## 5. Hierarchia i gęstość

- topbar Mail Inlay: 50 px,
- toolbar czytnika: 46 px,
- lista wiadomości: wiersz około 78 px,
- kluczowe klikane kontrolki: minimum 28–34 px w zwartej wersji,
- akcje destrukcyjne są oddzielone od odpowiedzi,
- daty, statusy i preview mają niższy kontrast, ale pozostają czytelne,
- widok pusty i brak wyników mają osobne komunikaty oraz działanie naprawcze.

## 6. Główne przepływy

### Czytanie wiadomości

Folder → lista → wiadomość → automatyczne oznaczenie jako przeczytana → działania w toolbarze lub pasku odpowiedzi.

### Odpowiedź

Wiadomość → Odpowiedz / Wszystkim / Przekaż → edytor z uzupełnionym odbiorcą i tematem → walidacja → potwierdzenie wysłania.

### Nowa wiadomość

Nowa wiadomość / Napisz → modal wyśrodkowany względem całego viewportu CMS → walidacja odbiorcy i tematu → toast sukcesu.

### Organizacja

Gwiazda, archiwizacja, oznaczenie jako nieprzeczytana, kosz, filtr nieprzeczytanych, wyszukiwanie oraz zmiana folderu działają na danych makiety.

## 7. Stany UX uwzględnione w makiecie

- aktywny folder i aktywna wiadomość,
- przeczytana / nieprzeczytana,
- oznaczona gwiazdką,
- synchronizacja i sukces odświeżenia,
- pusty folder i brak wyników,
- aktywny filtr,
- drawer folderów,
- wsuwany czytnik dla wąskiego kontenera,
- menu dodatkowych działań,
- zablokowane obrazy z możliwością odblokowania,
- walidacja formularza,
- potwierdzenia przez toast,
- redukcja animacji dla `prefers-reduced-motion`.

## 8. Dostępność

- semantyczne `nav`, `header`, `section`, `article` i `time`,
- etykiety `aria-label` dla przycisków ikonowych,
- `aria-current`, `aria-pressed`, `aria-expanded` i `aria-invalid`,
- fokus klawiatury o wysokiej widoczności,
- obsługa klawiatury dla gwiazdki w liście,
- komunikaty `role="status"` i `role="alert"`,
- brak interakcji zależnych wyłącznie od hovera.

## 9. Rekomendacje wdrożeniowe

1. Zachować logikę container queries i nie zastępować jej breakpointami viewportu.
2. Przekazać do wtyczki realną wysokość obszaru CMS lub użyć rodzica `display: flex; min-height: 0`.
3. Renderować dialog kompozycji przez portal do `document.body`, aby zachować wyśrodkowanie względem całego viewportu niezależnie od container queries wtyczki.
4. Podłączyć foldery, liczniki, wyszukiwanie i akcje do jednego źródła stanu skrzynki.
5. Dodać w produkcji tryb ładowania, błąd połączenia, offline i konflikt szkicu.
6. Utrzymać minimum 320 px szerokości obszaru roboczego po odjęciu menu CMS.

## 10. Zakres dalszego rozwoju

- resizable split panes dla użytkowników pracujących na dużych ekranach,
- widok wątków i grupowanie konwersacji,
- etykiety i reguły automatyczne,
- wiele kont pocztowych,
- skróty klawiaturowe i command palette,
- tryb ciemny mapowany na tokeny hosta,
- wersja white-label dziedzicząca kolory, promienie i font CMS.
