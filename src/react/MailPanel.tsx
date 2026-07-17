"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Check, Menu, PenSquare, RefreshCw, Wifi, X } from "lucide-react"
import type { MailFolder, MailboxPublicInfo, MessageDetail, MessageSummary, SendResponse } from "../shared/types"
import { createApi } from "./api"
import { FolderList } from "./FolderList"
import { MailComposer, type ComposeDraft } from "./MailComposer"
import { MessageList } from "./MessageList"
import { MessageReader, type ReplyMode } from "./MessageReader"
import { cn, displayAddress, escapeHtml } from "./utils"

export type MailPanelProps = {
  apiBase: string
  mailboxId: string
  className?: string
}

type Toast = { kind: "success" | "error"; text: string }

function uniqueAddresses(values: Array<string | undefined>, excluded: string[] = []) {
  const blocked = new Set(excluded.map((value) => value.toLowerCase()))
  const result: string[] = []
  for (const value of values) {
    const address = value?.trim()
    if (!address || blocked.has(address.toLowerCase()) || result.some((item) => item.toLowerCase() === address.toLowerCase())) continue
    result.push(address)
  }
  return result
}

function prefixSubject(subject: string, prefix: "Re" | "Fwd") {
  return new RegExp(`^${prefix}:`, "i").test(subject) ? subject : `${prefix}: ${subject}`
}

