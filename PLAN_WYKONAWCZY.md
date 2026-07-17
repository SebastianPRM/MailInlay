# MailInlay 1.0 — plan wykonawczy (uproszczony)

## 1. Cel

MailInlay ma być możliwie prostą wtyczką pocztową do paneli administracyjnych
React i Next.js.

Administrator:

1. loguje się do istniejącego panelu;
2. otwiera zakładkę „Poczta”;
3. od razu widzi pocztę projektu;
4. nie loguje się drugi raz do skrzynki.

MailInlay korzysta z istniejącej sesji panelu. Dane IMAP i SMTP pozostają
wyłącznie po stronie serwera.

Ten dokument uzupełnia specyfikację funkcjonalną i wybiera najprostsze
rozwiązania, które zachowują wymaganą funkcjonalność oraz bezpieczeństwo.

## 2. Najprostsza architektura

```text
Panel React/Next.js
        │
        ├── MailPanel
        │       └── fetch do jednego apiBase
        │
        └── Route Handler Next.js
                ├── sprawdza sesję panelu
                ├── pobiera skrzynkę przypisaną do projektu
                ├── wykonuje jedną operację IMAP/SMTP
                └── zamyka połączenie
```

Nie tworzymy:

- drugiego logowania;
- osobnej aplikacji;
- osobnego backendu;
- własnej bazy;
- synchronizacji poczty;
- cache serwerowego;
- workera;
- WebSocketów;
- IMAP IDLE;
- mikroserwisów;
- Dockera wymaganego do działania;
- systemu uprawnień wewnątrz MailInlay.

## 3. Podział odpowiedzialności

### Aplikacja nadrzędna

Aplikacja, w której osadzono MailInlay:

- loguje administratora;
- decyduje, kto może wejść na stronę poczty;
- zapisuje konfigurację skrzynki w swojej bazie;
- szyfruje hasła IMAP/SMTP;
- dostarcza funkcję `getSession`;
- dostarcza funkcję `getMailbox`;
- sprawdza przypisanie skrzynki do projektu.

### MailInlay

MailInlay:

- wywołuje `getSession` przy każdym żądaniu;
- wywołuje `getMailbox` przy każdym żądaniu;
- łączy się z IMAP i SMTP;
- czyta, wysyła i modyfikuje wiadomości;
- waliduje dane;
- czyści HTML;
- blokuje zewnętrzne obrazy;
- pilnuje limitów;
- nigdy nie zwraca danych logowania do przeglądarki.

### Serwer pocztowy

Serwer IMAP/SMTP:

- przechowuje wiadomości;
- przechowuje foldery i flagi;
- uwierzytelnia skrzynkę;
- wysyła wiadomości.

## 4. Jedna paczka

Instalacja:

```bash
pnpm add @mailinlay/sdk
```

Eksporty:

```ts
@mailinlay/sdk/react
@mailinlay/sdk/next
@mailinlay/sdk/styles.css
```

Publiczny komponent:

```ts
export type MailPanelProps = {
  apiBase: string;
  mailboxId: string;
  className?: string;
};

export function MailPanel(props: MailPanelProps): JSX.Element;
```

Przykład:

```tsx
import { MailPanel } from "@mailinlay/sdk/react";
import "@mailinlay/sdk/styles.css";

export default function MailPage() {
  return (
    <MailPanel
      apiBase="/api/admin/mail"
      mailboxId="main"
      className="project-mail"
    />
  );
}
```

Nie dodajemy Providera, hooków publicznych, slotów ani trybu headless.

## 5. Integracja Next.js

Projekt tworzy jeden Route Handler:

```text
app/api/admin/mail/[...mailinlay]/route.ts
```

```ts
import { createMailInlayHandler } from "@mailinlay/sdk/next";

import {
  getCurrentSession,
  getMailbox
} from "@/lib/mailinlay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const handler = createMailInlayHandler({
  getSession: getCurrentSession,
  getMailbox
});

export const GET = handler.GET;
export const POST = handler.POST;
export const PATCH = handler.PATCH;
export const DELETE = handler.DELETE;
```

