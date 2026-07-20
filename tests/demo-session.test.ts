import { afterEach, describe, expect, it, vi } from "vitest"
import { getSession } from "../lib/mailinlay-config"

describe("local demo session", () => {
  const previous = process.env.MAILINLAY_DEMO_MODE
  afterEach(() => {
    if (previous === undefined) delete process.env.MAILINLAY_DEMO_MODE
    else process.env.MAILINLAY_DEMO_MODE = previous
  })

  it("is available only for an explicitly enabled local host", async () => {
    process.env.MAILINLAY_DEMO_MODE = "true"
    await expect(getSession(new Request("http://localhost:4173", { headers: { host: "localhost:4173" } }))).resolves.toMatchObject({ projectId: "mailinlay-demo" })
    await expect(getSession(new Request("http://localhost:4173", { headers: { host: "not-local.example" } }))).resolves.toBeNull()
  })

  it("is disabled by default", async () => {
    delete process.env.MAILINLAY_DEMO_MODE
    await expect(getSession(new Request("http://localhost:4173", { headers: { host: "localhost:4173" } }))).resolves.toBeNull()
  })

  it("never exists in a production build, even with local-looking headers", async () => {
    process.env.MAILINLAY_DEMO_MODE = "true"
    vi.stubEnv("NODE_ENV", "production")
    try {
      await expect(getSession(new Request("http://localhost:4173", { headers: { host: "localhost:4173" } }))).resolves.toBeNull()
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
