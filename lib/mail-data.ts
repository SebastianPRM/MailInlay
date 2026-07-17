export type FolderId = "inbox" | "starred" | "sent" | "drafts" | "archive" | "spam" | "trash"

export type MailFolder = {
  id: FolderId
  name: string
  icon: "inbox" | "star" | "send" | "file" | "archive" | "shield-alert" | "trash"
  count?: number
}

export type Message = {
  id: string
  folder: FolderId
  fromName: string
  fromEmail: string
  to: string[]
  cc?: string[]
  subject: string
  preview: string
  body: string[]
  date: string // ISO
  read: boolean
  starred: boolean
  hasAttachment: boolean
  attachments?: { id: string; name: string; size: string; type: string }[]
  labelColor?: string
}

export const folders: MailFolder[] = [
  { id: "inbox", name: "Odebrane", icon: "inbox" },
  { id: "starred", name: "Oznaczone gwiazdką", icon: "star" },
  { id: "sent", name: "Wysłane", icon: "send" },
  { id: "drafts", name: "Kopie robocze", icon: "file" },
  { id: "archive", name: "Archiwum", icon: "archive" },
  { id: "spam", name: "Spam", icon: "shield-alert" },
  { id: "trash", name: "Kosz", icon: "trash" },
]

export const messages: Message[] = [
  {
    id: "m1",
    folder: "inbox",
    fromName: "Anna Kowalska",
    fromEmail: "anna.kowalska@northwind.pl",
    to: ["ty@firma.pl"],
    cc: ["zespol@firma.pl"],
    subject: "Podsumowanie spotkania i kolejne kroki",
    preview:
      "Cześć, dziękuję za dzisiejsze spotkanie. Załączam notatki oraz listę zadań na najbliższy tydzień...",
    body: [
      "Cześć,",
      "Dziękuję za dzisiejsze spotkanie — było naprawdę produktywne. Zgodnie z ustaleniami przesyłam krótkie podsumowanie oraz listę zadań na najbliższy tydzień.",
      "Najważniejsze ustalenia: uruchamiamy wersję demonstracyjną w piątek, a finalne uwagi zbieramy do środy. Prosiłabym o potwierdzenie, czy terminy są dla Was realne.",
      "W razie pytań jestem do dyspozycji.",
      "Pozdrawiam serdecznie,\nAnna",
    ],
    date: "2026-07-16T09:24:00Z",
    read: false,
    starred: true,
    hasAttachment: true,
    attachments: [
      { id: "a1", name: "notatki-spotkanie.pdf", size: "248 KB", type: "pdf" },
      { id: "a2", name: "harmonogram.xlsx", size: "62 KB", type: "xlsx" },
    ],
    labelColor: "var(--chart-1)",
  },
  {
    id: "m2",
    folder: "inbox",
    fromName: "GitHub",
    fromEmail: "noreply@github.com",
    to: ["ty@firma.pl"],
    subject: "[mailinlay/sdk] Nowy pull request: dodano obsługę folderów IMAP",
    preview:
      "Marcin otworzył pull request #142. Zmiany obejmują rozpoznawanie folderów specjalnych oraz testy...",
    body: [
      "Marcin otworzył nowy pull request w repozytorium mailinlay/sdk.",
      "PR #142 — feat: automatyczne rozpoznawanie folderów specjalnych (Sent, Trash, Spam) na podstawie odpowiedzi serwera IMAP.",
      "Do przeglądu dołączono 12 zmienionych plików oraz zestaw testów jednostkowych.",
    ],
    date: "2026-07-16T08:02:00Z",
    read: false,
    starred: false,
    hasAttachment: false,
    labelColor: "var(--chart-3)",
  },
  {
    id: "m3",
    folder: "inbox",
    fromName: "Tomasz Zieliński",
    fromEmail: "t.zielinski@acme.io",
    to: ["ty@firma.pl"],
    subject: "Faktura VAT 07/2026 do akceptacji",
    preview:
      "Dzień dobry, w załączeniu przesyłam fakturę za lipiec. Proszę o weryfikację i akceptację płatności...",
    body: [
      "Dzień dobry,",
      "W załączeniu przesyłam fakturę VAT za lipiec 2026. Termin płatności upływa 30 lipca.",
      "Proszę o weryfikację danych i potwierdzenie akceptacji.",
      "Z poważaniem,\nTomasz Zieliński",
    ],
    date: "2026-07-15T16:40:00Z",
    read: true,
    starred: false,
    hasAttachment: true,
    attachments: [{ id: "a3", name: "faktura-07-2026.pdf", size: "184 KB", type: "pdf" }],
    labelColor: "var(--chart-5)",
  },
  {
    id: "m4",
    folder: "inbox",
    fromName: "Vercel",
    fromEmail: "notifications@vercel.com",
    to: ["ty@firma.pl"],
    subject: "Twoje wdrożenie zakończyło się sukcesem",
    preview:
      "Projekt panel-admin został pomyślnie wdrożony na produkcję. Zobacz szczegóły wdrożenia i logi...",
    body: [
      "Twoje wdrożenie zakończyło się sukcesem.",
      "Projekt: panel-admin\nŚrodowisko: Production\nCzas budowania: 42s",
      "Możesz teraz sprawdzić logi oraz metryki wydajności w panelu Vercel.",
    ],
    date: "2026-07-15T11:12:00Z",
    read: true,
    starred: false,
    hasAttachment: false,
    labelColor: "var(--chart-2)",
  },
  {
    id: "m5",
    folder: "inbox",
    fromName: "Katarzyna Nowak",
    fromEmail: "k.nowak@studio-visualis.pl",
    to: ["ty@firma.pl"],
    subject: "Propozycja nowej identyfikacji wizualnej",
    preview:
      "Hej! Przygotowaliśmy trzy kierunki graficzne dla nowego logo. Chętnie omówimy je na krótkim callu...",
    body: [
      "Hej!",
      "Przygotowaliśmy trzy kierunki graficzne dla nowego logo oraz podstawową paletę kolorów.",
      "Chętnie omówimy je na krótkim callu — proponuję czwartek o 10:00. Pasuje?",
      "Pozdrawiam,\nKasia",
    ],
    date: "2026-07-14T14:05:00Z",
    read: false,
    starred: true,
    hasAttachment: false,
    labelColor: "var(--chart-4)",
  },
  {
    id: "m6",
    folder: "inbox",
    fromName: "Newsletter Frontend",
    fromEmail: "hello@frontendweekly.dev",
    to: ["ty@firma.pl"],
    subject: "Frontend Weekly #318 — React 19, Next.js 16 i więcej",
    preview:
      "W tym wydaniu: nowości w React 19.2, stabilny Turbopack w Next.js 16, wzorce cache components...",
    body: [
      "Witaj w kolejnym wydaniu Frontend Weekly!",
      "W tym tygodniu skupiamy się na React 19.2, stabilnym Turbopacku w Next.js 16 oraz nowych wzorcach Cache Components.",
      "Miłej lektury!",
    ],
    date: "2026-07-14T07:30:00Z",
    read: true,
    starred: false,
    hasAttachment: false,
    labelColor: "var(--chart-2)",
  },
  {
    id: "m7",
    folder: "inbox",
    fromName: "Michał Wiśniewski",
    fromEmail: "m.wisniewski@firma.pl",
    to: ["ty@firma.pl"],
    subject: "Re: Dostęp do środowiska testowego",
    preview:
      "Dzięki, właśnie nadałem Ci uprawnienia. Daj znać, gdyby coś nie działało po zalogowaniu...",
    body: [
      "Cześć,",
      "Dzięki za info — właśnie nadałem Ci uprawnienia do środowiska testowego.",
      "Daj znać, gdyby coś nie działało po zalogowaniu.",
      "M.",
    ],
    date: "2026-07-13T18:22:00Z",
    read: true,
    starred: false,
    hasAttachment: false,
    labelColor: "var(--chart-1)",
  },
  {
    id: "m8",
    folder: "sent",
    fromName: "Sebastian Pawelczyk",
    fromEmail: "ty@firma.pl",
    to: ["anna.kowalska@northwind.pl"],
    subject: "Re: Termin prezentacji wersji demonstracyjnej",
    preview:
      "Cześć Anno, potwierdzam piątkowy termin. Do środy prześlemy komplet uwag do wersji demonstracyjnej...",
    body: [
      "Cześć Anno,",
      "Potwierdzam piątkowy termin. Do środy prześlemy komplet uwag do wersji demonstracyjnej.",
      "Pozdrawiam,\nSebastian",
    ],
    date: "2026-07-15T13:18:00Z",
    read: true,
    starred: false,
    hasAttachment: false,
    labelColor: "var(--chart-1)",
  },
  {
    id: "m9",
    folder: "drafts",
    fromName: "Sebastian Pawelczyk",
    fromEmail: "ty@firma.pl",
    to: ["zespol@firma.pl"],
    subject: "Plan wdrożenia Mail Inlay",
    preview:
      "Hej, poniżej przesyłam proponowaną kolejność wdrożenia integracji pocztowej w panelu administracyjnym...",
    body: [
      "Hej,",
      "Poniżej przesyłam proponowaną kolejność wdrożenia integracji pocztowej w panelu administracyjnym.",
    ],
    date: "2026-07-16T07:48:00Z",
    read: true,
    starred: false,
    hasAttachment: false,
    labelColor: "var(--chart-4)",
  },
  {
    id: "m10",
    folder: "archive",
    fromName: "Zespół Rozliczeń",
    fromEmail: "billing@firma.pl",
    to: ["ty@firma.pl"],
    subject: "Rozliczenie usług za czerwiec 2026",
    preview: "Rozliczenie zostało zaakceptowane i przekazane do realizacji...",
    body: [
      "Dzień dobry,",
      "Rozliczenie usług za czerwiec zostało zaakceptowane i przekazane do realizacji.",
      "Pozdrawiamy,\nZespół Rozliczeń",
    ],
    date: "2026-07-10T10:12:00Z",
    read: true,
    starred: false,
    hasAttachment: true,
    attachments: [{ id: "a4", name: "rozliczenie-czerwiec.pdf", size: "112 KB", type: "pdf" }],
    labelColor: "var(--chart-3)",
  },
]
