export class MailInlayError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "MailInlayError"
  }
}

export const errors = {
  invalidRequest: () => new MailInlayError("INVALID_REQUEST", 400, "Niepoprawne dane żądania."),
  unauthorized: () => new MailInlayError("UNAUTHORIZED", 401, "Wymagane jest zalogowanie do panelu."),
  forbiddenOrigin: () => new MailInlayError("FORBIDDEN_ORIGIN", 403, "Żądanie pochodzi z niedozwolonej strony."),
  mailboxNotFound: () => new MailInlayError("MAILBOX_NOT_FOUND", 404, "Skrzynka nie jest dostępna."),
  folderNotFound: () => new MailInlayError("FOLDER_NOT_FOUND", 404, "Folder nie istnieje."),
  messageNotFound: () => new MailInlayError("MESSAGE_NOT_FOUND", 404, "Wiadomość nie istnieje lub została przeniesiona."),
  tooLarge: (message = "Dane przekraczają limit tej instalacji.") => new MailInlayError("TOO_LARGE", 413, message),
  limitExceeded: (message: string) => new MailInlayError("LIMIT_EXCEEDED", 422, message),
  tooManyRequests: () => new MailInlayError("TOO_MANY_REQUESTS", 429, "Wysłano zbyt wiele wiadomości w krótkim czasie. Spróbuj ponownie za chwilę."),
  trashNotFound: () => new MailInlayError("TRASH_FOLDER_NOT_FOUND", 422, "Nie udało się bezpiecznie rozpoznać folderu Kosz."),
  permanentDeleteDenied: () => new MailInlayError("PERMANENT_DELETE_DENIED", 422, "Trwałe usuwanie jest dozwolone wyłącznie w Koszu."),
  mailServer: () => new MailInlayError("MAIL_SERVER_ERROR", 502, "Serwer pocztowy nie wykonał operacji."),
  timeout: () => new MailInlayError("MAIL_SERVER_TIMEOUT", 504, "Serwer pocztowy nie odpowiedział na czas."),
} as const
