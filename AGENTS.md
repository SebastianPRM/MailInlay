

<!-- codex-ci-cleanup-policy-2026-10-14 -->
## CI bez kosztów i sprzątanie po wdrożeniu
- Lekkie CI uruchamiaj na GitHub Actions w darmowym limicie; ciężkie buildy, pełne regresje/przeglądarki i bramki gotowych obrazów lokalnie na komputerze bieżącego wykonawcy. Gdy Actions nie startuje z powodu limitu/awarii lub GitHub jest niedostępny, wykonaj także lekkie kontrole lokalnie bez czekania, pytania o wykonawcę i nowych kosztów. Rzeczywisty błąd testu blokuje wydanie; fallback go nie unieważnia. Zachowaj wszystkie wymagane kontrole dla dokładnego SHA i uczciwe receipty.
- „Lokalnie” oznacza komputer bieżącego wykonawcy: właściciel pracuje na swoim Macu, a inna osoba lub jej agent wykonuje CI na własnym komputerze. Nie czekaj na dostępność Maca właściciela ani nie używaj go jako wspólnego runnera. Każdy wykonawca sprząta własne artefakty po weryfikacji serwera i rollbacku.
- Awaria GitHub: lokalne commity/testy, `push pending`, potem fetch, połączenie zmian i zwykły push; bez force-push. Nowego wydania nie promuj bez potwierdzenia zdalnego main.
- Po potwierdzonym działaniu właściwego wydania na serwerze usuń od razu własne zbędne buildy, obrazy CI, konteksty i cache z Maca; najpierw potwierdź niezależny artefakt i serwerowy rollback. Chroń źródła, diff, Git, sekrety, dane, wolumeny, backupy i finalne podpisane wydania. Bez globalnego prune i dodatkowych timerów.
- Pełna procedura: [CI i sprzątanie Maca](docs/CI_AND_MAC_CLEANUP.md). Wybór wykonawcy i sprzątanie są częścią zlecenia, bez kolejnej zgody.
<!-- /codex-ci-cleanup-policy-2026-10-14 -->