Oficjalny adapter backendu w wersji 1.0 obsługuje Next.js App Router.
Komponent React może działać w innym panelu React, jeżeli panel udostępni
zgodne API HTTP.

## 6. Sesja i dostęp do skrzynki

```ts
export type SessionContext = {
  userId: string;
  projectId: string;
};

export type GetSession = (
  request: Request
) => Promise<SessionContext | null>;
```

Brak sesji zawsze daje `401`.

```ts
export type GetMailbox = (input: {
  mailboxId: string;
  session: SessionContext;
}) => Promise<MailboxConfig | null>;
```

`getMailbox` musi znaleźć skrzynkę po:

```text
mailboxId + session.projectId + aktywność skrzynki
```

Jeżeli skrzynka nie istnieje albo należy do innego projektu, funkcja zwraca
`null`, a MailInlay odpowiada ogólnym `404`.

`mailboxId` nie jest uprawnieniem. Nie wolno pobierać skrzynki wyłącznie po jej
identyfikatorze bez ograniczenia do projektu z sesji.

## 7. Konfiguracja skrzynki

```ts
export type MailboxConfig = {
  id: string;
  email: string;
  displayName?: string;

  imap: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };

  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };

  signatureHtml?: string;

  folders?: {
    sent?: string;
    trash?: string;
    spam?: string;
  };

  saveToSent?: boolean;
};
```

`saveToSent`:

- domyślnie `true`;
- gdy `true`, MailInlay zapisuje wysłaną wiadomość w Sent przez IMAP;
- gdy dostawca robi to automatycznie, projekt ustawia `false`.

To jest jedyne opcjonalne rozszerzenie podstawowej konfiguracji.

## 8. Prosty kontrakt API

Wszystkie endpointy znajdują się pod `apiBase`.

Każde żądanie zawiera `mailboxId` i ponownie przechodzi przez:

```text
getSession → getMailbox → walidacja → IMAP/SMTP
```

### Foldery

```text
GET /folders?mailboxId=main
```

Zwraca wyłącznie bezpieczne dane folderów. Nie zwraca konfiguracji połączenia
ani podpisu.

### Lista wiadomości

```text
GET /messages
    ?mailboxId=main
    &folder=INBOX
    &page=1
    &limit=30
    &query=
```

Zwraca:

- nadawcę;
- temat;
- datę;
- `seen`;
- `flagged`;
- informację o załączniku;
- `messageKey`.

Nie zwraca treści wiadomości.

### Odczyt wiadomości

```text
GET /messages/:messageKey?mailboxId=main
```

Zwraca:

- nadawcę;
- Reply-To;
- odbiorców;
- DW;
- datę;
- temat;
- Message-ID i References;
- tekst lub oczyszczony HTML;
- listę załączników.

### Zmiana flag

```text
PATCH /messages/:messageKey
```

```json
{
  "mailboxId": "main",
  "seen": true,
  "flagged": false
}
```

### Przeniesienie

```text
POST /messages/:messageKey/move
```

```json
{
  "mailboxId": "main",
  "destinationFolder": "Trash"
}
```

### Trwałe usunięcie

```text
DELETE /messages/:messageKey?mailboxId=main
```

DELETE jest dozwolony wyłącznie dla wiadomości znajdującej się w rozpoznanym
folderze Trash.

### Pobranie załącznika

```text
GET /messages/:messageKey/attachments/:attachmentId?mailboxId=main
```

### Wysłanie

```text
POST /send
Content-Type: multipart/form-data
```

Pola:

```text
mailboxId
to
cc
bcc
subject
bodyHtml
bodyText
quotedHtml       opcjonalnie
quotedText       opcjonalnie
inReplyTo        opcjonalnie
references       opcjonalnie
attachments      zero lub więcej plików
```

