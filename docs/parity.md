# Shortwave parity plan

The target: in Gmail with nowave, email navigation and the overall UI should be hard to tell apart from Shortwave. AI and integrations (Slack, CRM) are out of scope. Every row below is measured in the real Shortwave app before it is built, and checked side by side on real Gmail before it ships.

## Gmail settings nowave expects

| Setting | Value | Why | State |
| --- | --- | --- | --- |
| Keyboard shortcuts | On | nowave drives Gmail through its shortcuts | On |
| Custom keyboard shortcuts | On, Archive on `d` and `e` | Gmail archives only on a real key press of its own archive key | On |
| Inbox type | Starred first | Shortwave's pinned Starred section | On |
| Inbox sections | Starred and Everything else show up to 50 items | Gmail's most. Shortwave lists everything; past 50, the section's range in its header opens the whole section | Set on 2026-11-02 (Everything else was 10) |
| Reading pane | Vertical split, on | Shortwave opens a thread in a side panel | Turned back on on 2026-11-02 |
| Auto-advance | To be decided in journey 6 | Done moves focus to the next thread | Unchanged |

## Journeys

Each journey lists what Shortwave does (measured live in Shortwave's Sent view at a 1388 px window), how nowave gets there on Gmail, and how it is checked.

### 1. Inbox at rest

- Shortwave: full-width list (card 1292 px), single-line 40 px rows, no panel.
- nowave: split pane on, but while no conversation is open, the empty pane is hidden and the list takes the full card width with single-line rows. Already matched within 2 px for the list itself (1.0.5 to 1.0.10).
- Check: a screenshot pair and metrics for the card, rows, sections and tabs.
- Done on 2026-11-02: with no conversation open, the pane and its divider collapse to zero width, and the list is 1292 px. The pane must stay in the layout: hidden with `display: none`, Gmail sizes it `height: 0px` and later opens conversations into an invisible pane.

### 2. Move in the list

- Shortwave: `j` / `k` move the selection instantly. The selected row is `rgb(204,216,254)` with a blue left bar. The list scrolls when the cursor reaches an edge. Nothing opens.
- nowave: Gmail's cursor, instant highlight (1.0.2). With the panel closed, `j` / `k` must never open a conversation.
- Check: latency within 15 ms of plain Gmail, and no conversation opened or marked read.

### 3. Open a thread

- Shortwave: `Enter` or `→`. The list shrinks to a 550 px column of compact single-line rows (sender truncated, subject, chips, date). The thread opens in a 742 px panel on the right: a toolbar (collapse, expand, share, more, label, star, todo, snooze, trash, done), the subject at about 16 px semibold, the participants line, message cards, collapsed messages as "…" chips, and a "Reply all" bar pinned at the bottom.
- nowave: `Enter`, `l`, `o` and `→` open the cursor conversation in Gmail's reading pane. The pane is shown at Shortwave's proportions. The list switches to compact single-line rows, not the current two-line rows. Gmail's conversation view is restyled to Shortwave's panel.
- Check: a screenshot pair and metrics for the column widths, row height, panel toolbar, subject, message cards and reply bar.
- Done on 2026-11-02 on real Gmail: the list is 550 px of single-line 40 px rows with a 120 px sender, and the conversation pane is 742 px (Gmail's 5 px divider overlaps the list). The subject is 16 px. Still to do: Shortwave's in-panel toolbar (Gmail's actions stay in the row above the list), message cards and the pinned "Reply all" bar.

### 4. Move between threads with the panel open

- Shortwave: `j` / `k` select the next or previous thread and the panel shows it. The list cursor follows.
- nowave: Gmail's behaviour in split mode already does this. Check that the list cursor and the selected-row style follow.
- Check: only in Sent or in a read-only search, so no thread is marked read.

### 5. Close the panel

- Shortwave: `Esc` or `←` closes the panel. The list returns to full width, and the cursor stays on the same thread.
- nowave: a real close is required, so that `j` / `k` afterwards move without opening. The `#…/p1?nw=` trick stopped working (Gmail keeps the open conversation per list). First task: find a mechanism that empties Gmail's pane, for example Gmail's `u`, toggling the split mode, or re-routing the list. Fallback: hide the pane while nowave remembers it is closed, and make `j` / `k` move the cursor without opening while it is closed.
- Check: after closing, `j` moves without opening and the list is full width.
- Done on 2026-11-02: Gmail's own `u` (back to list) empties the pane and keeps the cursor row, so `Esc` and `h` in the pane send it. Checked on real Gmail: the pane closes, the list returns to full width, and `j` then moves without opening. `←` is not bound yet.

### 6. Done and next

- Shortwave: `d` / `e` archive the focused thread and focus the next item. `[` is done and next, `]` is done and previous.
- nowave: the real archive key passes through to Gmail. With the panel open, the next thread must open in the panel. With the panel closed, the cursor moves to the next row. This decides whether Gmail's Auto-advance setting is needed.
- Check: behaviour verified on one already-read email, undone with `z`.

### 7. Splits

- Shortwave: `Tab` / `⇧Tab` switch splits instantly, and the panel closes.
- nowave: matched visually. Check that the panel closes on a split switch.

### 8. Search

- Shortwave: `/` focuses the centred field. Results show in the same list layout with the query in the field.
- nowave: Gmail's search with its suggestions dropdown (1.0.2). Restyle the results view (filter chips row, list) to Shortwave's.

### 9. Command palette

- Shortwave: `⌘K`, a 640 px card with no backdrop.
- nowave: matched in 1.0.8.

### 10. Compose

- Shortwave: `c` opens its composer. To be measured: whether it is a docked panel or a modal, its size, its chrome and how it closes.
- nowave: restyle Gmail's compose window to match.

### 11. Dark theme

- Shortwave follows the system theme. Its dark mode is to be measured: background, card, rows, selection, panel and palette.
- nowave: a dark theme on `prefers-color-scheme: dark`. While the look is on, `<meta name="darkreader-lock">` stops Dark Reader from darkening Gmail a second time.
- Measured on 2026-11-02 in Shortwave's dark mode: page `rgb(10,10,14)`, card `rgb(22,22,22)`, cursor row `rgb(30,45,87)`, hovered row `rgb(59,59,59)`, sender and subject `rgba(255,255,255,0.65)`, snippet and date `0.4`, unread `0.9`, section headers `0.58`, idle tabs `0.36`, borders `rgba(255,255,255,0.12)`, section rule `rgb(51,51,51)`, palette card `rgb(42,42,42)` with a `rgb(38,38,38)` label and `rgba(53,106,255,0.2)` selection, Compose text `rgb(101,147,255)` on `rgba(53,106,255,0.12)`. Shortwave also renders message bodies light on dark.
- Built on 2026-11-02 and checked on real Gmail in Inbox, Sent, a search, two open conversations, the snooze menu and settings. Message bodies are inverted with their hues kept, and their images are inverted back. Settings pages keep Gmail's light content. Still to check: an open compose window in dark (seen only minimised), and Gmail's dialogs.

### 12. Clean-up

- Hide Gmail's footer (Terms, Privacy, account activity) and the stray horizontal scrollbar stub under the list.
- Done on 2026-11-02: the footer is `[role="contentinfo"]`, and the "scrollbar stub" was its storage meter, so hiding the footer removes both.

## Keys and commands

Compared on 2026-11-01: Shortwave's Settings > Keyboard shortcuts page and its `⌘K` palette in Sent, against nowave's command registry and key resolver. Gmail's own behaviour in this section comes from Gmail's published shortcuts and is not checked live.

### Clashes to fix first

| Key | What happens | Why |
| --- | --- | --- |
| `g` then `l` | In the list, opens the cursor conversation. In a thread, does nothing. Gmail and Shortwave go to a label. | nowave lets `g` through to Gmail, finds no `g l` binding, and resolves `l` on its own as Open conversation. |
| `⌘K` while typing | Opens the palette. Gmail and Shortwave insert a link in compose. | The palette command is live in the typing context. |

### Missing

| Area | Shortwave | nowave today |
| --- | --- | --- |
| List | `↓` / `↑` next and previous, `→` open in the side panel, `←` close, `⌘⇧→` open full screen | `j` / `k`, `Enter` / `o` / `l`, `h` / `Esc` only (journeys 3 and 5) |
| Triage | `[` done and next, `]` done and previous | Unbound, so they reach Gmail, whose `[` and `]` archive and move the other way round (journey 6) |
| Triage | `t` add to todo | Missing. Gmail has no todos; the nearest is Add to Tasks (`⇧T`) |
| Triage | `l` label, `h` snooze | nowave keeps `h` and `l` for back and open, so Label… has no key |
| Triage | `+` or `=` mark important, `-` mark not important | The keys reach Gmail, but the palette has no commands for them |
| Triage | `⌘U` unsubscribe, `⌘B` block spam, `⌘C` copy thread link, `⌘P` print, `⌘Z` undo | Missing |
| Go to | `g o` todos, `g b` snoozed, `g +` important, `g l` labels | `g h` for Snoozed only; `g l` clashes (see above) |
| Global | `⌘⇧K` and `⌘⇧P` palette, `` ` `` and `~` next and previous split, `Ctrl+1` to `9` switch account | Missing. Accounts 0 to 3 switch from the palette only |
| Global | `⌘,` settings, `⌘⇧L` toggle theme, `⌘/` left sidebar, `⌘\` right sidebar | Missing; no dark theme yet (journey 11) |
| Compose | `⌘⇧L` scheduled send, `⌘⇧⏎` send and done, `⌘⇧M` send and remind, `⌘⇧D` discard draft, `⌘⇧A` attach, `⌘⇧V` view sent message | Missing. Gmail's own `⌘⏎` send and `⌘⇧C` / `⌘⇧B` Cc and Bcc pass through (journey 10) |
| Palette | Go to Important, Go to each Settings page, Reapply filters | Missing |

nowave's own additions stay: `⇧D` select everything, saving and removing splits, calm mode, and detecting Gmail's custom keys.

## Out of scope

AI summaries, AI replies, the AI Assistant (`y`, `⌘J`, `⌘⇧J`, `⌘;`, `Tab` autocomplete) and Gmail's own AI Overview, Slack and CRM integrations, team sharing and assigning (`⌘⇧S`, `⌘⇧Z`, public links), Shortwave's bundles (grouped rows; Gmail owns the list rows), and sender logos and photos (Gmail's list has none, so nowave draws letter avatars).

## How every step is verified

1. Measure Shortwave live in its own Ardia window: screenshots and computed styles at the same window width.
2. Build nowave and run it on real Gmail with `dev/shot.mjs`, at the same width.
3. Compare per metric (within 2 px, exact colours) and per behaviour (what each key does).
4. Use only keys and views that change no mail: `j` / `k` and opening only in Sent or a read-only search.
5. Ship: bump the version, build, test, push `main`, `ardia scripts install`, and check CI.
