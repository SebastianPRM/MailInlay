import type {
  ErrorResponse,
  FoldersResponse,
  MessageDetail,
  MessagesResponse,
  SendResponse,
} from "../shared/types"

export class MailInlayApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message)
  }
}

function url(base: string, path: string, mailboxId: string, params?: Record<string, string | number | undefined>) {
  if (!base.startsWith("/")) throw new Error("MailInlay apiBase musi być ścieżką same-origin.")
  const value = new URL(`${base.replace(/\/$/, "")}/${path}`, window.location.origin)
  value.searchParams.set("mailboxId", mailboxId)
  for (const [key, item] of Object.entries(params ?? {})) {
    if (item !== undefined && item !== "") value.searchParams.set(key, String(item))
  }
  return value.toString()
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { credentials: "same-origin", cache: "no-store", ...init })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as ErrorResponse | null
    throw new MailInlayApiError(body?.error.code ?? "REQUEST_FAILED", body?.error.message ?? "Operacja nie powiodła się.", response.status)
  }
  return response.json() as Promise<T>
}

export function createApi(apiBase: string, mailboxId: string) {
  return {
    folders(signal?: AbortSignal) {
      return request<FoldersResponse>(url(apiBase, "folders", mailboxId), { signal })
    },
    messages(input: { folder: string; page: number; limit?: number; query?: string }, signal?: AbortSignal) {
      return request<MessagesResponse>(url(apiBase, "messages", mailboxId, input), { signal })
    },
    message(messageKey: string, signal?: AbortSignal) {
      return request<MessageDetail>(url(apiBase, `messages/${encodeURIComponent(messageKey)}`, mailboxId), { signal })
    },
    update(messageKey: string, body: { seen?: boolean; flagged?: boolean }) {
      return request<{ ok: true }>(url(apiBase, `messages/${encodeURIComponent(messageKey)}`, mailboxId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    },
    move(messageKey: string, destinationFolder: string) {
      return request<{ ok: true }>(url(apiBase, `messages/${encodeURIComponent(messageKey)}/move`, mailboxId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationFolder }),
      })
    },
    delete(messageKey: string) {
      return request<{ ok: true }>(url(apiBase, `messages/${encodeURIComponent(messageKey)}`, mailboxId), { method: "DELETE" })
    },
    send(form: FormData) {
      return request<SendResponse>(url(apiBase, "send", mailboxId), { method: "POST", body: form })
    },
    async download(messageKey: string, attachmentId: string, filename: string) {
      const response = await fetch(url(apiBase, `messages/${encodeURIComponent(messageKey)}/attachments/${encodeURIComponent(attachmentId)}`, mailboxId), {
        credentials: "same-origin",
        cache: "no-store",
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as ErrorResponse | null
        throw new MailInlayApiError(body?.error.code ?? "DOWNLOAD_FAILED", body?.error.message ?? "Nie udało się pobrać załącznika.", response.status)
      }
      const objectUrl = URL.createObjectURL(await response.blob())
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = filename
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    },
  }
}
