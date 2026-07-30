**Design QA — globalne wyszukiwanie**

- Source visual truth: `/Users/sebastianpawelczyk/.codex/generated_images/019fb23c-6cb6-7d41-a67d-55090c2a048d/call_W7HGTSEFIvw0vaCNUEwn4EYC.png`
- Normalized source: `/Users/sebastianpawelczyk/.codex/visualizations/2026/07/30/019fb23c-6cb6-7d41-a67d-55090c2a048d/source-search-options-normalized.png`
- Implementation screenshot: `/Users/sebastianpawelczyk/.codex/visualizations/2026/07/30/019fb23c-6cb6-7d41-a67d-55090c2a048d/implementation-search-options.png`
- Full-view comparison: `/Users/sebastianpawelczyk/.codex/visualizations/2026/07/30/019fb23c-6cb6-7d41-a67d-55090c2a048d/design-qa-comparison.png`
- Focused comparison: `/Users/sebastianpawelczyk/.codex/visualizations/2026/07/30/019fb23c-6cb6-7d41-a67d-55090c2a048d/design-qa-comparison-focus.png`
- Viewport and CSS size: 1280 × 720.
- Source pixels: 1672 × 941, normalized to 1280 × 720.
- Implementation pixels: 1280 × 720.
- Density normalization: both compared at 1280 × 720; browser capture uses device scale factor 1.
- State: search query entered, scope `Wszystkie foldery`, search target `Także w treści`, separate `Nieprzeczytane` filter active, search-options popover open, global results displaying folder badges.

**Full-view comparison evidence**

- The existing Northdesk shell, MailInlay top bar, collapsed folder rail, list width and reader width remain aligned with the real product.
- The search settings are a separate control beside the search field. The existing unread-filter control remains in the title row and its active chip appears independently below the search row.
- The implementation uses live mailbox content, so subjects and the reader state intentionally differ from the fictional mock data.

**Focused region comparison evidence**

- The focused side-by-side comparison confirms equivalent hierarchy: title row, search row, separate options trigger, unread chip, anchored popover, radio groups and primary apply button.
- Folder identity is visible on every search result as a compact pill.
- The implementation popover is slightly wider than the generated mock so Polish labels do not wrap or clip. This is an intentional usability adjustment.

**Required fidelity surfaces**

- Fonts and typography: passed. Existing project font, weights, truncation and compact metadata scale are preserved.
- Spacing and layout rhythm: passed. Search controls fit the existing list width without resizing the three-column layout; popover anchoring and vertical rhythm match the selected direction.
- Colors and visual tokens: passed. All new controls use existing MailInlay primary, accent, border, popover and shadow tokens.
- Image quality and asset fidelity: passed. The feature introduces no raster assets; icons come from the project’s existing Lucide dependency.
- Copy and content: passed. Polish labels match the selected flow and clearly separate unread filtering from search configuration.

**Interaction verification**

- Opened and closed `Opcje`.
- Selected `Wszystkie foldery` and `Także w treści`.
- Applied the options and received merged live results from multiple IMAP folders.
- Confirmed folder badges in global results, including INBOX and Trash.
- Activated the separate `Nieprzeczytane` control while preserving the selected search options.
- Opened a result from the global search.
- Checked browser console: no errors.

**Findings**

- No actionable P0, P1 or P2 findings.
- [P3] The actual product’s active unread icon is visually quieter than the generated mock’s solid-blue treatment. This is acceptable because preserving the existing component style was a user requirement.

**Comparison history**

- Initial implementation capture showed the correct controls and global results but an empty reader.
- A result was opened to verify folder-aware message access. Enabling the unread filter can remove that result after it becomes read, which is expected product behavior and does not affect the search-control comparison.
- The final focused comparison confirmed the requested separation and required folder labels; no P0/P1/P2 fixes remained.

**Implementation checklist**

- [x] Separate unread filter and search settings.
- [x] Current-folder and all-folder scope.
- [x] Header-only and body-inclusive search.
- [x] Folder labels in results and reader.
- [x] Browser interaction and console verification.
- [x] Full and focused visual comparison.

**Follow-up polish**

- P3 only: consider a tooltip explaining that searching message bodies can take longer on large mailboxes.

final result: passed
