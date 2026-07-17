import { createMailInlayHandler } from "@mailinlay/sdk/next"
import { getMailbox, getSession } from "@/lib/mailinlay-config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export const { GET, POST, PATCH, DELETE } = createMailInlayHandler({ getSession, getMailbox })
