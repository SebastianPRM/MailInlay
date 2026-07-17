"use client"

import { useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import { Bold, Eraser, Italic, Link2, List, ListOrdered, Quote, Redo2, Underline as UnderlineIcon, Undo2 } from "lucide-react"
import { cn } from "./utils"

type Props = {
  value: string
  onChange: (html: string, text: string) => void
}

export function SimpleEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { class: "simple-editor__content", "aria-label": "Treść wiadomości" } },
    onUpdate: ({ editor: current }) => onChange(current.getHTML(), current.getText()),
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  if (!editor) return <div className="simple-editor is-loading">Ładowanie edytora…</div>

  const setLink = () => {
    const current = editor.getAttributes("link").href as string | undefined
    const href = window.prompt("Adres linku", current || "https://")
    if (href === null) return
    if (!href.trim()) editor.chain().focus().unsetLink().run()
    else editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run()
  }

  const tools = [
    { label: "Pogrubienie", icon: Bold, active: editor.isActive("bold"), action: () => editor.chain().focus().toggleBold().run() },
    { label: "Kursywa", icon: Italic, active: editor.isActive("italic"), action: () => editor.chain().focus().toggleItalic().run() },
    { label: "Podkreślenie", icon: UnderlineIcon, active: editor.isActive("underline"), action: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Lista punktowana", icon: List, active: editor.isActive("bulletList"), action: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Lista numerowana", icon: ListOrdered, active: editor.isActive("orderedList"), action: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Link", icon: Link2, active: editor.isActive("link"), action: setLink },
    { label: "Cytat", icon: Quote, active: editor.isActive("blockquote"), action: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Cofnij", icon: Undo2, active: false, action: () => editor.chain().focus().undo().run() },
    { label: "Ponów", icon: Redo2, active: false, action: () => editor.chain().focus().redo().run() },
    { label: "Wyczyść formatowanie", icon: Eraser, active: false, action: () => editor.chain().focus().clearNodes().unsetAllMarks().run() },
  ]

  return (
    <div className="simple-editor">
      <div className="compose-tools" aria-label="Formatowanie wiadomości">
        {tools.map((tool) => <button type="button" key={tool.label} className={cn(tool.active && "is-active")} aria-label={tool.label} title={tool.label} onClick={tool.action}><tool.icon aria-hidden="true" /></button>)}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
