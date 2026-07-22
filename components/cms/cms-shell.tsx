"use client"

import { useState } from "react"
import {
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  CircleHelp,
  ContactRound,
  FileBarChart,
  Gauge,
  Grid2X2,
  LayoutPanelLeft,
  Menu,
  PanelTop,
  Search,
  Settings,
  UsersRound,
} from "lucide-react"
import { MailPanel } from "@mailinlay/sdk/react"
import { cn } from "@/lib/utils"

type CmsLayout = "vertical" | "horizontal"

const navItems = [
  { label: "Pulpit", icon: Gauge },
  { label: "Klienci", icon: ContactRound },
  { label: "Zespół", icon: UsersRound },
  { label: "Raporty", icon: FileBarChart },
  { label: "Integracje", icon: Boxes },
]

function LayoutSwitch({
  layout,
  onChange,
}: {
  layout: CmsLayout
  onChange: (layout: CmsLayout) => void
}) {
  return (
    <div className="cms-layout-switch" aria-label="Wariant osadzenia w CMS">
      <button
        type="button"
        onClick={() => onChange("vertical")}
        aria-pressed={layout === "vertical"}
        title="Menu pionowe"
        className={cn(layout === "vertical" && "is-active")}
      >
        <LayoutPanelLeft aria-hidden="true" />
        <span>Pionowe</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("horizontal")}
        aria-pressed={layout === "horizontal"}
        title="Menu poziome"
        className={cn(layout === "horizontal" && "is-active")}
      >
        <PanelTop aria-hidden="true" />
        <span>Poziome</span>
      </button>
    </div>
  )
}

function Brand() {
  return (
    <div className="cms-brand">
      <span className="cms-brand__mark">
        <Grid2X2 aria-hidden="true" />
      </span>
      <span className="cms-brand__copy">
        <strong>Northdesk</strong>
        <small>workspace</small>
      </span>
    </div>
  )
}

function HostActions() {
  return (
    <div className="cms-host-actions">
      <button type="button" aria-label="Pomoc">
        <CircleHelp aria-hidden="true" />
      </button>
      <button type="button" aria-label="Powiadomienia" className="cms-notifications">
        <Bell aria-hidden="true" />
        <span />
      </button>
      <button type="button" className="cms-profile" aria-label="Menu użytkownika">
        <span>SP</span>
        <span className="cms-profile__copy">
          <strong>Sebastian</strong>
          <small>Administrator</small>
        </span>
        <ChevronDown aria-hidden="true" />
      </button>
    </div>
  )
}

function VerticalNavigation() {
  return (
    <aside className="cms-sidebar" aria-label="Główne menu CMS">
      <Brand />
      <nav>
        <p>Workspace</p>
        {navItems.map((item) => (
          <button type="button" key={item.label}>
            <item.icon aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
        <p>Komunikacja</p>
        <button type="button" className="is-active" aria-current="page">
          <Menu aria-hidden="true" />
          <span>Poczta</span>
          <b>6</b>
        </button>
      </nav>
      <button type="button" className="cms-sidebar__settings">
        <Settings aria-hidden="true" />
        <span>Ustawienia</span>
      </button>
    </aside>
  )
}

function HorizontalNavigation() {
  return (
    <header className="cms-horizontal-nav">
      <Brand />
      <nav aria-label="Główne menu CMS">
        {navItems.slice(0, 4).map((item) => (
          <button type="button" key={item.label}>
            <item.icon aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
        <button type="button" className="is-active" aria-current="page">
          <Menu aria-hidden="true" />
          <span>Poczta</span>
          <b>6</b>
        </button>
      </nav>
      <HostActions />
    </header>
  )
}

export function CmsShell() {
  const [layout, setLayout] = useState<CmsLayout>("vertical")

  return (
    <main className={cn("cms-demo", `cms-demo--${layout}`)}>
      {layout === "vertical" ? <VerticalNavigation /> : <HorizontalNavigation />}

      <section className="cms-workspace">
        <header className="cms-toolbar">
          <div className="cms-toolbar__title">
            <Building2 aria-hidden="true" />
            <span>Northwind Studio</span>
            <i>/</i>
            <strong>Poczta</strong>
          </div>

          <div className="cms-toolbar__search">
            <Search aria-hidden="true" />
            <span>Szukaj w panelu</span>
            <kbd>⌘ K</kbd>
          </div>

          <div className="cms-toolbar__right">
            <span className="cms-toolbar__label">Układ CMS</span>
            <LayoutSwitch layout={layout} onChange={setLayout} />
            {layout === "vertical" && <HostActions />}
          </div>
        </header>

        <div className="cms-content">
          <MailPanel apiBase="/api/admin/mail" mailboxId="main" defaultFoldersCollapsed />
        </div>
      </section>
    </main>
  )
}