Nie dodajemy większego publicznego API.

## 9. Identyfikacja wiadomości

`messageKey` jest prostym Base64URL zakodowanym z:

```ts
type MessageKey = {
  folder: string;
  uidValidity: string;
  uid: number;
};
```

Klucz:

- nie zawiera hasła;
- nie jest dowodem uprawnienia;
- służy tylko do wskazania wiadomości;
- po zmianie `UIDVALIDITY` przestaje działać.

Każda operacja nadal wymaga poprawnej sesji i skrzynki przypisanej do projektu.
Zmiana klucza przez użytkownika nie pozwala przejść do innej skrzynki.

`attachmentId` jest identyfikatorem części MIME. Serwer ponownie sprawdza jego
istnienie, nazwę, typ i rozmiar.

## 10. Obsługa IMAP

### Jedno połączenie na żądanie

Każda operacja:

1. tworzy klienta ImapFlow;
2. łączy się;
3. wykonuje operację;
4. zamyka połączenie w `finally`.

Nie utrzymujemy połączeń między requestami.

### Foldery

Rozpoznawanie folderów:

1. `MailboxConfig.folders`;
2. IMAP SPECIAL-USE;
3. proste dopasowanie popularnych nazw.

MailInlay nie tworzy nowych folderów.

Jeżeli Trash nie zostanie rozpoznany, przeniesienie do kosza jest wyłączone.
Nie zastępujemy go trwałym usunięciem.

### Lista

- 30 wiadomości na stronę;
- maksymalnie 100 na żądanie;
- najnowsze najpierw;
- pobierane są tylko nagłówki, flagi i informacja o załącznikach;
- treść nie jest pobierana;
- kolejne wiadomości są pobierane przyciskiem „Załaduj więcej”.

### Wyszukiwanie

Wyszukiwanie działa po stronie IMAP i obejmuje:

- From;
- To;
- Cc;
- Subject.

Nie przeszukuje treści. Żądanie jest wysyłane po zatwierdzeniu wyszukiwania,
nie po każdym wpisanym znaku.

### Odczyt

Najprostsza wersja:

1. sprawdza rozmiar wiadomości;
2. pobiera pełne źródło wiadomości dopiero po jej otwarciu;
3. parsuje je przez `postal-mime`;
4. nie zwraca bajtów załączników w JSON;
5. zwraca treść i metadane załączników.

Maksymalny rozmiar źródła wiadomości otwieranego w wersji 1.0: 10 MB.

Jeżeli wiadomość jest większa, użytkownik widzi:

```text
Ta wiadomość jest za duża do otwarcia w tej instalacji.
Otwórz ją w zewnętrznym kliencie poczty.
```

Ten limit upraszcza parser, chroni pamięć funkcji i ogranicza ryzyko
przekroczenia czasu Vercel.

Obrazy osadzone przez `cid:` nie mają w wersji 1.0 osobnego mechanizmu
renderowania. Są dostępne na liście załączników, jeżeli serwer zwróci je jako
części MIME.

### Flagi i przenoszenie

- operacje używają UID;
- otwarcie nieprzeczytanej wiadomości powoduje osobny PATCH `seen: true`;
- move unieważnia stary `messageKey`;
- po operacji klient odświeża listę;
- trwałe usuwanie jest możliwe tylko w Trash.

## 11. Obsługa SMTP

### Wymuszony nadawca

Pole From jest zawsze tworzone z:

```text
MailboxConfig.displayName + MailboxConfig.email
```

Klient nie może ustawić własnego nadawcy.

### Wysyłanie

Serwer:

1. waliduje odbiorców;
2. waliduje treść i pliki;
3. czyści HTML;
4. składa nową treść;
5. dodaje podpis z `MailboxConfig`;
6. dodaje cytowaną wiadomość, jeśli istnieje;
7. tworzy MIME;
8. wysyła SMTP;
9. opcjonalnie zapisuje to samo MIME w Sent.

