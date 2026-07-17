"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Quote,
  Send,
  Underline,
  X,
} from "lucide-react"

export type ComposeDraft = {
  to?: string
  subject?: string
  intro?: string
}

type Props = {
  open: boolean
  draft: ComposeDraft
  onClose: () => void
  onSent: () => void
}

const editorTools = [
  { icon: Bold, label: "Pogrubienie" },
  { icon: Italic, label: "Kursywa" },
  { icon: Underline, label: "Podkreślenie" },
  { icon: List, label: "Lista punktowana" },
  { icon: ListOrdered, label: "Lista numerowana" },
  { icon: Link2, label: "Link" },
  { icon: Quote, label: "Cytat" },
]

export function ComposeDialog({ open, draft, onClose, onSent }: Props) {
  const [mounted, setMounted] = useState(false)
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState("")
  const [attachmentAdded, setAttachmentAdded] = useState(false)
  const toRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setTo(draft.to ?? "")
    setSubject(draft.subject ?? "")
    setBody(draft.intro ?? "")
    setError("")
    setAttachmentAdded(false)
    window.setTimeout(() => toRef.current?.focus(), 80)
  }, [draft, open])

  if (!open || !mounted) return null

  const handleSend = () => {
    if (!to.trim()) {
      setError("Dodaj co najmniej jednego odbiorcę.")
      toRef.current?.focus()
      return
    }

    if (!subject.trim()) {
      setError("Uzupełnij temat wiadomości.")
      return
    }

    setError("")
    onSent()
  }

  return createPortal(
    <div className="compose-layer" role="dialog" aria-modal="true" aria-labelledby="compose-title">
      <button type="button" className="compose-layer__scrim" onClick={onClose} aria-label="Zamknij edytor" />
      <section className="compose-sheet">
        <header>
          <div>
            <span className="compose-sheet__mark">MI</span>
            <div>
              <h2 id="compose-title">Nowa wiadomość</h2>
              <p>Z konta ty@firma.pl</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Zamknij">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="compose-fields">
          <label>
            <span>Do</span>
            <input
              ref={toRef}
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="odbiorca@example.com"
              aria-invalid={Boolean(error && !to.trim())}
            />
            <button type="button">DW / UDW</button>
          </label>
          <label>
            <span>Temat</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Temat wiadomości"
              aria-invalid={Boolean(error && Boolean(to.trim()) && !subject.trim())}
            />
          </label>
        </div>

        <div className="compose-tools" aria-label="Formatowanie wiadomości">
          {editorTools.map((tool) => (
            <button type="button" key={tool.label} aria-label={tool.label} title={tool.label}>
              <tool.icon aria-hidden="true" />
            </button>
          ))}
        </div>

        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Napisz wiadomość…"
          aria-label="Treść wiadomości"
        />

        <div className="compose-signature">
          <span>—</span>
          <span>Zespół firma.pl · ty@firma.pl</span>
        </div>

        {error && (
          <p className="compose-error" role="alert">
            {error}
          </p>
        )}

        <footer>
          <button
            type="button"
            className="compose-attachment"
            onClick={() => setAttachmentAdded(true)}
          >
            <Paperclip aria-hidden="true" />
            <span>{attachmentAdded ? "brief-mail-inlay.pdf" : "Załącz plik"}</span>
          </button>
          <div>
            <button type="button" onClick={onClose} className="compose-discard">
              Odrzuć
            </button>
            <button type="button" onClick={handleSend} className="compose-send">
              <Send aria-hidden="true" />
              Wyślij
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
