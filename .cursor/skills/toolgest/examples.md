# Toolgest Examples

## Example 1: auto-apply-toolgest

**User:**
```
auto-apply-toolgest fix test auth yang gagal di costing-app setelah refactor session
```

**Agent announces & runs:**
```markdown
**Toolgest (auto):** `systematic-debugging` + `grinding-until-pass`
**Alasan:** Bug setelah refactor — isolasi dulu root cause, lalu loop test sampai hijau.
**Langkah berikutnya:** Repro failure, baca stack trace, fix minimal, `pnpm test` loop.
```

Tidak ada AskQuestion. Langsung baca skill files → eksekusi.

---

## Example 2: recommend-tool-plan

**User:**
```
recommend-tool-plan tambah halaman billing dengan Stripe di web app
```

**Agent presents plan (cuplikan):**
```markdown
## Tool Plan: Stripe billing page

### Konteks
- **Task:** Tambah halaman billing + Stripe
- **Intent:** implement | **Risk:** payment (tinggi) | **Repo:** web app

### Opsi A — Recommended
| # | Harness | Tipe | Fungsi | Preview jika di-apply |
|---|---------|------|--------|----------------------|
| 1 | `adding-stripe` | skill | Checkout, webhook, portal | Scaffold route `/billing`, Checkout Session, webhook handler di `api/stripe/webhook` |
| 2 | `writing-tests` | skill | Test coverage | Unit test webhook signature + mock checkout flow |
| 3 | `visual-qa-testing` | skill | Browser QA | Buka `/billing`, screenshot checkout button, cek console |
| 4 | `auditing-security` | skill | Security pass | Cek webhook secret, jangan expose key, validate amounts server-side |

**Urutan:** 1 → 2 → 4 → 3 | **Estimasi:** ~45 menit

### Opsi B — Minimal
Hanya `adding-stripe` — implement cepat, tanpa test/audit tambahan.

### Opsi C — Quality-max
A + `parallel-code-review` + `creating-pr` + `obsidian-project-notes`
```

**Agent calls AskQuestion:**
- Q1: Pilih A / B / C / D (custom)
- Q2 (if D): multi-select dari kandidat

**Setelah user pilih A** → baca `adding-stripe/SKILL.md` → eksekusi.

---

## Example 3: toolgest tanpa mode

**User:**
```
toolgest deploy costing-app ke staging
```

**Agent:**
```markdown
Mau pakai mode mana?
```
→ `AskQuestion`: Auto-apply-toolgest | Recommend-tool-plan

---

## Example 4: Preview buruk vs baik

**Buruk (generik):**
> `grinding-until-pass` akan menjalankan tests.

**Baik (spesifik task):**
> `grinding-until-pass` akan loop: jalankan `pnpm test packages/costing-engine`, perbaiki assertion di `ahu-golden.test.ts` yang expect 125000 tapi dapat 124500, ulangi sampai 0 failure.

---

## Example 5: Custom selection (plan mode D)

User pilih **D — Custom** dan multi-select:
- `adding-docker`
- `setting-up-ci`
- (tanpa `kubernetes-deploying`)

Agent ringkas: "Stack custom: dockerize + CI only, skip k8s" → eksekusi berurutan.

---

## Prompt cheatsheet

| Mau apa | Prompt |
|---------|--------|
| Langsung jalan | `auto-apply-toolgest <task>` |
| Mau review plan dulu | `recommend-tool-plan <task>` |
| Biarin agent pilih mode | `toolgest <task>` |
| Quality pipeline | `auto-apply-toolgest ship feature X` → agent bisa chain explore → implement → grind → visual QA |
| Harness apa saja yang ada? | `recommend-tool-plan <task>` — plan mode list kandidat relevan |
