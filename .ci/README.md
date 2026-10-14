# CI: lekkie na GitHub, ciężkie lokalnie

`python3 -B .ci/ci.py auto --sha FULL_SHA --receipt /tmp/prm-light-SHA.json`
sprawdza lekkie Actions przez istniejącą autoryzację `gh`. Przy niedostępności,
braku minut lub niewystartowanym jobie wykonuje te same lekkie kontrole lokalnie.
Rzeczywisty błąd testu pozostaje blokadą. Bez autoryzacji API fallback działa
lokalnie; nie pobiera tokenów z przeglądarki ani innego projektu.

`python3 -B .ci/ci.py plan --sha FULL_SHA` pokazuje podział. Pełne wymagania
ciężkich kontroli zachowano w `local-workflows/`: to specyfikacje dla agenta,
nie pliki przeznaczone do wykonania przez `bash` ani automatyczny runner YAML.
Agent odtwarza ich testy, usługi testowe, wersje narzędzi, macierze i bramki
obrazów właściwymi skryptami projektu w izolowanym środowisku dla tego SHA.
Akcje GitHub i pakowanie/upload zastępuje lokalnym buildem oraz transportem
strumieniowym, bez archiwów obrazów na Macu. Publikacja/deploy pozostają
oddzielnymi operacjami w zakresie zlecenia; testy używają baz testowych.

Lekki PASS nigdy nie zastępuje pełnej regresji i bramki gotowego obrazu.
Agent przed wydaniem zapisuje osobne wyniki wszystkich wymaganych ciężkich
kontroli i sprawdzonego artefaktu. Nie publikuje fikcyjnego SUCCESS w Actions.
Zmiana wyłącznie instrukcji/routera CI wymaga jego regresji i walidacji
workflow; nie wymaga ponownego budowania niezmienionej aplikacji.

Po potwierdzeniu serwera i rollbacku agent usuwa zbędne produkty tego zadania
z Maca od razu, bez czekania pięciu dni i bez kasowania źródeł/danych.
Szczegóły: [procedura](../docs/CI_AND_MAC_CLEANUP.md).
