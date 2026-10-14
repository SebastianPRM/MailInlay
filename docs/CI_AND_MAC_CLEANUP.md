# CI bez opłat i sprzątanie komputera wykonawcy po wdrożeniu

Uzgodnienie właściciela z 14.10.2026. Dotyczy CI i odtwarzalnych artefaktów, gdy projekt ma kod/build; nie zmienia zgód na działania biznesowe, urządzenia ani zakresu hostingu.

## Gdzie wykonujemy kontrole

**Za lokalne CI odpowiada osoba lub agent wykonujący zmianę/wdrożenie. Właściciel używa własnego Maca; każdy inny wykonawca używa własnego komputera i własnej lokalnej mapy zatwierdzonych dostępów. Mac właściciela nie jest centralnym runnerem i jego dostępność nie jest warunkiem pracy zespołu.** Zachowaj wersje narzędzi projektu i docelową architekturę obrazu; linuksowe bramki wykonuj w Linuksie/Dockerze, a na Windows w zgodnym środowisku, np. WSL2. Profile Colima i ścieżki konkretnego operatora są jego lokalną konfiguracją, nie wymaganiem dla pozostałych osób.

- **Lekkie kontrole wykonuj na GitHub Actions w darmowym limicie. Ciężkie buildy Docker/Next/Flutter, pełne regresje, testy przeglądarek i bramki gotowych obrazów wykonuj lokalnie na komputerze bieżącego wykonawcy. Gdy brakuje minut Actions, job nie startuje albo GitHub jest niedostępny, także lekkie kontrole wykonuj lokalnie — bez pytania, czekania na reset i nowych kosztów.**
- Odtwórz wymagane kroki workflow/AGENTS: testy, typy/lint, build i bramkę gotowego obrazu. Zachowaj wersje narzędzi oraz platformę docelową. Linuksowe bramki uruchamiaj w Linuksie; nie zastępuj ich niezgodnym Bashem macOS. Nie pomijaj kontroli ani nie oznaczaj nieuruchomionego joba GitHub jako SUCCESS.
- Wykonuj CI dla dokładnego commita; zachowuj niepowiązany diff. Kontener/build context nie może zawierać produkcyjnych sekretów, danych, profili logowania ani całego katalogu operatora. Nie uruchamiaj ciężkich buildów równolegle z innym ciężkim buildem/Chromium na tym samym wykonawcy. Nie restartuj cudzych lokalnych baz/VM i nie dokładaj stale działających runnerów tylko dla fallbacku.
- Apps01 jest wykonawcą awaryjnym wyłącznie dla projektów już do niego przypisanych: pełne buildy przez `prm-serialized-build`, pojedynczo, przy minimum 6144 MiB dostępnego RAM, PSI full avg10 <1% i pustej kolejce Coolify. Chromium korzysta ze wspólnej blokady. Nie obniżaj progów ani nie zatrzymuj produkcji dla buildu. Inne projekty zachowują własne uzgodnione środowiska; ta procedura nie przenosi ich na apps01.
- Dostępy i lokalizacje narzędzi odszukaj w `ACCESS.md`, `.codex/access.local.md` i, gdy potrzebne, `~/.codex/access-index.json`. Wspólne instrukcje nie zawierają prywatnych ścieżek/sekretów konkretnej osoby. Nie zwiększaj budżetów, nie kupuj infrastruktury i nie publikuj prywatnego kodu dla darmowych minut.

## Lekkie kontrole i lokalny fallback

Lekkie kontrole obejmują szybkie testy bez przeglądarki/bazy, lint/typy małych projektów, składnię i kontrolę konfiguracji. Hostowane lekkie joby mają limit 5–8 minut, anulowanie zastąpionych przebiegów i minimalny dostęp. Nie przenoś dużej regresji do lekkiego joba pod inną nazwą.

Repozytoria z `.ci/ci.py` używają `python3 -B .ci/ci.py auto --sha FULL_SHA --receipt PATH`: agent sprawdza wykonanie wymaganych lekkich workflow przez istniejącą autoryzację `gh`; przy braku wykonawcy/autoryzacji API wykonuje te same lekkie kontrole lokalnie. Nie wymaga stale działającego runnera. Lekki workflow GitHub startuje automatycznie po pushu/PR; lokalny fallback uruchamia aktywny agent w tym samym zadaniu. Niedostępność Maca właściciela nie blokuje innych wykonawców: każdy korzysta ze swojego działającego komputera.

Rzeczywisty błąd testu nadal blokuje wydanie. Brak uruchomionych kroków może oznaczać limit wykonawcy; nie traktuj dowolnego czerwonego CI jako braku minut. Przeniesione `.ci/local-workflows/` zachowują pełne wymagania ciężkich kontroli (wersje, bazy testowe, macierze, bramki). Są specyfikacją dla agenta, a nie samodzielnym lokalnym runnerem YAML. Pełne kontrole wykonuj właściwymi skryptami projektu; zapisuj oddzielne receipty SHA/artefaktu. Sam lekki PASS nie zezwala na wydanie.

## Awaria GitHub / brak dostępu do Git

