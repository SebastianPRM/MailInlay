"use client"

import {
  Inbox,
  Paperclip,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatListDate, initials } from "@/lib/mail-utils"
import type { Message } from "@/lib/mail-data"

type Props = {
  title: string
  messages: Message[]
  selectedId: string | null
  query: string
  unreadOnly: boolean
  onQueryChange: (value: string) => void
  onUnreadOnlyChange: (value: boolean) => void
  onSelect: (id: string) => void
  onToggleStar: (id: string) => void
}

export function MessageList({
  title,
  messages,
  selectedId,
  query,
  unreadOnly,
  onQueryChange,
  onUnreadOnlyChange,
  onSelect,
  onToggleStar,
}: Props) {
  const unread = messages.filter((message) => !message.read).length

  return (
    <section className="message-list" aria-label={`Folder ${title}`}>
      <header className="message-list__header">
        <div className="message-list__title-row">
          <div>
            <h1>{title}</h1>
            <span>{unread > 0 ? `${unread} nieprzeczytane` : `${messages.length} wiadomości`}</span>
          </div>
          <div className="message-list__actions">
            <button
              type="button"
              onClick={() => onUnreadOnlyChange(!unreadOnly)}
              aria-pressed={unreadOnly}
              aria-label="Pokaż tylko nieprzeczytane"
              title="Tylko nieprzeczytane"
              className={cn(unreadOnly && "is-active")}
            >
              <SlidersHorizontal aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="message-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Szukaj w tym folderze"
            aria-label="Szukaj wiadomości"
          />
          {query && (
            <button type="button" onClick={() => onQueryChange("")} aria-label="Wyczyść wyszukiwanie">
              <X aria-hidden="true" />
            </button>
          )}
          <kbd>⌘ F</kbd>
        </div>

        {unreadOnly && (
          <button type="button" className="message-filter-chip" onClick={() => onUnreadOnlyChange(false)}>
            Nieprzeczytane
            <X aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="message-list__scroll">
        {messages.length === 0 ? (
          <div className="message-empty">
            <span>
              <Inbox aria-hidden="true" />
            </span>
            <strong>{query || unreadOnly ? "Brak wyników" : "Ten folder jest pusty"}</strong>
            <p>
              {query || unreadOnly
                ? "Zmień frazę lub wyłącz aktywny filtr."
                : "Nowe wiadomości pojawią się tutaj po synchronizacji."}
            </p>
            {(query || unreadOnly) && (
              <button
                type="button"
                onClick={() => {
                  onQueryChange("")
                  onUnreadOnlyChange(false)
                }}
              >
                Wyczyść filtry
              </button>
            )}
          </div>
        ) : (
          <ul>
            {messages.map((message) => {
              const active = message.id === selectedId

              return (
                <li key={message.id}>
                  <div
                    className={cn("message-row", active && "is-active", !message.read && "is-unread")}
                  >
                    <button
                      type="button"
                      className="message-row__open"
                      onClick={() => onSelect(message.id)}
                      aria-current={active ? "true" : undefined}
                      aria-label={`${message.fromName}: ${message.subject}`}
                    >
                      <span
                        className="message-row__avatar"
                        style={{ backgroundColor: message.labelColor ?? "var(--primary)" }}
                      >
                        {initials(message.fromName)}
                        {!message.read && <i />}
                      </span>

                      <span className="message-row__content">
                        <span className="message-row__sender">
                          <strong>{message.fromName}</strong>
                          <time dateTime={message.date}>{formatListDate(message.date)}</time>
                        </span>
                        <span className="message-row__subject">{message.subject}</span>
                        <span className="message-row__preview">{message.preview}</span>
                      </span>
                    </button>

                    <span className="message-row__meta">
                      <button
                        type="button"
                        aria-label={message.starred ? "Usuń gwiazdkę" : "Dodaj gwiazdkę"}
                        onClick={() => onToggleStar(message.id)}
                      >
                        <Star className={cn(message.starred && "is-starred")} aria-hidden="true" />
                      </button>
                      {message.hasAttachment && <Paperclip aria-hidden="true" />}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