export function MailPanel({ apiBase, mailboxId, className }: MailPanelProps) {
  const api = useMemo(() => createApi(apiBase, mailboxId), [apiBase, mailboxId])
  const [mailbox, setMailbox] = useState<MailboxPublicInfo | null>(null)
  const [folders, setFolders] = useState<MailFolder[]>([])
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [detail, setDetail] = useState<MessageDetail | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [query, setQuery] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [mobileReaderOpen, setMobileReaderOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeDraft, setComposeDraft] = useState<ComposeDraft>({ mode: "new" })
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = useCallback((text: string, kind: Toast["kind"] = "success") => {
    window.clearTimeout(toastTimer.current)
    setToast({ text, kind })
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const loadFolders = useCallback(async (signal?: AbortSignal) => {
    const response = await api.folders(signal)
    setMailbox(response.mailbox)
    setFolders(response.folders)
    setActiveFolder((current) => current ?? response.folders.find((folder) => folder.specialUse === "inbox")?.path ?? response.folders[0]?.path ?? null)
    return response.folders
  }, [api])

  useEffect(() => {
    const controller = new AbortController()
    setLoadingFolders(true)
    loadFolders(controller.signal)
      .catch((error) => { if (error?.name !== "AbortError") showToast(error instanceof Error ? error.message : "Nie udało się połączyć ze skrzynką.", "error") })
      .finally(() => setLoadingFolders(false))
    return () => controller.abort()
  }, [loadFolders, showToast])

  useEffect(() => {
    if (!activeFolder) return
    const controller = new AbortController()
    setLoadingMessages(true)
    setPage(1)
    setDetail(null)
    api.messages({ folder: activeFolder, page: 1, query }, controller.signal)
      .then((response) => {
        setMessages(response.items)
        setHasMore(response.hasMore)
        setSelectedKey((current) => response.items.some((message) => message.messageKey === current) ? current : response.items[0]?.messageKey ?? null)
      })
      .catch((error) => { if (error?.name !== "AbortError") showToast(error instanceof Error ? error.message : "Nie udało się pobrać wiadomości.", "error") })
      .finally(() => setLoadingMessages(false))
    return () => controller.abort()
  }, [activeFolder, api, query, showToast])

  useEffect(() => {
    if (!selectedKey) {
      setDetail(null)
      return
    }
    const controller = new AbortController()
    setLoadingDetail(true)
    api.message(selectedKey, controller.signal)
      .then(async (message) => {
        setDetail(message)
        if (!message.seen) {
          setMessages((items) => items.map((item) => item.messageKey === selectedKey ? { ...item, seen: true } : item))
          setDetail((current) => current ? { ...current, seen: true } : current)
          api.update(selectedKey, { seen: true }).catch(() => undefined)
        }
      })
      .catch((error) => { if (error?.name !== "AbortError") showToast(error instanceof Error ? error.message : "Nie udało się otworzyć wiadomości.", "error") })
      .finally(() => setLoadingDetail(false))
    return () => controller.abort()
  }, [api, selectedKey, showToast])

  const refresh = useCallback(async (quiet = false) => {
    if (!activeFolder || refreshing) return
    setRefreshing(true)
    try {
      await loadFolders()
      const response = await api.messages({ folder: activeFolder, page: 1, query })
      setMessages(response.items)
      setPage(1)
      setHasMore(response.hasMore)
      if (selectedKey && !response.items.some((message) => message.messageKey === selectedKey)) {
        setSelectedKey(response.items[0]?.messageKey ?? null)
      }
      if (!quiet) showToast("Skrzynka jest aktualna")
    } catch (error) {
      if (!quiet) showToast(error instanceof Error ? error.message : "Odświeżenie nie powiodło się.", "error")
    } finally {
      setRefreshing(false)
    }
  }, [activeFolder, api, loadFolders, query, refreshing, selectedKey, showToast])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true)
    }, 45_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const selectFolder = (path: string) => {
    setActiveFolder(path)
    setFoldersOpen(false)
    setSelectedKey(null)
    setMobileReaderOpen(false)
    setSearchValue("")
    setQuery("")
    setUnreadOnly(false)
  }

  const selectMessage = (messageKey: string) => {
    setSelectedKey(messageKey)
    setMobileReaderOpen(true)
  }

  const toggleStar = async (message: MessageSummary) => {
    const flagged = !message.flagged
    setMessages((items) => items.map((item) => item.messageKey === message.messageKey ? { ...item, flagged } : item))
    setDetail((current) => current?.messageKey === message.messageKey ? { ...current, flagged } : current)
    try {
      await api.update(message.messageKey, { flagged })
    } catch (error) {
      setMessages((items) => items.map((item) => item.messageKey === message.messageKey ? { ...item, flagged: !flagged } : item))
      setDetail((current) => current?.messageKey === message.messageKey ? { ...current, flagged: !flagged } : current)
      showToast(error instanceof Error ? error.message : "Nie udało się zmienić gwiazdki.", "error")
    }
  }

  const removeCurrent = () => {
    setMessages((items) => {
      const remaining = items.filter((item) => item.messageKey !== selectedKey)
      setSelectedKey(remaining[0]?.messageKey ?? null)
      return remaining
    })
    setMobileReaderOpen(false)
    void loadFolders().catch(() => undefined)
  }

  const move = async (message: MessageDetail, destination: MailFolder | undefined, confirmation: string) => {
    if (!destination) return showToast("Ten folder nie jest dostępny na serwerze.", "error")
    try {
      await api.move(message.messageKey, destination.path)
      removeCurrent()
      showToast(confirmation)
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Nie udało się przenieść wiadomości.", "error")
    }
  }

  const deleteMessage = async (message: MessageDetail) => {
    const current = folders.find((folder) => folder.path === activeFolder)
    if (current?.specialUse === "trash") {
      if (!window.confirm("Usunąć tę wiadomość trwale? Tej operacji nie można cofnąć.")) return
      try {
        await api.delete(message.messageKey)
        removeCurrent()
        showToast("Wiadomość została trwale usunięta")
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Nie udało się usunąć wiadomości.", "error")
      }
      return
    }
    await move(message, folders.find((folder) => folder.specialUse === "trash"), "Wiadomość przeniesiono do kosza")
  }

  const markUnread = async (message: MessageDetail) => {
    try {
      await api.update(message.messageKey, { seen: false })
      setMessages((items) => items.map((item) => item.messageKey === message.messageKey ? { ...item, seen: false } : item))
      setDetail((current) => current ? { ...current, seen: false } : current)
      showToast("Wiadomość oznaczono jako nieprzeczytaną")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Nie udało się zmienić statusu.", "error")
    }
  }

  const openCompose = (draft: ComposeDraft = { mode: "new" }) => {
    setComposeDraft(draft)
    setComposeOpen(true)
    setFoldersOpen(false)
  }

  const reply = (mode: ReplyMode, message: MessageDetail) => {
    const self = mailbox?.email ?? ""
    const sender = message.replyTo[0]?.address || message.from[0]?.address
    const originalTo = message.to.map((address) => address.address)
    const originalCc = message.cc.map((address) => address.address)
    const to = mode === "forward" ? [] : uniqueAddresses([sender, ...(mode === "reply-all" ? originalTo : [])], [self])
    const cc = mode === "reply-all" ? uniqueAddresses(originalCc, [self, ...to]) : []
    const quoteText = `Dnia ${new Date(message.date).toLocaleString("pl-PL")} ${displayAddress(message.from)} napisał(a):\n\n${message.text ?? ""}`
    const quoteHtml = `<p>Dnia ${escapeHtml(new Date(message.date).toLocaleString("pl-PL"))} ${escapeHtml(displayAddress(message.from))} napisał(a):</p><blockquote>${message.html ?? `<p>${escapeHtml(message.text ?? "").replace(/\n/g, "<br>")}</p>`}</blockquote>`
    openCompose({
      mode,
      to: to.join(", "),
      cc: cc.join(", "),
      subject: prefixSubject(message.subject, mode === "forward" ? "Fwd" : "Re"),
      quotedText: quoteText,
      quotedHtml: quoteHtml,
      inReplyTo: mode === "forward" ? undefined : message.messageId,
      references: mode === "forward" ? [] : [...message.references, ...(message.messageId ? [message.messageId] : [])],
    })
  }

  const send = async (form: FormData): Promise<SendResponse> => {
    const result = await api.send(form)
    setComposeOpen(false)
    showToast(result.savedToSent ? "Wiadomość została wysłana" : "Wysłano, ale serwer nie zapisał kopii w Wysłanych", result.savedToSent ? "success" : "error")
    void loadFolders().catch(() => undefined)
    return result
  }

  const activeFolderItem = folders.find((folder) => folder.path === activeFolder)
  const archiveFolder = folders.find((folder) => folder.specialUse === "archive")
  const initialLoading = loadingFolders && !mailbox

  return (
    <section className={cn("mail-inlay", mobileReaderOpen && "is-reader-open", className)} aria-label="MailInlay — skrzynka pocztowa">
      <header className="mail-inlay__topbar">
        <div className="mail-inlay__identity">
          <button type="button" onClick={() => setFoldersOpen(true)} aria-label="Otwórz foldery" className="mail-folder-trigger"><Menu aria-hidden="true" /></button>
          <span className="mail-inlay__mark">MI</span>
          <div><strong>MailInlay</strong><span>{mailbox?.email ?? (initialLoading ? "Łączenie…" : "Skrzynka projektu")}</span></div>
        </div>
        <div className="mail-inlay__status">
          <span className={cn("mail-sync-state", !mailbox && "is-offline")}><Wifi aria-hidden="true" /><span>{mailbox ? "IMAP połączony" : "Brak połączenia"}</span></span>
          <button type="button" className="mail-check-button" onClick={() => void refresh()} disabled={refreshing || !activeFolder}><RefreshCw className={cn(refreshing && "animate-spin")} aria-hidden="true" /><span>{refreshing ? "Sprawdzanie…" : "Sprawdź pocztę"}</span></button>
          <button type="button" className="mail-quick-compose" onClick={() => openCompose()} disabled={!mailbox}><PenSquare aria-hidden="true" /><span>Napisz</span></button>
        </div>
      </header>

      <div className="mail-inlay__body">
        <div className="mail-folders-pane"><FolderList folders={folders} mailbox={mailbox} activeFolder={activeFolder} onSelect={selectFolder} onCompose={() => openCompose()} /></div>
        <div className="mail-list-pane">
          <MessageList
            title={activeFolderItem?.name ?? (initialLoading ? "Łączenie…" : "Poczta")}
            messages={messages}
            selectedKey={selectedKey}
            searchValue={searchValue}
            unreadOnly={unreadOnly}
            loading={loadingMessages || initialLoading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onSearchValue={setSearchValue}
            onSearch={(value) => setQuery(value === undefined ? searchValue.trim() : value)}
            onUnreadOnly={setUnreadOnly}
            onSelect={selectMessage}
            onToggleStar={(message) => void toggleStar(message)}
            onLoadMore={async () => {
              if (!activeFolder || loadingMore) return
              setLoadingMore(true)
              try {
                const response = await api.messages({ folder: activeFolder, page: page + 1, query })
                setMessages((items) => [...items, ...response.items.filter((next) => !items.some((item) => item.messageKey === next.messageKey))])
                setPage(response.page)
                setHasMore(response.hasMore)
              } catch (error) {
                showToast(error instanceof Error ? error.message : "Nie udało się pobrać kolejnych wiadomości.", "error")
              } finally { setLoadingMore(false) }
            }}
          />
        </div>
        <div className="mail-reader-pane">
          <MessageReader
            message={detail}
            loading={loadingDetail}
            folderLabel={activeFolderItem?.name ?? "Poczta"}
            canArchive={Boolean(archiveFolder && archiveFolder.path !== activeFolder)}
            permanentDelete={activeFolderItem?.specialUse === "trash"}
            onToggleStar={(message) => void toggleStar(message)}
            onDelete={(message) => void deleteMessage(message)}
            onArchive={(message) => void move(message, archiveFolder, "Wiadomość zarchiwizowano")}
            onMarkUnread={(message) => void markUnread(message)}
            onReply={reply}
            onDownload={async (message, attachment) => {
              try { await api.download(message.messageKey, attachment.attachmentId, attachment.filename) }
              catch (error) { showToast(error instanceof Error ? error.message : "Nie udało się pobrać załącznika.", "error") }
            }}
            onBack={() => setMobileReaderOpen(false)}
          />
        </div>
      </div>

      {foldersOpen && <div className="mail-drawer" role="dialog" aria-modal="true" aria-label="Foldery poczty"><button type="button" className="mail-drawer__scrim" onClick={() => setFoldersOpen(false)} aria-label="Zamknij foldery" /><div className="mail-drawer__panel"><button type="button" onClick={() => setFoldersOpen(false)} aria-label="Zamknij foldery" className="mail-drawer__close"><X aria-hidden="true" /></button><FolderList folders={folders} mailbox={mailbox} activeFolder={activeFolder} onSelect={selectFolder} onCompose={() => openCompose()} drawer /></div></div>}

      <MailComposer open={composeOpen} from={mailbox?.email ?? ""} draft={composeDraft} onClose={() => setComposeOpen(false)} onSend={send} />
      {toast && <div className={cn("mail-toast", toast.kind === "error" && "is-error")} role="status">{toast.kind === "error" ? <AlertTriangle aria-hidden="true" /> : <Check aria-hidden="true" />}{toast.text}</div>}
    </section>
  )
}