### Sent

Jeżeli SMTP zakończy się sukcesem, ale zapis do Sent się nie powiedzie:

- wiadomość nie jest wysyłana ponownie;
- API zwraca sukces wysłania z ostrzeżeniem;
- UI pokazuje: „Wiadomość została wysłana, ale nie udało się zapisać jej w
  folderze Wysłane”.

### Reply

- odbiorcą jest Reply-To, a jeżeli go nie ma — From;
- ustawiamy In-Reply-To i References;
- dodajemy `Re:`, jeżeli nie ma już odpowiedniego prefiksu.

### Reply All

- zaczynamy od Reply-To albo From;
- dodajemy pierwotne To i Cc;
- usuwamy adres aktualnej skrzynki;
- usuwamy duplikaty.

### Forward

Forward w wersji 1.0:

- cytuje treść oryginalnej wiadomości;
- pokazuje datę, nadawcę, odbiorców i temat;
- dodaje `Fwd:`;
- nie dołącza automatycznie oryginalnych załączników.

Użytkownik może ręcznie dodać małe pliki. Automatyczne przekazywanie
załączników może zostać dodane później bez zmiany podstawowej architektury.

## 12. Limity

| Element | Limit |
| --- | ---: |
| Wiadomości na pierwszej stronie | 30 |
| Maksymalny limit listy | 100 |
| Odbiorcy To + Cc + Bcc | 25 |
| Liczba wysyłanych plików | 10 |
| Jeden wysyłany plik | 3 MB |
| Wszystkie wysyłane pliki | 3 MB |
| Pobierany załącznik | 4 MB |
| Źródło otwieranej wiadomości | 10 MB |
| Temat | 500 znaków |
| Zapytanie wyszukiwania | 200 znaków |
| Treść wysyłanej wiadomości | 1 MB |

Limity są sprawdzane po stronie klienta dla wygody i ponownie po stronie
serwera dla bezpieczeństwa.

## 13. Bezpieczne HTML

HTML wiadomości jest niezaufany.

`sanitize-html` usuwa:

- skrypty;
- iframe;
- formularze;
- pola formularzy;
- object i embed;
- SVG i MathML;
- event handlery `on*`;
- `javascript:`;
- style zawierające zewnętrzne URL;
- nieobsługiwane znaczniki i atrybuty.

Zewnętrzne obrazy:

1. nie otrzymują aktywnego `src`;
2. są domyślnie zablokowane;
3. mogą być aktywowane tylko dla bieżącej wiadomości po kliknięciu
   „Pokaż obrazy”;
4. decyzja nie jest zapisywana globalnie.

Linki otwierają się w nowej karcie i otrzymują:

```html
rel="noopener noreferrer"
```

Wiadomość jest renderowana przez `dangerouslySetInnerHTML` wyłącznie po
sanitacji wykonanej na serwerze.

## 14. Minimalne bezpieczeństwo

Te elementy są obowiązkowe i nie mogą zostać uproszczone:

### Izolacja projektów

- `getSession` przy każdym żądaniu;
- `getMailbox` przy każdym żądaniu;
- zapytanie o skrzynkę zawsze ograniczone do `session.projectId`;
- ogólne `404` dla skrzynki nieistniejącej i cudzej.

### Ochrona danych logowania

- konfiguracja IMAP/SMTP tylko po stronie serwera;
- brak haseł w API;
- brak haseł w logach;
- brak konfiguracji skrzynki w bundlu React;
- odszyfrowanie hasła dopiero w `getMailbox`.

### Połączenia

- Node Runtime;
- TLS z weryfikacją certyfikatu;
- STARTTLS wymagany, gdy `secure: false`;
- timeout połączenia;
- `logout` w `finally`;
- maksymalny czas operacji krótszy niż 30 sekund.

### Mutacje

