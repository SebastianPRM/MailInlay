"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Check, Menu, PenSquare, RefreshCw, Settings, Wifi, X } from "lucide-react"
import type { MailFolder, MailboxPublicInfo, MessageDetail, MessageSummary, SendResponse } from "../shared/types"
import { createApi, MailInlayApiError } from "./api"
import { FolderList } from "./FolderList"
import { MailComposer, type ComposeDraft } from "./MailComposer"
import { MessageList } from "./MessageList"
import { MessageReader, type ReplyMode } from "./MessageReader"
import { cn, displayAddress, escapeHtml, resolveInlineImages } from "./utils"

export type MailPanelProps = {
  apiBase: string
  mailboxId: string
  className?: string
  defaultFoldersCollapsed?: boolean
  foldersCollapsed?: boolean
  onFoldersCollapsedChange?: (collapsed: boolean) => void
  onOpenSettings?: () => void
  showSettings?: boolean
}

type Toast = { kind: "success" | "error"; text: string }

async function runInPool<T>(items: T[], task: (item: T) => Promise<unknown>, concurrency = 3) {
  const successful: T[] = []
  const failed: T[] = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++]
      try {
        await task(item)
        successful.push(item)
      } catch {
        failed.push(item)
      }
    }
  })
  await Promise.all(workers)
  return { successful, failed }
}

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