1. Odróżnij limit Actions od awarii GitHub/sieci, błędu autoryzacji i uszkodzenia lokalnego repozytorium. Użyj istniejącego dedykowanego dostępu projektu. Osobistego MFA/Touch ID nie obchodź; tylko rzeczywiście niedostępny krok osobisty wymaga użytkownika.
2. Gdy GitHub nie odpowiada, kontynuuj lokalną pracę, commity i kontrole dostępnego kodu. Zapisz SHA, wyniki, logi i stan `push pending`. Brak wymaganej zależności/cache jest konkretną blokadą kontroli, nie wynikiem PASS; nie zastępuj jej przypadkową wersją.
3. Nie resetuj/stashuj ani nie nadpisuj pracy, nie wykonuj force-push i nie twórz zastępczego płatnego Gita. Gdy nie działa samo lokalne repozytorium, zachowaj pliki i zdiagnozuj problem; nie usuwaj `.git` i nie inicjalizuj repo ponownie.
4. Nowego wydania nie promuj automatycznie bez potwierdzenia aktualnego zdalnego main i przejścia wymaganych bramek. Istniejąca produkcja pozostaje na sprawdzonym obrazie. Objete zleceniem awaryjne wycofanie do zachowanego, sprawdzonego wydania nie wymaga pobierania nowego kodu z GitHub; zachowaj guardy operatora projektu.
5. Po odzyskaniu połączenia wykonaj fetch, porównaj main, połącz równoległe zmiany bez przepisywania opublikowanej historii, sprawdź zmieniony wynik, wykonaj zwykły push i potwierdź wdrażany SHA. Identycznych zaliczonych testów nie powtarzaj tylko dlatego, że wróciła sieć. Push i deploy są odrębnymi operacjami.

## Obowiązkowe sprzątanie po udanym wdrożeniu

**Zlecenie buildu i wdrożenia obejmuje jego sprzątanie na komputerze wykonawcy bez kolejnej zgody. Sprzątaj w tym samym zadaniu, od razu po potwierdzeniu działania serwera; nie czekaj pięciu dni.**

1. Zanim usuniesz lokalny artefakt, potwierdź właściwy SHA/digest na serwerze, zdrowie usług, domenę/TLS i istotne funkcje aplikacji. Zapisz niewielki dowód: SHA, artefakt, czas, wyniki i polecenia. Sprawdzony obraz/wydanie musi istnieć niezależnie od komputera wykonawcy na serwerze lub w rejestrze, wraz z ograniczonym rollbackiem projektu. Test stagingu sam nie potwierdza wdrożenia produkcyjnego.
2. Usuń lokalne, odtwarzalne produkty tego wydania: tymczasowe konteksty, transporty/archiwa, nieużywane tagi i obrazy CI oraz wyłącznie wygenerowane katalogi zarejestrowane dla projektu, np. `.next`, `dist`, `build`, `.dart_tool`. Najpierw sprawdź, że nie zawierają źródeł, danych użytkownika, finalnego dostarczanego artefaktu ani plików śledzonych przez Git i nie korzysta z nich aktywny proces/kontener.
3. Usuń nieużywany cache tego buildu. W dedykowanym, bezczynnym builderze wyczyść nieużywany cache; po usunięciu rekordów liści mogą być potrzebne kolejne ograniczone przebiegi GC. Mierz dokładne bajty po każdym przebiegu. We współdzielonym środowisku chroń cudze aktywne zadania i używane obrazy; nie wykonuj globalnego prune danych. Jeżeli zasób jest faktycznie używany, zapisz konkretną przyczynę odroczenia i dokończ jego usunięcie, gdy zadanie zwolni zasób.
4. Zachowaj źródła, lokalne zmiany, `.git`, sekrety, bazy, wolumeny, profile przeglądarek, backupy, dane biznesowe oraz końcowe podpisane wydania i finalne pliki przekazane użytkownikowi. Nazwa `build`/`dist` sama nie upoważnia do skasowania zawartości. Nie usuwaj rollbacku serwerowego w ramach sprzątania Maca.
5. Nie twórz na komputerze wykonawcy dumpów produkcji, archiwów obrazów ani pełnych checkpointów/kopii serwera. Transporty obrazów przesyłaj strumieniem do właściwego hosta; po weryfikacji importu/wdrożenia usuń chwilowy transport także tam. Backupy apps01 biegną bezpośrednio na Hetzner.
6. Zatrzymaj wyłącznie uruchomiony do zadania profil buildowy, jeśli nie obsługuje innej aktywnej pracy. Sprawdź końcowe zużycie miejsca i brak naruszenia danych/aktywnych kontenerów. Podaj krótko co usunięto i ile faktycznie zostało; nie sumuj podwójnie warstw Docker i cache ani nie nazywaj usuniętych bajtów przyrostem wolnego miejsca netto.

Istniejąca centralna retencja (Mac: 5 dni i maks. 8 GB cache na zarejestrowany silnik; apps01: cache 3 GB, artefakty zwykle trzy wydania / 5 dni) jest zabezpieczeniem dla przerwanych zadań, a nie powodem pozostawiania ukończonego buildu na komputerze wykonawcy. Nie dodawaj timerów ani retencji danych biznesowych. Po błędzie również usuń zbędne pliki robocze, zachowując tylko potrzebne małe logi/dowody w ograniczonej retencji.

## Koniec zadania

Agent sam wykonuje lokalny fallback, powrót do GitHub, kontrole wydania i opisane sprzątanie w zakresie zlecenia. Nie pyta ponownie o rutynowy wybór wykonawcy CI, użycie zatwierdzonych dostępów ani usunięcie własnych zbędnych artefaktów. Faktyczną blokadę zapisuje konkretnie i wykonuje niezależną pracę. Tego uzgodnienia nie wolno zamieniać w zgodę na nowe koszty, pominięcie testów lub nieobjęte zleceniem wdrożenie.