- `apiBase` musi być same-origin;
- POST, PATCH i DELETE sprawdzają nagłówek Origin;
- adresy i nagłówki są walidowane;
- znaki CR/LF w nagłówkach są odrzucane;
- From jest wymuszony.

### Odpowiedzi

Wszystkie odpowiedzi pocztowe otrzymują:

```http
Cache-Control: private, no-store
```

Załączniki otrzymują:

```http
Content-Disposition: attachment
X-Content-Type-Options: nosniff
```

### Logowanie

Logujemy tylko:

- typ operacji;
- czas;
- ogólny kod błędu.

Nie logujemy:

- adresów;
- tematów;
- treści;
- nazw plików;
- nagłówków;
- danych IMAP/SMTP.

Nie tworzymy osobnego systemu logowania ani request ID.

## 15. Interfejs React

### Stan

Stan jest lokalny w `MailPanel` i używa `useState` lub `useReducer`.

Nie instalujemy:

- React Query;
- Redux;
- Zustand;
- innej biblioteki store.

### Pobieranie danych

Wewnętrzny klient używa zwykłego `fetch`:

- `credentials: "same-origin"`;
- `AbortController`;
- anulowanie starego żądania po zmianie folderu;
- brak dwóch równoczesnych odświeżeń tej samej listy.

### Odświeżanie

- po otwarciu zakładki;
- po zmianie folderu;
- po ręcznym odświeżeniu;
- po powrocie do aktywnej karty;
- co 45 sekund, gdy karta jest widoczna.

### Układ

Desktop:

```text
Foldery | Lista | Wiadomość
```

Mniejszy panel:

```text
Lista | Wiadomość
```

Foldery otwierają się w wysuwanym menu.

Mobile:

```text
Foldery → Lista → Wiadomość
```

Kompozytor jest modalem, a na mobile zajmuje cały ekran.

### Edytor

Minimalny Tiptap:

- pogrubienie;
- kursywa;
- podkreślenie;
- lista punktowana;
- lista numerowana;
- link;
- cytat;
- undo;
- redo;
- wyczyszczenie formatowania.

Nie ma obrazów w edytorze, tabel, kolorów, fontów, rozmiarów ani edycji HTML.

### Język

Wersja 1.0 ma polski interfejs. Nie budujemy systemu tłumaczeń.

### Dostępność

- przyciski ikonowe mają `aria-label`;
- modal zarządza focusem;
- klawiatura pozwala przejść przez główne akcje;
- unread i flagged nie są komunikowane wyłącznie kolorem;
- błędy są czytelne i nie zawierają szczegółów serwera.

## 16. Style

CSS jest ograniczony do `.mail-inlay` oraz `.compose-layer` renderowanego przez
portal poza kontenerem komponentu.

Paczka nie ustawia globalnych stylów dla:

- `body`;
- `button`;
- `input`;
- `a`;
- `p`.

Podstawowe zmienne:

```css
.mi-root {
  --mi-primary: #2563eb;
  --mi-background: transparent;
  --mi-surface: #ffffff;
  --mi-surface-hover: #f5f5f5;
  --mi-text: #18181b;
  --mi-muted: #71717a;
  --mi-border: #e4e4e7;
  --mi-radius: 8px;
  --mi-font-family: inherit;
}
```

Projekt dopasowuje wygląd przez `className` i CSS Variables.

## 17. Proste błędy API

```ts
type ErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};
```

Wystarczą następujące kody:

| HTTP | Kod |
| ---: | --- |
| 400 | `INVALID_REQUEST` |
| 401 | `UNAUTHORIZED` |
| 404 | `MAILBOX_NOT_FOUND` |
| 404 | `MESSAGE_NOT_FOUND` |
| 413 | `TOO_LARGE` |
| 422 | `LIMIT_EXCEEDED` |
| 502 | `MAIL_SERVER_ERROR` |
| 504 | `MAIL_SERVER_TIMEOUT` |

