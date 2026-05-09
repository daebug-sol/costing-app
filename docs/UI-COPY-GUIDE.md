# UI copy guide — costing-app

The product audience is Indonesian; the engineering audience is bilingual.
Copy decisions affect screen real estate, accessibility (screen-reader
output), exports, and trust in financial numbers. Follow these rules.

---

## 1. Language

- **Primary: Bahasa Indonesia.** All user-facing labels, empty states,
  toasts, dialog titles, and validation messages.
- **Secondary: English.** Acceptable for technical/finance terms that have
  no widely-used Indonesian equivalent in this domain (e.g. *gross margin*,
  *cashflow*, *Sankey*, *PPN*, *PPH*). Mixing inside one string is fine —
  see existing strings:
  - "Ringkasan proyek dan penawaran"
  - "Belum cukup data untuk menampilkan pendorong profit dan erosi margin."
- **Code, comments, identifiers, file names: English.** Do not localize
  variable names.

If a screen needs both languages explicitly (e.g. a quotation cover page),
put the Indonesian string first.

---

## 2. Tone & case

- **Sentence case** everywhere — including buttons, dialog titles, table
  headers. Do not use Title Case Like This.
- No all-caps for emphasis. Use weight (`font-medium`, `font-semibold`) or
  color tokens.
- **No exclamation marks** in production copy. (Toasts included.)
- Address the user with neutral imperative or impersonal phrasing
  ("Tambahkan data costing…"). Avoid "Anda" unless it improves clarity in a
  long sentence.

---

## 3. Numbers, money, dates

| Use | Don't |
|-----|------|
| `formatIDR(value)` from `lib/utils/format.ts` | `Intl.NumberFormat` ad-hoc, raw `value.toLocaleString()` |
| `formatPercent(value)` | manual `${(v*100).toFixed(2)}%` |
| Apply the `tabular-money` class so columns align | omit it on right-aligned currency cells |
| ISO dates in API payloads, formatted on display | locale-formatted strings on the wire |

For ranges and signs:

- Negative money is rendered with the existing rose tone *and* a leading
  `-` (color is not the only signal — see `UI-HARNESS.md` §3).
- Percentages over 100 are allowed (e.g. growth) but must include the unit.
- Never render `NaN`, `Infinity`, or `-0`. Coerce to `0` or an em-dash
  (`—`) for "no value".

---

## 4. Common phrases (canonical forms)

Reuse these exact strings instead of inventing variants:

| Concept | Canonical Indonesian | English fallback |
|---------|---------------------|------------------|
| Loading | "Memuat…" | "Loading…" |
| Saving | "Menyimpan…" | "Saving…" |
| Save success | "Tersimpan." | "Saved." |
| Generic save failure | "Gagal menyimpan. Coba lagi." | "Failed to save. Try again." |
| Generic load failure | "Gagal memuat. Coba lagi." | "Failed to load. Try again." |
| Retry button | "Coba lagi" | "Try again" |
| Cancel button | "Batal" | "Cancel" |
| Delete button | "Hapus" | "Delete" |
| Confirm destructive | "Hapus '{name}'?" | "Delete '{name}'?" |
| Empty (no data) | "Belum ada {entity}" | "No {entity} yet" |
| Empty (no results) | "Tidak ada hasil" | "No results" |
| Required field | "Wajib diisi" | "Required" |
| Invalid number | "Angka tidak valid" | "Invalid number" |
| Open Costing | "Buka Costing" | "Open Costing" |
| Open Database | "Buka Database" | "Open Database" |

When introducing a new pattern (e.g. import errors), add the canonical
string here in the same PR.

---

## 5. Buttons & CTAs

- Use a verb + object: "Tambah proyek", "Hapus segment", "Export PDF".
- Avoid generic "OK" / "Submit" / "Mulai". Tell the user what happens.
- Primary CTA per region: at most one filled `Button`. Secondary actions
  use `variant="outline"` or `variant="ghost"`.

---

## 6. Empty states

Pattern (mirrors `<EmptyState>`):

1. **Icon** — soft, illustrative (lucide).
2. **Title** — one sentence, names the missing thing
   ("Belum ada proyek costing").
3. **Description** — one optional sentence, says *why* and *what next*.
4. **Action** — names the destination
   ("Buka Costing", not "Mulai" or "Lanjut").

Do **not** stack multiple CTAs in an empty state. If the user has a real
choice, use a `Dialog` or take them to a hub.

---

## 7. Validation, errors, toasts

| Channel | Use for | Tone |
|---------|---------|------|
| Inline (`text-rose-600 text-xs`) | Field-level validation, format issues. | Short, no apology. "Wajib diisi." |
| Toast `error` | API failure, unexpected error. | Names the action: "Gagal memuat dashboard. Coba lagi." |
| Toast `success` | Background save, export completion, navigation that already happened. | One sentence: "PDF tersimpan." |
| Toast `warning` | Non-blocking advisory ("Stale data shown"). | Indicates what to do. |
| `Dialog` | Confirmations, multi-field forms. | Title is a verb-phrase question: "Hapus segment?" |

Do not use a toast as a hidden form result (success that the user cannot
correlate to their click). Prefer in-place updates.

---

## 8. Accessibility-related copy

- **Icon-only buttons** must have `aria-label` matching the visible
  intent: `aria-label="Dismiss"` for the toast `X`, `aria-label="Open
  menu"` / `"Close menu"` for the Navbar toggle.
- **Decorative icons** inside text-bearing buttons get `aria-hidden`.
- **Live region copy** (toasts) starts with the meaningful word, not the
  status: "Tersimpan." rather than "Berhasil tersimpan." (more useful when
  cut off by a screen reader).

---

## 9. Where copy is allowed to be free-form

- Documentation routes (`/documentation/*`) showing user-authored content.
- Generated quotations (the *body* — but headers/labels still follow this
  guide).
- Console logs, error tracker payloads (English preferred).

Everything else must reuse a pattern in this guide or extend it (PR-time).