export function MailPanel({
  apiBase,
  mailboxId,
  className,
  defaultFoldersCollapsed = false,
  foldersCollapsed: controlledFoldersCollapsed,
  onFoldersCollapsedChange,
  onOpenSettings,
  showSettings,
}: MailPanelProps) {
  const api = useMemo(() => createApi(apiBase, mailboxId), [apiBase, mailboxId])
  const [mailbox, setMailbox] = useState<MailboxPublicInfo | null>(null)
  const [folders, setFolders] = useState<MailFolder[]>([])
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(() => new Set())
  const [bulkDestination, setBulkDestination] = useState("")
  const [bulkBusy, setBulkBusy] = useState(false)
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
  const [uncontrolledFoldersCollapsed, setUncontrolledFoldersCollapsed] = useState(defaultFoldersCollapsed)
  const [mobileReaderOpen, setMobileReaderOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeDraft, setComposeDraft] = useState<ComposeDraft>({ mode: "new" })
  const [sessionExpired, setSessionExpired] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const foldersCollapsed = controlledFoldersCollapsed ?? uncontrolledFoldersCollapsed

  const setFoldersCollapsed = useCallback((collapsed: boolean) => {
    if (controlledFoldersCollapsed === undefined) setUncontrolledFoldersCollapsed(collapsed)
    onFoldersCollapsedChange?.(collapsed)
  }, [controlledFoldersCollapsed, onFoldersCollapsedChange])

  const showToast = useCallback((text: string, kind: Toast["kind"] = "success") => {
    window.clearTimeout(toastTimer.current)
    setToast({ text, kind })
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const reportError = useCallback((error: unknown, fallback: string, quiet = false) => {
    if ((error as { name?: string } | null)?.name === "AbortError") return
    if (error instanceof MailInlayApiError && error.status === 401) {
      setSessionExpired(true)
      return
    }
    if (!quiet) showToast(error instanceof Error ? error.message : fallback, "error")
  }, [showToast])

  const adjustUnread = useCallback((folderPath: string | null, delta: number) => {
    if (!folderPath) return
    setFolders((items) => items.map((folder) => folder.path === folderPath && folder.unread !== undefined
      ? { ...folder, unread: Math.max(0, folder.unread + delta) }
      : folder))
  }, [])

  const loadFolders = useCallback(async (signal?: AbortSignal) => {
    const response = await api.folders(signal)
    setSessionExpired(false)
    setMailbox(response.mailbox)
    setFolders(response.folders)
    setActiveFolder((current) => current ?? response.folders.find((folder) => folder.specialUse === "inbox")?.path ?? response.folders[0]?.path ?? null)
    return response.folders
  }, [api])

  useEffect(() => {
    const controller = new AbortController()
    setLoadingFolders(true)
    loadFolders(controller.signal)
      .catch((error) => reportError(error, "Nie udało się połączyć ze skrzynką."))
      .finally(() => setLoadingFolders(false))
    return () => controller.abort()
  }, [loadFolders, reportError])

  useEffect(() => {
    if (!activeFolder) return
    const controller = new AbortController()
    setLoadingMessages(true)
    setPage(1)
    setDetail(null)
    setCheckedKeys(new Set())
    setBulkDestination("")
    api.messages({ folder: activeFolder, page: 1, query, unseen: unreadOnly }, controller.signal)
      .then((response) => {
        setMessages(response.items)
        setHasMore(response.hasMore)
        setSelectedKey((current) => response.items.some((message) => message.messageKey === current) ? current : null)
      })
      .catch((error) => reportError(error, "Nie udało się pobrać wiadomości."))
      .finally(() => setLoadingMessages(false))
    return () => controller.abort()
  }, [activeFolder, api, query, unreadOnly, reportError])

  useEffect(() => {
    if (!selectedKey) {
      setDetail(null)
      return
    }
    const controller = new AbortController()
    setLoadingDetail(true)
    api.message(selectedKey, controller.signal)
      .then(async (message) => {
        const html = message.html && message.attachments.some((attachment) => attachment.contentId)
          ? resolveInlineImages(message.html, message.attachments, (attachmentId) => api.attachmentUrl(selectedKey, attachmentId))
          : message.html
        setDetail({ ...message, html })
        if (!message.seen) {
          setMessages((items) => items.map((item) => item.messageKey === selectedKey ? { ...item, seen: true } : item))
          setDetail((current) => current ? { ...current, seen: true } : current)
          adjustUnread(activeFolder, -1)
          api.update(selectedKey, { seen: true }).catch(() => undefined)
        }
      })
      .catch((error) => reportError(error, "Nie udało się otworzyć wiadomości."))
      .finally(() => setLoadingDetail(false))
    return () => controller.abort()
    // activeFolder is intentionally omitted: selection is always reset when the folder changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, selectedKey, adjustUnread, reportError])

  const refresh = useCallback(async (quiet = false) => {
    if (!activeFolder || refreshing || sessionExpired) return
    setRefreshing(true)
    try {
      await loadFolders()
      const response = await api.messages({ folder: activeFolder, page: 1, query, unseen: unreadOnly })
      setMessages(response.items)
      setCheckedKeys((current) => new Set([...current].filter((key) => response.items.some((message) => message.messageKey === key))))
      setPage(1)
      setHasMore(response.hasMore)
      if (selectedKey && !response.items.some((message) => message.messageKey === selectedKey)) {
        setSelectedKey(null)
      }
      if (!quiet) showToast("Skrzynka jest aktualna")
    } catch (error) {
      reportError(error, "Odświeżenie nie powiodło się.", quiet)
    } finally {
      setRefreshing(false)
    }
  }, [activeFolder, api, loadFolders, query, refreshing, selectedKey, sessionExpired, showToast, unreadOnly, reportError])

  const refreshRef = useRef(refresh)
  useEffect(() => { refreshRef.current = refresh }, [refresh])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshRef.current(true)
    }, 45_000)
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshRef.current(true)
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  const selectFolder = (path: string) => {
    setActiveFolder(path)
    setFoldersOpen(false)
    setSelectedKey(null)
    setMobileReaderOpen(false)
    setSearchValue("")
    setQuery("")
    setUnreadOnly(false)
    setCheckedKeys(new Set())
    setBulkDestination("")
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
      reportError(error, "Nie udało się zmienić gwiazdki.")
    }
  }

  const removeCurrent = () => {
    setMessages((items) => items.filter((item) => item.messageKey !== selectedKey))
    setSelectedKey(null)
    setMobileReaderOpen(false)
    void loadFolders().catch(() => undefined)
  }

  const toggleChecked = (messageKey: string, checked: boolean) => {
    setCheckedKeys((current) => {
      const next = new Set(current)
      if (checked) next.add(messageKey)
      else next.delete(messageKey)
      return next
    })
  }

  const toggleAllChecked = (checked: boolean) => {
    setCheckedKeys((current) => {
      const next = new Set(current)
      for (const message of messages) {
        if (checked) next.add(message.messageKey)
        else next.delete(message.messageKey)
      }
      return next
    })
  }

  const runBulkAction = async (
    action: (messageKey: string) => Promise<unknown>,
    successMessage: (count: number) => string,
  ) => {
    if (bulkBusy || checkedKeys.size === 0) return
    const keys = [...checkedKeys]
    setBulkBusy(true)
    try {
      const result = await runInPool(keys, action)
      const successful = new Set(result.successful)
      if (successful.size) {
        setMessages((items) => items.filter((item) => !successful.has(item.messageKey)))
        setCheckedKeys(new Set(result.failed))
        if (selectedKey && successful.has(selectedKey)) {
          setSelectedKey(null)
          setMobileReaderOpen(false)
        }
        void loadFolders().catch(() => undefined)
      }
      if (result.failed.length) {
        showToast(
          result.successful.length
            ? `Wykonano operację dla ${result.successful.length} z ${keys.length} wiadomości. Spróbuj ponownie dla pozostałych.`
            : "Nie udało się wykonać operacji dla zaznaczonych wiadomości.",
          "error",
        )
      } else {
        setBulkDestination("")
        showToast(successMessage(result.successful.length))
      }
    } finally {
      setBulkBusy(false)
    }
  }

  const bulkMove = async () => {
    const destination = folders.find((folder) => folder.path === bulkDestination)
    if (!destination || destination.path === activeFolder) {
      showToast("Wybierz inny folder docelowy.", "error")
      return
    }
    await runBulkAction(
      (messageKey) => api.move(messageKey, destination.path),
      (count) => `Przeniesiono ${count} ${count === 1 ? "wiadomość" : "wiadomości"} do folderu „${destination.name}”`,
    )
  }

  const bulkDelete = async () => {
    const current = folders.find((folder) => folder.path === activeFolder)
    if (current?.specialUse === "trash") {
      const selectedLabel = checkedKeys.size === 1
        ? "1 zaznaczoną wiadomość"
        : `${checkedKeys.size} zaznaczone wiadomości`
      if (!window.confirm(`Usunąć trwale ${selectedLabel}? Tej operacji nie można cofnąć.`)) return
      await runBulkAction(
        (messageKey) => api.delete(messageKey),
        (count) => `Trwale usunięto ${count} ${count === 1 ? "wiadomość" : "wiadomości"}`,
      )
      return
    }
    const trash = folders.find((folder) => folder.specialUse === "trash")
    if (!trash) {
      showToast("Folder kosza nie jest dostępny na serwerze.", "error")
      return
    }
    await runBulkAction(
      (messageKey) => api.move(messageKey, trash.path),
      (count) => `Przeniesiono do kosza ${count} ${count === 1 ? "wiadomość" : "wiadomości"}`,
    )
  }

  const move = async (message: MessageDetail, destination: MailFolder | undefined, confirmation: string) => {
    if (!destination) return showToast("Ten folder nie jest dostępny na serwerze.", "error")
    try {
      await api.move(message.messageKey, destination.path)
      removeCurrent()
      showToast(confirmation)
    } catch (error) {
      reportError(error, "Nie udało się przenieść wiadomości.")
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
        reportError(error, "Nie udało się usunąć wiadomości.")
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
      adjustUnread(activeFolder, 1)
      showToast("Wiadomość oznaczono jako nieprzeczytaną")
    } catch (error) {
      reportError(error, "Nie udało się zmienić statusu.")
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
    const savedOrSkipped = result.savedToSent === true || result.savedToSent === "skipped"
    showToast(savedOrSkipped ? "Wiadomość została wysłana" : "Wysłano, ale serwer nie zapisał kopii w Wysłanych", savedOrSkipped ? "success" : "error")
    void loadFolders().catch(() => undefined)
    return result
  }

  const activeFolderItem = folders.find((folder) => folder.path === activeFolder)
  const archiveFolder = folders.find((folder) => folder.specialUse === "archive")
  const initialLoading = loadingFolders && !mailbox

  return (
    <section className={cn("mail-inlay", foldersCollapsed && "is-folders-collapsed", mobileReaderOpen && "is-reader-open", className)} aria-label="MailInlay — skrzynka pocztowa">
      <header className="mail-inlay__topbar">
        <div className="mail-inlay__identity">
          <button type="button" onClick={() => setFoldersOpen(true)} aria-label="Otwórz foldery" className="mail-folder-trigger"><Menu aria-hidden="true" /></button>
          <span className="mail-inlay__mark">MI</span>
          <div><strong>MailInlay</strong><span>{mailbox?.email ?? (initialLoading ? "Łączenie…" : "Skrzynka projektu")}</span></div>
        </div>
        <div className="mail-inlay__status">
          {onOpenSettings && showSettings !== false && (
            <button type="button" className="mail-settings-button" onClick={onOpenSettings} aria-label="Otwórz ustawienia poczty" title="Ustawienia poczty">
              <Settings aria-hidden="true" />
              <span>Ustawienia</span>
            </button>
          )}
          <span className={cn("mail-sync-state", !mailbox && "is-offline")}><Wifi aria-hidden="true" /><span>{mailbox ? "IMAP połączony" : "Brak połączenia"}</span></span>
          <button type="button" className="mail-check-button" onClick={() => void refresh()} disabled={refreshing || !activeFolder}><RefreshCw className={cn(refreshing && "animate-spin")} aria-hidden="true" /><span>{refreshing ? "Sprawdzanie…" : "Sprawdź pocztę"}</span></button>
          <button type="button" className="mail-quick-compose" onClick={() => openCompose()} disabled={!mailbox}><PenSquare aria-hidden="true" /><span>Napisz</span></button>
        </div>
      </header>

      <div className="mail-inlay__body">
        <div className="mail-folders-pane"><FolderList folders={folders} mailbox={mailbox} activeFolder={activeFolder} onSelect={selectFolder} onCompose={() => openCompose()} collapsed={foldersCollapsed} onCollapsedChange={setFoldersCollapsed} /></div>
        <div className="mail-list-pane">
          <MessageList
            title={activeFolderItem?.name ?? (initialLoading ? "Łączenie…" : "Poczta")}
            messages={messages}
            selectedKey={selectedKey}
            checkedKeys={checkedKeys}
            folders={folders}
            activeFolder={activeFolder}
            bulkDestination={bulkDestination}
            bulkBusy={bulkBusy}
            searchValue={searchValue}
            unreadOnly={unreadOnly}
            loading={loadingMessages || initialLoading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onSearchValue={setSearchValue}
            onSearch={(value) => setQuery(value === undefined ? searchValue.trim() : value)}
            onUnreadOnly={setUnreadOnly}
            onSelect={selectMessage}
            onToggleChecked={toggleChecked}
            onToggleAll={toggleAllChecked}
            onClearChecked={() => setCheckedKeys(new Set())}
            onBulkDestination={setBulkDestination}
            onBulkMove={() => void bulkMove()}
            onBulkDelete={() => void bulkDelete()}
            onToggleStar={(message) => void toggleStar(message)}
            onLoadMore={async () => {
              if (!activeFolder || loadingMore) return
              setLoadingMore(true)
              try {
                const response = await api.messages({ folder: activeFolder, page: page + 1, query, unseen: unreadOnly })
                setMessages((items) => [...items, ...response.items.filter((next) => !items.some((item) => item.messageKey === next.messageKey))])
                setPage(response.page)
                setHasMore(response.hasMore)
              } catch (error) {
                reportError(error, "Nie udało się pobrać kolejnych wiadomości.")
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
              catch (error) { reportError(error, "Nie udało się pobrać załącznika.") }
            }}
            onBack={() => setMobileReaderOpen(false)}
          />
        </div>
      </div>

      {foldersOpen && <div className="mail-drawer" role="dialog" aria-modal="true" aria-label="Foldery poczty"><button type="button" className="mail-drawer__scrim" onClick={() => setFoldersOpen(false)} aria-label="Zamknij foldery" /><div className="mail-drawer__panel"><button type="button" onClick={() => setFoldersOpen(false)} aria-label="Zamknij foldery" className="mail-drawer__close"><X aria-hidden="true" /></button><FolderList folders={folders} mailbox={mailbox} activeFolder={activeFolder} onSelect={selectFolder} onCompose={() => openCompose()} drawer /></div></div>}

      <MailComposer open={composeOpen} from={mailbox?.email ?? ""} draft={composeDraft} onClose={() => setComposeOpen(false)} onSend={send} />
      {sessionExpired && (
        <div className="mail-session-expired" role="alert">
          <AlertTriangle aria-hidden="true" />
          <span>Sesja panelu wygasła. Zaloguj się ponownie w panelu administracyjnym.</span>
          <button
            type="button"
            onClick={() => {
              setSessionExpired(false)
              setLoadingFolders(true)
              loadFolders()
                .catch((error) => reportError(error, "Nie udało się połączyć ze skrzynką."))
                .finally(() => setLoadingFolders(false))
            }}
          >
            Spróbuj ponownie
          </button>
        </div>
      )}
      {toast && <div className={cn("mail-toast", toast.kind === "error" && "is-error")} role="status">{toast.kind === "error" ? <AlertTriangle aria-hidden="true" /> : <Check aria-hidden="true" />}{toast.text}</div>}
    </section>
  )
}