UI zamienia je na polskie komunikaty. Nie pokazujemy użytkownikowi surowych
błędów IMAP i SMTP.

## 18. Struktura repozytorium

```text
mailinlay/
├── src/
│   ├── react/
│   │   ├── MailPanel.tsx
│   │   ├── FolderList.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageReader.tsx
│   │   ├── MailComposer.tsx
│   │   └── SimpleEditor.tsx
│   ├── server/
│   │   ├── imap.ts
│   │   ├── smtp.ts
│   │   ├── parser.ts
│   │   ├── sanitizer.ts
│   │   └── folders.ts
│   ├── next/
│   │   └── createMailInlayHandler.ts
│   ├── shared/
│   │   ├── types.ts
│   │   ├── schemas.ts
│   │   └── errors.ts
│   └── styles/
│       └── mailinlay.css
├── demo/
├── tests/
├── package.json
├── README.md
└── PLAN_WYKONAWCZY.md
```

Nie tworzymy dodatkowych warstw i katalogów, dopóki kod rzeczywiście ich nie
potrzebuje.

## 19. Biblioteki

Runtime:

- `imapflow`;
- `nodemailer`;
- `postal-mime`;
- `sanitize-html`;
- `zod`;
- `@tiptap/react`;
- `@tiptap/starter-kit`;
- wymagane małe rozszerzenia Tiptap;
- `lucide-react`.

React i React DOM są peer dependencies.

Nie dodajemy bibliotek do cache, stanu globalnego, kolejek, realtime ani ORM.

## 20. Etapy realizacji

### Etap 1 — paczka i kontrakty

- konfiguracja TypeScript i buildu;
- trzy entrypointy;
- typy publiczne;
- schematy Zod;
- prosty model błędów;
- demo importujące paczkę.

Gotowe, gdy paczka buduje się i instaluje z `pnpm pack`.

### Etap 2 — bezpieczny handler i IMAP read

- routing endpointów;
- `getSession`;
- `getMailbox`;
- walidacja same-origin;
- połączenie IMAP;
- foldery;
- lista;
- wyszukiwanie;
- odczyt i parsowanie wiadomości;
- sanitacja HTML;
- pobranie małego załącznika.

Gotowe, gdy zalogowany administrator widzi foldery, listę i bezpieczną treść,
a użytkownik innego projektu nie może odczytać skrzynki.

### Etap 3 — operacje IMAP

- seen/unseen;
- gwiazdka;
- move;
- Trash;
- DELETE tylko w Trash.

Gotowe, gdy operacje działają na UID i odświeżają listę.

### Etap 4 — SMTP

- nowa wiadomość;
- DW i UDW;
- małe pliki;
- podpis;
- zapis do Sent;
- Reply;
- Reply All;
- Forward bez automatycznych oryginalnych załączników.

Gotowe, gdy wiadomość można wysłać, a błąd zapisu w Sent nie powoduje
ponownego wysłania.

### Etap 5 — interfejs React

- foldery;
- lista;
- czytnik;
- kompozytor;
- Tiptap;
- wyszukiwanie;
- polling;
- stany loading, empty i error.

Gotowe, gdy cały przepływ działa bez przeładowania strony.

### Etap 6 — mobile, bezpieczeństwo i testy

- responsywność;
- focus i podstawowa dostępność;
- testy sesji i izolacji projektów;
- testy XSS;
- testy limitów;
- testy TLS i timeoutów;
- sprawdzenie braku sekretów w bundlu klienta.

Gotowe, gdy krytyczne testy bezpieczeństwa przechodzą.

### Etap 7 — demo i wydanie

- kompletne demo Next.js;
- README;
- instalacja tarballa w czystym projekcie;
- test na prawdziwej skrzynce;
- smoke test Vercel;
- publikacja `1.0.0`.

## 21. Minimalny zestaw testów

### Backend

