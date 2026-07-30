"use client"

import { useEffect, useId, useRef, useState } from "react"
import { FolderInput, Inbox, ListFilter, LoaderCircle, Paperclip, Search, SlidersHorizontal, Star, Trash2, X } from "lucide-react"
import type { MailFolder, MessageSummary, SearchIn, SearchScope } from "../shared/types"
import { cn, displayAddress, formatListDate, initials } from "./utils"

function resultCountLabel(count: number) {
  if (count === 1) return "1 wynik"
  const mod10 = count % 10
  const mod100 = count % 100
  return `${count} ${mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "wyniki" : "wyników"}`
}

type Props = {
  title: string
  messages: MessageSummary[]
  selectedKey: string | null
  checkedKeys: ReadonlySet<string>
  folders: MailFolder[]
  activeFolder: string | null
  bulkDestination: string
  bulkBusy: boolean
  searchValue: string
  searchActive: boolean
  searchScope: SearchScope
  searchIn: SearchIn
  unreadOnly: boolean
  total: number
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  onSearchValue: (value: string) => void
  onSearch: (value?: string) => void
  onSearchOptions: (scope: SearchScope, searchIn: SearchIn) => void
  onUnreadOnly: (value: boolean) => void
  onSelect: (key: string) => void
  onToggleChecked: (key: string, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  onClearChecked: () => void
  onBulkDestination: (path: string) => void
  onBulkMove: () => void
  onBulkDelete: () => void
  onToggleStar: (message: MessageSummary) => void
  onLoadMore: () => void
}

export function MessageList(props: Props) {
  // The unread-only filter is applied server-side (IMAP SEARCH UNSEEN); a message
  // opened while the filter is active stays visible until the next reload.
  const visible = props.messages
  const unread = visible.filter((message) => !message.seen).length
  const checkedCount = props.checkedKeys.size
  const allChecked = visible.length > 0 && visible.every((message) => props.checkedKeys.has(message.messageKey))
  const someChecked = !allChecked && visible.some((message) => props.checkedKeys.has(message.messageKey))
  const destinationFolders = props.folders.filter((folder) => props.searchScope === "all" || folder.path !== props.activeFolder)
  const optionsId = useId()
  const optionsRef = useRef<HTMLDivElement>(null)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [draftScope, setDraftScope] = useState<SearchScope>(props.searchScope)
  const [draftSearchIn, setDraftSearchIn] = useState<SearchIn>(props.searchIn)

  useEffect(() => {
    if (!optionsOpen) return
    setDraftScope(props.searchScope)
    setDraftSearchIn(props.searchIn)
    const close = (event: MouseEvent) => {
      if (!optionsRef.current?.contains(event.target as Node)) setOptionsOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [optionsOpen, props.searchIn, props.searchScope])

  const folderName = (message: MessageSummary) => (
    props.folders.find((folder) => folder.path === message.folderPath)?.name
    ?? message.folderPath
    ?? props.title
  )

  return (
    <section className="message-list" aria-label={`Folder ${props.title}`}>
      <header className="message-list__header">
        <div className="message-list__title-row">
          <div>
            <input
              type="checkbox"
              className="message-select-checkbox"
              checked={allChecked}
              disabled={visible.length === 0 || props.bulkBusy}
              ref={(element) => { if (element) element.indeterminate = someChecked }}
              onChange={(event) => props.onToggleAll(event.target.checked)}
              aria-label={allChecked ? "Odznacz wszystkie wiadomości" : "Zaznacz wszystkie wiadomości"}
            />
            <h1>{props.title}</h1>
            <span>{props.searchActive ? resultCountLabel(props.total) : unread ? `${unread} nieprzeczytane` : `${visible.length} wiadomości`}</span>
          </div>
          <div className="message-list__actions">
            <button type="button" onClick={() => props.onUnreadOnly(!props.unreadOnly)} aria-pressed={props.unreadOnly} aria-label="Pokaż tylko nieprzeczytane" className={cn(props.unreadOnly && "is-active")}>
              <SlidersHorizontal aria-hidden="true" />
            </button>
          </div>
        </div>

        {checkedCount > 0 && (
          <div className="message-bulk-actions" role="toolbar" aria-label="Akcje dla zaznaczonych wiadomości">
            <strong>{checkedCount} zaznaczono</strong>
            <select
              value={props.bulkDestination}
              onChange={(event) => props.onBulkDestination(event.target.value)}
              disabled={props.bulkBusy}
              aria-label="Folder docelowy"
            >
              <option value="">Przenieś do…</option>
              {destinationFolders.map((folder) => <option key={folder.path} value={folder.path}>{folder.name}</option>)}
            </select>
            <button type="button" onClick={props.onBulkMove} disabled={!props.bulkDestination || props.bulkBusy} aria-label="Przenieś zaznaczone wiadomości" title="Przenieś">
              {props.bulkBusy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <FolderInput aria-hidden="true" />}
            </button>
            <button type="button" className="is-destructive" onClick={props.onBulkDelete} disabled={props.bulkBusy} aria-label="Usuń zaznaczone wiadomości" title="Usuń">
              <Trash2 aria-hidden="true" />
            </button>
            <button type="button" onClick={props.onClearChecked} disabled={props.bulkBusy} aria-label="Odznacz wszystkie wiadomości" title="Anuluj zaznaczenie">
              <X aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="message-search-row">
          <form className="message-search" onSubmit={(event) => { event.preventDefault(); props.onSearch() }}>
            <Search aria-hidden="true" />
            <input
              type="search"
              value={props.searchValue}
              onChange={(event) => props.onSearchValue(event.target.value)}
              placeholder={props.searchScope === "all" ? "Szukaj we wszystkich folderach" : "Szukaj w tym folderze"}
              aria-label="Szukaj wiadomości"
            />
            {props.searchValue && <button type="button" onClick={() => { props.onSearchValue(""); props.onSearch("") }} aria-label="Wyczyść wyszukiwanie"><X aria-hidden="true" /></button>}
          </form>

          <div className="message-search-options" ref={optionsRef}>
            <button
              type="button"
              className={cn("message-search-options__trigger", (optionsOpen || props.searchScope !== "folder" || props.searchIn !== "headers") && "is-active")}
              onClick={() => setOptionsOpen((open) => !open)}
              aria-expanded={optionsOpen}
              aria-haspopup="dialog"
              aria-controls={optionsId}
            >
              <ListFilter aria-hidden="true" />
              <span>Opcje</span>
            </button>
            {optionsOpen && (
              <div
                id={optionsId}
                className="message-search-options__panel"
                role="dialog"
                aria-label="Opcje wyszukiwania"
                onKeyDown={(event) => {
                  if (event.key === "Escape") setOptionsOpen(false)
                }}
              >
                <fieldset>
                  <legend>Zakres</legend>
                  <label><input type="radio" name={`${optionsId}-scope`} checked={draftScope === "folder"} onChange={() => setDraftScope("folder")} />Ten folder</label>
                  <label><input type="radio" name={`${optionsId}-scope`} checked={draftScope === "all"} onChange={() => setDraftScope("all")} />Wszystkie foldery</label>
                </fieldset>
                <fieldset>
                  <legend>Szukaj w</legend>
                  <label><input type="radio" name={`${optionsId}-in`} checked={draftSearchIn === "headers"} onChange={() => setDraftSearchIn("headers")} />Temat i osoby</label>
                  <label><input type="radio" name={`${optionsId}-in`} checked={draftSearchIn === "all"} onChange={() => setDraftSearchIn("all")} />Także w treści</label>
                </fieldset>
                <button
                  type="button"
                  className="message-search-options__apply"
                  onClick={() => {
                    props.onSearchOptions(draftScope, draftSearchIn)
                    setOptionsOpen(false)
                  }}
                >
                  Zastosuj
                </button>
              </div>
            )}
          </div>
        </div>

        {props.unreadOnly && <button type="button" className="message-filter-chip" onClick={() => props.onUnreadOnly(false)}>Nieprzeczytane<X aria-hidden="true" /></button>}
      </header>

      <div className="message-list__scroll">
        {props.loading ? (
          <div className="message-empty"><span><LoaderCircle className="animate-spin" /></span><strong>Pobieranie poczty…</strong></div>
        ) : visible.length === 0 ? (
          <div className="message-empty"><span><Inbox aria-hidden="true" /></span><strong>Brak wiadomości</strong><p>Zmień folder lub wyszukiwaną frazę.</p></div>
        ) : (
          <ul>
            {visible.map((message) => {
              const sender = displayAddress(message.from)
              return (
                <li key={message.messageKey}>
                  <div className={cn("message-row", message.messageKey === props.selectedKey && "is-active", props.checkedKeys.has(message.messageKey) && "is-checked", !message.seen && "is-unread") }>
                    <span className="message-row__select">
                      <input
                        type="checkbox"
                        className="message-select-checkbox"
                        checked={props.checkedKeys.has(message.messageKey)}
                        disabled={props.bulkBusy}
                        onChange={(event) => props.onToggleChecked(message.messageKey, event.target.checked)}
                        aria-label={`${props.checkedKeys.has(message.messageKey) ? "Odznacz" : "Zaznacz"} wiadomość: ${message.subject}`}
                      />
                    </span>
                    <button type="button" className="message-row__open" onClick={() => props.onSelect(message.messageKey)} aria-current={message.messageKey === props.selectedKey ? "true" : undefined} aria-label={`${sender}: ${message.subject}`}>
                      <span className="message-row__avatar">{initials(sender)}{!message.seen && <i />}</span>
                      <span className="message-row__content">
                        <span className="message-row__sender"><strong>{sender}</strong><time dateTime={message.date}>{formatListDate(message.date)}</time></span>
                        <span className="message-row__subject">{message.subject}</span>
                        <span className="message-row__preview">
                          {props.searchActive && <span className="message-row__folder">{folderName(message)}</span>}
                          <span>Kliknij, aby pobrać treść wiadomości</span>
                        </span>
                      </span>
                    </button>
                    <span className="message-row__meta">
                      <button type="button" aria-label={message.flagged ? "Usuń gwiazdkę" : "Dodaj gwiazdkę"} onClick={() => props.onToggleStar(message)}>
                        <Star className={cn(message.flagged && "is-starred")} aria-hidden="true" />
                      </button>
                      {message.hasAttachments && <Paperclip aria-hidden="true" />}
                    </span>
                  </div>
                </li>
              )
            })}
            {props.hasMore && (
              <li className="message-load-more">
                <button type="button" onClick={props.onLoadMore} disabled={props.loadingMore}>{props.loadingMore ? "Pobieranie…" : "Załaduj więcej"}</button>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  )
}
