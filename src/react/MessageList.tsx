"use client"

import { Inbox, LoaderCircle, Paperclip, Search, SlidersHorizontal, Star, X } from "lucide-react"
import type { MessageSummary } from "../shared/types"
import { cn, displayAddress, formatListDate, initials } from "./utils"

type Props = {
  title: string
  messages: MessageSummary[]
  selectedKey: string | null
  searchValue: string
  unreadOnly: boolean
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  onSearchValue: (value: string) => void
  onSearch: (value?: string) => void
  onUnreadOnly: (value: boolean) => void
  onSelect: (key: string) => void
  onToggleStar: (message: MessageSummary) => void
  onLoadMore: () => void
}

export function MessageList(props: Props) {
  // The unread-only filter is applied server-side (IMAP SEARCH UNSEEN); a message
  // opened while the filter is active stays visible until the next reload.
  const visible = props.messages
  const unread = visible.filter((message) => !message.seen).length

  return (
    <section className="message-list" aria-label={`Folder ${props.title}`}>
      <header className="message-list__header">
        <div className="message-list__title-row">
          <div><h1>{props.title}</h1><span>{unread ? `${unread} nieprzeczytane` : `${visible.length} wiadomości`}</span></div>
          <div className="message-list__actions">
            <button type="button" onClick={() => props.onUnreadOnly(!props.unreadOnly)} aria-pressed={props.unreadOnly} aria-label="Pokaż tylko nieprzeczytane" className={cn(props.unreadOnly && "is-active")}>
              <SlidersHorizontal aria-hidden="true" />
            </button>
          </div>
        </div>

        <form className="message-search" onSubmit={(event) => { event.preventDefault(); props.onSearch() }}>
          <Search aria-hidden="true" />
          <input type="search" value={props.searchValue} onChange={(event) => props.onSearchValue(event.target.value)} placeholder="Szukaj w tym folderze" aria-label="Szukaj wiadomości" />
          {props.searchValue && <button type="button" onClick={() => { props.onSearchValue(""); props.onSearch("") }} aria-label="Wyczyść wyszukiwanie"><X aria-hidden="true" /></button>}
          <button type="submit" aria-label="Szukaj"><Search aria-hidden="true" /></button>
        </form>

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
                  <div className={cn("message-row", message.messageKey === props.selectedKey && "is-active", !message.seen && "is-unread") }>
                    <button type="button" className="message-row__open" onClick={() => props.onSelect(message.messageKey)} aria-current={message.messageKey === props.selectedKey ? "true" : undefined} aria-label={`${sender}: ${message.subject}`}>
                      <span className="message-row__avatar">{initials(sender)}{!message.seen && <i />}</span>
                      <span className="message-row__content">
                        <span className="message-row__sender"><strong>{sender}</strong><time dateTime={message.date}>{formatListDate(message.date)}</time></span>
                        <span className="message-row__subject">{message.subject}</span>
                        <span className="message-row__preview">Kliknij, aby pobrać treść wiadomości</span>
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