- brak sesji daje `401`;
- cudzy `mailboxId` nie zwraca skrzynki;
- hasła nie trafiają do odpowiedzi;
- lista nie pobiera treści;
- zbyt duża wiadomość nie jest parsowana;
- zbyt duży załącznik nie jest zwracany;
- połączenie zamyka się po sukcesie i błędzie;
- Origin innej strony blokuje mutację;
- From nie może zostać zmieniony przez klienta;
- błąd Sent nie powoduje drugiego wysłania.

### HTML

- `<script>` jest usuwany;
- event handlery są usuwane;
- iframe i formularze są usuwane;
- `javascript:` jest usuwany;
- zdalne obrazy są nieaktywne do kliknięcia.

### React

- zmiana folderu;
- „Załaduj więcej”;
- otwarcie wiadomości;
- oznaczenie jako przeczytana;
- gwiazdka;
- przeniesienie;
- wysłanie;
- Reply All bez duplikatów;
- układ mobile;
- anulowanie nieaktualnego requestu.

### Integracja

- jedna testowa skrzynka IMAP/SMTP;
- dwa projekty w demo do sprawdzenia izolacji;
- build i uruchomienie jako Vercel Node Function.

## 22. Kryteria gotowej wersji 1.0

MailInlay 1.0 jest gotowy, gdy:

- [x] instaluje się jako jedna paczka;
- [x] ma trzy wymagane eksporty;
- [x] działa w Next.js App Router;
- [x] nie ma własnego logowania;
- [x] używa sesji panelu;
- [x] każda operacja sprawdza przypisanie skrzynki do projektu;
- [x] hasła nie trafiają do przeglądarki ani logów;
- [x] wyświetla foldery;
- [x] pobiera listę partiami po 30;
- [x] pobiera treść dopiero po otwarciu;
- [x] czyści HTML;
- [x] blokuje zewnętrzne obrazy;
- [x] pobiera małe załączniki;
- [x] obsługuje flagi, move, Trash i DELETE w Trash;
- [x] wysyła wiadomości przez SMTP;
- [x] wymusza nadawcę z konfiguracji;
- [x] obsługuje DW, UDW i małe pliki;
- [x] dodaje podpis;
- [x] obsługuje Reply, Reply All i Forward;
- [x] zapisuje wiadomość w Sent albo pokazuje ostrzeżenie;
- [x] działa na desktopie i mobile;
- [x] wygląd można zmienić przez CSS Variables;
- [x] test izolacji projektów przechodzi;
- [x] testy XSS, limitów i TLS przechodzą;
- [x] nie zawiera funkcji CRM, helpdesk, kalendarza, offline ani realtime.

Stan na 17 lipca 2026: implementacja, demonstrator lokalny, testy automatyczne,
test instalacji paczki oraz live test IMAP/SMTP na skrzynce testowej zostały
wykonane. Wdrożenie do konkretnego panelu produkcyjnego wymaga już tylko
podpięcia jego istniejących funkcji sesji i odczytu zaszyfrowanej konfiguracji
skrzynki zgodnie z rozdziałami 5–7.

## 23. Świadome ograniczenia wersji 1.0

- wiadomości większe niż 10 MB nie są otwierane;
- załączniki większe niż 4 MB nie są pobierane;
- wysyłane pliki mają łącznie maksymalnie 3 MB;
- Forward nie dołącza automatycznie oryginalnych załączników;
- obrazy `cid:` nie mają specjalnego renderowania;
- nie ma szkiców;
- nie ma wątków;
- nie ma wielu skrzynek w jednej instancji komponentu;
- nie ma OAuth;
- nie ma realtime;
- nie ma własnego rate limitera;
- nie ma własnego szyfrowania ani modelu bazy;
- nie ma CLI.

Te ograniczenia są celowe. Dzięki nim wersja 1.0 pozostaje mała, możliwa do
utrzymania i bezpieczna bez dodatkowej infrastruktury.
