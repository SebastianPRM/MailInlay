import { SEND_RATE_LIMIT, SEND_RATE_WINDOW_MS } from "./limits"

const MAX_TRACKED_KEYS = 1000

const buckets = new Map<string, number[]>()

function prune(now: number) {
  if (buckets.size <= MAX_TRACKED_KEYS) return
  for (const [key, timestamps] of buckets) {
    if (!timestamps.some((timestamp) => now - timestamp < SEND_RATE_WINDOW_MS)) buckets.delete(key)
  }
}

export function consumeSendSlot(key: string, now = Date.now()): boolean {
  prune(now)
  const recent = (buckets.get(key) ?? []).filter((timestamp) => now - timestamp < SEND_RATE_WINDOW_MS)
  if (recent.length >= SEND_RATE_LIMIT) {
    buckets.set(key, recent)
    return false
  }
  recent.push(now)
  buckets.set(key, recent)
  return true
}

export function resetSendSlots() {
  buckets.clear()
}
