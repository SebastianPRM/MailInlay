"use client"

import { useMemo, useState } from "react"
import { Check, Menu, PenSquare, RefreshCw, Wifi, X } from "lucide-react"
import { FolderSidebar } from "./folder-sidebar"
import { MessageList } from "./message-list"
import { MessageReader, type ReplyMode } from "./message-reader"
import { ComposeDialog, type ComposeDraft } from "./compose-dialog"
import { folders, messages as seedMessages, type FolderId, type Message } from "@/lib/mail-data"
import { cn } from "@/lib/utils"

export function MailPanel() {
  const [allMessages, setAllMessages] = useState<Message[]>(seedMessages)
  const [activeFolder, setActiveFolder] = useState<FolderId>("inbox")
  const [selectedId, setSelectedId] = useState<string | null>(seedMessages[0]?.id ?? null)
  const [query, setQuery] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeDraft, setComposeDraft] = useState<ComposeDraft>({})
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [mobileReaderOpen, setMobileReaderOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const activeFolderName = folders.find((folder) => folder.id === activeFolder)?.name ?? "Odebrane"

  const folderItems = useMemo(
    () =>
      folders.map((folder) => {
        const count =
          folder.id === "starred"
            ? allMessages.filter((message) => message.starred).length
            : folder.id === "inbox"
              ? allMessages.filter((message) => message.folder === "inbox" && !message.read).length
              : allMessages.filter((message) => message.folder === folder.id).length

        return { ...folder, count: count || undefined }
      }),
    [allMessages],
  )

  const visibleMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return allMessages
      .filter((message) => (activeFolder === "starred" ? message.starred : message.folder === activeFolder))
      .filter((message) => !unreadOnly || !message.read)
      .filter((message) => {
        if (!normalizedQuery) return true
        return (
          message.fromName.toLowerCase().includes(normalizedQuery) ||
          message.fromEmail.toLowerCase().includes(normalizedQuery) ||
          message.subject.toLowerCase().includes(normalizedQuery) ||
          message.preview.toLowerCase().includes(normalizedQuery) ||
          message.to.join(" ").toLowerCase().includes(normalizedQuery)
        )
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }, [activeFolder, allMessages, query, unreadOnly])

  const selectedMessage = allMessages.find((message) => message.id === selectedId) ?? null

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  const handleSelectFolder = (id: FolderId) => {
    const firstMessage = allMessages
      .filter((message) => (id === "starred" ? message.starred : message.folder === id))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0]

    setActiveFolder(id)
    setFoldersOpen(false)
    setSelectedId(firstMessage?.id ?? null)
    setMobileReaderOpen(false)
    setQuery("")
    setUnreadOnly(false)
  }

  const handleSelectMessage = (id: string) => {
    setSelectedId(id)
    setMobileReaderOpen(true)
    setAllMessages((messages) =>
      messages.map((message) => (message.id === id ? { ...message, read: true } : message)),
    )
  }

  const handleToggleStar = (id: string) => {
    setAllMessages((messages) =>
      messages.map((message) => (message.id === id ? { ...message, starred: !message.starred } : message)),
    )
  }

  const moveMessage = (id: string, folder: FolderId, confirmation: string) => {
    setAllMessages((messages) =>
      messages.map((message) => (message.id === id ? { ...message, folder } : message)),
    )
    setSelectedId(null)
    setMobileReaderOpen(false)
    showToast(confirmation)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    window.setTimeout(() => {
      setRefreshing(false)
      showToast("Skrzynka jest aktualna")
    }, 850)
  }

  const openBlankCompose = () => {
    setComposeDraft({})
    setComposeOpen(true)
    setFoldersOpen(false)
  }

  const handleReply = (mode: ReplyMode, message: Message) => {
    const prefix = message.subject.toLowerCase().startsWith("re:") ? "" : "Re: "
    const recipients =
      mode === "forward"
        ? ""
        : mode === "reply-all"
          ? [message.fromEmail, ...(message.cc ?? [])].join(", ")
          : message.fromEmail

    setComposeDraft({
      to: recipients,
      subject: `${prefix}${message.subject}`,
      intro: mode === "forward" ? "\n\n---------- Przekazana wiadomość ----------\n" : "",
    })
    setComposeOpen(true)
  }

  return (
    <section
      className={cn("mail-inlay", mobileReaderOpen && "is-reader-open")}
      aria-label="Mail Inlay — skrzynka pocztowa"
    >
      <header className="mail-inlay__topbar">
        <div className="mail-inlay__identity">
          <button
            type="button"
            onClick={() => setFoldersOpen(true)}
            aria-label="Otwórz foldery"
            className="mail-folder-trigger"
          >
            <Menu aria-hidden="true" />
          </button>
          <span className="mail-inlay__mark">MI</span>
          <div>
            <strong>Mail Inlay</strong>
            <span>ty@firma.pl</span>
          </div>
        </div>

        <div className="mail-inlay__status">
          <span className="mail-sync-state">
            <Wifi aria-hidden="true" />
            <span>IMAP połączony</span>
          </span>
          <button
            type="button"
            className="mail-check-button"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn(refreshing && "animate-spin")} aria-hidden="true" />
            <span>{refreshing ? "Sprawdzanie…" : "Sprawdź pocztę"}</span>
          </button>
          <button type="button" className="mail-quick-compose" onClick={openBlankCompose}>
            <PenSquare aria-hidden="true" />
            <span>Napisz</span>
          </button>
        </div>
      </header>

      <div className="mail-inlay__body">
        <div className="mail-folders-pane">
          <FolderSidebar
            folders={folderItems}
            activeFolder={activeFolder}
            onSelectFolder={handleSelectFolder}
            onCompose={openBlankCompose}
            usedStorage={42}
          />
        </div>

        <div className="mail-list-pane">
          <MessageList
            title={activeFolderName}
            messages={visibleMessages}
            selectedId={selectedId}
            query={query}
            unreadOnly={unreadOnly}
            onQueryChange={setQuery}
            onUnreadOnlyChange={setUnreadOnly}
            onSelect={handleSelectMessage}
            onToggleStar={handleToggleStar}
          />
        </div>

        <div className="mail-reader-pane">
          <MessageReader
            message={selectedMessage}
            onToggleStar={handleToggleStar}
            onDelete={(id) => moveMessage(id, "trash", "Wiadomość przeniesiono do kosza")}
            onArchive={(id) => moveMessage(id, "archive", "Wiadomość zarchiwizowano")}
            onMarkUnread={(id) => {
              setAllMessages((messages) =>
                messages.map((message) => (message.id === id ? { ...message, read: false } : message)),
              )
              showToast("Wiadomość oznaczono jako nieprzeczytaną")
            }}
            onReply={handleReply}
            onBack={() => setMobileReaderOpen(false)}
            onNotify={showToast}
          />
        </div>
      </div>

      {foldersOpen && (
        <div className="mail-drawer" role="dialog" aria-modal="true" aria-label="Foldery poczty">
          <button
            type="button"
            className="mail-drawer__scrim"
            onClick={() => setFoldersOpen(false)}
            aria-label="Zamknij foldery"
          />
          <div className="mail-drawer__panel">
            <button
              type="button"
              onClick={() => setFoldersOpen(false)}
              aria-label="Zamknij foldery"
              className="mail-drawer__close"
            >
              <X aria-hidden="true" />
            </button>
            <FolderSidebar
              folders={folderItems}
              activeFolder={activeFolder}
              onSelectFolder={handleSelectFolder}
              onCompose={openBlankCompose}
              usedStorage={42}
              drawer
            />
          </div>
        </div>
      )}

      <ComposeDialog
        open={composeOpen}
        draft={composeDraft}
        onClose={() => setComposeOpen(false)}
        onSent={() => {
          setComposeOpen(false)
          showToast("Wiadomość została wysłana")
        }}
      />

      {toast && (
        <div className="mail-toast" role="status">
          <Check aria-hidden="true" />
          {toast}
        </div>
      )}
    </section>
  )
}
