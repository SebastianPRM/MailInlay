**Design QA**

- Source visual truth: `/Users/sebastianpawelczyk/Desktop/mail-inlay-ui-design.zip`
- Implementation: `http://localhost:4173/`
- Planned viewports: 1440 × 900, 1024 × 768, 768 × 900, 480 × 820
- Planned states: vertical CMS navigation, horizontal CMS navigation, narrow container list, narrow container reader, compose sheet
- Implementation screenshot: unavailable
- Full-view comparison evidence: blocked — the in-app browser control surface is unavailable in this session, and permission to use a local headless browser is pending.
- Focused region comparison evidence: blocked for the same reason.

**Checks completed without browser rendering**

- Production build: passed.
- TypeScript validation: passed.
- Server response: HTTP 200.
- Container-query tiers are present for 1120 px, 860 px, 760 px and 480 px.
- CMS navigation remains part of the layout in vertical and horizontal variants.
- Compose layer uses a portal and is centered against the full viewport.
- Core controls are wired: layout switch, folders, search, unread filter, refresh, read state, star, archive, trash, mark unread, image reveal, download feedback, reply/forward and compose validation.
- Accessibility attributes and reduced-motion handling are present.

**Findings**

- [P1] Visual comparison cannot be completed.
  Location: all rendered views.
  Evidence: no browser-rendered implementation screenshot and no captured source screenshot are available.
  Impact: spacing, typography, overflow, crop and responsive behavior cannot be signed off visually.
  Fix: capture the original project and the implementation at matching viewports, combine the screenshots for comparison, then fix all P0/P1/P2 differences.

**Open Questions**

- Permission to use a local headless browser for screenshot capture and interaction testing is pending.

**Implementation Checklist**

- Capture the original reference project at 1440 × 900.
- Capture both CMS variants at 1440 × 900.
- Capture vertical CMS at 1024 × 768 and 768 × 900.
- Capture the narrow list, reader and compose states at 480 × 820.
- Test the main compose flow and check browser console errors.
- Compare typography, spacing, tokens, icons and content against the source direction.
- Fix any P0/P1/P2 findings and repeat the comparison.

**Follow-up Polish**

- Evaluate whether the 8–10 px utility text needs a one-step size increase after real rendering.
- Check the compact host rail tooltips and narrow reply-bar labels in the browser.

final result: blocked
