"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { FileText, Paperclip, Send, Trash2, X } from "lucide-react"
import type { SendResponse } from "../shared/types"
import { formatBytes } from "./utils"
import { SimpleEditor } from "./SimpleEditor"

export type ComposeDraft = {
  mode?: "new" | "reply" | "reply-all" | "forward"
  to?: string
  cc?: string
  subject?: string
  bodyHtml?: string
  bodyText?: string
  quotedHtml?: string
  quotedText?: string
  inReplyTo?: string
  references?: string[]
}

type Props = {
  open: boolean
  from: string
  draft: ComposeDraft
  onClose: () => void
  onSend: (form: FormData) => Promise<SendResponse>
}

export function MailComposer({ open, from, draft, onClose, onSend }: Props) {
  const [mounted, setMounted] = useState(false)
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState("")
  const [bodyHtml, setBodyHtml] = useState("<p></p>")
  const [bodyText, setBodyText] = useState("")
  const [showCopies, setShowCopies] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toRef = useRef<HTMLInputElement>(null)
  const sheetRef = useRef<HTMLElement>(null)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    setTo(draft.to ?? "")
    setCc(draft.cc ?? "")
    setBcc("")
    setSubject(draft.subject ?? "")
    setBodyHtml(draft.bodyHtml ?? "<p></p>")
    setBodyText(draft.bodyText ?? "")
    setShowCopies(Boolean(draft.cc))
    setAttachments([])
    setError("")
    setSending(false)
    window.setTimeout(() => toRef.current?.focus(), 50)
  }, [draft, open])

  const dirty =
    to !== (draft.to ?? "") ||
    cc !== (draft.cc ?? "") ||
    bcc !== "" ||
    subject !== (draft.subject ?? "") ||
    bodyText.trim() !== (draft.bodyText ?? "").trim() ||
    attachments.length > 0

  const requestClose = () => {
    if (sending) return
    if (dirty && !window.confirm("Odrzucić tę wiadomość? Wpisana treść nie zostanie zapisana.")) return
    onClose()
  }
  const requestCloseRef = useRef(requestClose)
  requestCloseRef.current = requestClose

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        requestCloseRef.current()
        return
      }
      if (event.key !== "Tab") return
      const focusable = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((element) => element.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  if (!open || !mounted) return null

  const title = draft.mode === "reply" ? "Odpowiedź" : draft.mode === "reply-all" ? "Odpowiedź wszystkim" : draft.mode === "forward" ? "Przekaż wiadomość" : "Nowa wiadomość"

  const submit = async () => {
    if (!to.trim()) return setError("Dodaj co najmniej jednego odbiorcę.")
    if (!subject.trim()) return setError("Uzupełnij temat wiadomości.")
    const total = attachments.reduce((sum, file) => sum + file.size, 0)
    if (total > 3 * 1024 * 1024) return setError("Załączniki mogą mieć łącznie maksymalnie 3 MB.")

    const form = new FormData()
    form.set("to", to)
    form.set("cc", cc)
    form.set("bcc", bcc)
    form.set("subject", subject)
    form.set("bodyHtml", bodyHtml)
    form.set("bodyText", bodyText)
    if (draft.quotedHtml) form.set("quotedHtml", draft.quotedHtml)
    if (draft.quotedText) form.set("quotedText", draft.quotedText)
    if (draft.inReplyTo) form.set("inReplyTo", draft.inReplyTo)
    form.set("references", JSON.stringify(draft.references ?? []))
    attachments.forEach((file) => form.append("attachments", file))

    setSending(true)
    setError("")
    try {
      await onSend(form)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Nie udało się wysłać wiadomości.")
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <div className="compose-layer" role="dialog" aria-modal="true" aria-labelledby="compose-title">
      <button type="button" className="compose-layer__scrim" onClick={requestClose} aria-label="Zamknij edytor" />
      <section ref={sheetRef} className="compose-sheet">
        <header>
          <div><span className="compose-sheet__mark">MI</span><div><h2 id="compose-title">{title}</h2><p>Z konta {from}</p></div></div>
          <button type="button" onClick={requestClose} aria-label="Zamknij"><X aria-hidden="true" /></button>
        </header>

        <div className="compose-fields">
          <label><span>Do</span><input ref={toRef} value={to} onChange={(event) => setTo(event.target.value)} placeholder="odbiorca@example.com" aria-invalid={Boolean(error && !to.trim())} /><button type="button" onClick={() => setShowCopies(!showCopies)}>DW / UDW</button></label>
          {showCopies && <><label><span>DW</span><input value={cc} onChange={(event) => setCc(event.target.value)} placeholder="kopia@example.com" /></label><label><span>UDW</span><input value={bcc} onChange={(event) => setBcc(event.target.value)} placeholder="ukryta-kopia@example.com" /></label></>}
          <label><span>Temat</span><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Temat wiadomości" aria-invalid={Boolean(error && to.trim() && !subject.trim())} /></label>
        </div>

        <SimpleEditor value={bodyHtml} onChange={(html, text) => { setBodyHtml(html); setBodyText(text) }} />
        <div className="compose-signature"><span>—</span><span>Podpis skrzynki zostanie dodany automatycznie.</span></div>

        {draft.quotedText && <div className="compose-quote-preview"><strong>Cytowana wiadomość</strong><p>{draft.quotedText.slice(0, 360)}</p></div>}
        {attachments.length > 0 && <div className="compose-files">{attachments.map((file, index) => <div key={`${file.name}-${index}`}><FileText /><span><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></span><button type="button" aria-label={`Usuń ${file.name}`} onClick={() => setAttachments((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></button></div>)}</div>}
        {error && <p className="compose-error" role="alert">{error}</p>}

        <footer>
          <input ref={inputRef} className="compose-file-input" type="file" multiple onChange={(event) => { const files = Array.from(event.target.files ?? []); setAttachments((current) => [...current, ...files].slice(0, 10)); event.target.value = "" }} />
          <button type="button" className="compose-attachment" onClick={() => inputRef.current?.click()}><Paperclip aria-hidden="true" /><span>Załącz plik</span></button>
          <div><button type="button" onClick={requestClose} className="compose-discard">Odrzuć</button><button type="button" onClick={submit} className="compose-send" disabled={sending}><Send aria-hidden="true" />{sending ? "Wysyłanie…" : "Wyślij"}</button></div>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
