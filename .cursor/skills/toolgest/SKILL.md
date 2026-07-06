---
name: toolgest
description: >-
  Route tasks to the right Cursor harness (skills, MCP, SDK, rules, hooks,
  subagents, browser). Two modes: auto-apply-toolgest (execute immediately) and
  recommend-tool-plan (plan with previews, user approves via multiple choice).
  Use when the user says toolgest, auto-apply-toolgest, recommend-tool-plan,
  asks which skill/tool/harness to use, or wants help picking tools for a task.
---

# Toolgest — Harness & Tool Router

Memilih dan mengaplikasikan **skills, MCP, SDK, rules, hooks, subagents, dan built-in tools** yang tepat untuk task user.

## Invocation

| User says | Mode |
|-----------|------|
| `auto-apply-toolgest` / `toolgest auto` | **Auto** — langsung eksekusi |
| `recommend-tool-plan` / `toolgest plan` | **Plan** — rekomendasi + persetujuan |
| `toolgest` saja | Tanya mode dulu via `AskQuestion` |

Format task: `[mode] <deskripsi task>` — contoh: `auto-apply-toolgest fix login bug di costing-app`

## Shared: Context intake (kedua mode)

Sebelum memilih harness, kumpulkan sinyal dari task + workspace:

1. **Intent** — implement, debug, review, explore, deploy, automate, document, QA, refactor, ship
2. **Scope** — file tunggal, modul, full repo, cross-repo, infra, docs-only
3. **Risk** — prod, auth/payment, data migration, UI-only, read-only
4. **Repo** — cek `AGENTS.md`, `.cursor/rules/`, project skills di `.cursor/skills/`
5. **Constraints** — speed vs quality, jangan commit/push, bahasa Indonesia, dsb.

Baca [catalog.md](catalog.md) untuk daftar harness lengkap. Jangan tebak — baca `SKILL.md` harness yang dipilih sebelum eksekusi.

## Mode 1: auto-apply-toolgest

**Prinsip:** User mempercayakan pemilihan harness. Langsung proses task.

### Workflow

```
Intake → Select stack → Announce (1 paragraf) → Read skill files → Execute → Report harness used
```

### Selection rules

- **1 primary skill** (workflow utama) + **0–2 supporting** (MCP, subagent, rule check)
- Maks **4 harness** total — lebih banyak = fokus hilang
- Project rules (`AGENTS.md`, `.cursor/rules/`) selalu aktif, tidak dihitung
- Urutan eksekusi: explore → implement → verify → ship/document

### Intent → default primary skill

| Intent | Primary | Supporting (pick 0–2) |
|--------|---------|----------------------|
| Bug / failing tests | `systematic-debugging` atau `grinding-until-pass` | `monitoring-terminal-errors` |
| UI change | implement langsung | `visual-qa-testing`, `using-ui-stack` |
| New feature (besar) | `parallel-exploring` | `writing-tests`, `obsidian-project-notes` |
| PR merge-ready | `babysitting-pr` | `parallel-ci-triage` |
| Pre-merge review | `parallel-code-review` | `auditing-security` |
| CI red | `parallel-ci-triage` | `grinding-until-pass` |
| Security | `auditing-security` | `parallel-code-review` |
| Hard / uncertain fix | `best-of-n-solving` | `systematic-debugging` |
| Onboard codebase | `codebase-onboarding` | `parallel-exploring` |
| API change | implement + `api-smoke-testing` | `network-request-auditing` |
| Persist decisions | `saving-workspace-context` | `obsidian-project-notes` (MCP) |
| Cursor product/config | `cursor-guide` skill atau built-in `skills-cursor/*` | MCP `cursor-app-control` |
| Automation / bot | `cursor-sdk` (skills-cursor) | MCP `cursor-backend-control` |
| PRD-driven | `implement-from-prd` (ChatPRD) | `check-prd-alignment` |
| Research loop | `autoresearch` | — |
| Switch repo | `switching-projects` | MCP `move_agent_to_root` |
| Quality-first (umum) | `quality-vibecoding-router` | pilih 1 skill dari decision tree-nya |

### Announce template (wajib, singkat)

```markdown
**Toolgest (auto):** [primary] + [supporting]
**Alasan:** [1–2 kalimat mengapa cocok untuk task ini]
**Langkah berikutnya:** [apa yang akan saya lakukan sekarang]
```

Lalu **langsung eksekusi** — jangan tunggu konfirmasi.

### Auto guardrails

- Jangan `git commit` / `git push` kecuali user minta
- Jangan stack 5+ skills
- Jika task ambigu dan salah pilih harness berisiko tinggi → fallback ke **recommend-tool-plan** sekali, lalu lanjut setelah user pilih

---

## Mode 2: recommend-tool-plan

**Prinsip:** Plan mode untuk harness — jelaskan fungsi + preview, user approve via pilihan ganda.

### Workflow

```
Intake → Build 3 stack variants → Present plan → AskQuestion → Read approved skills → Execute → Report
```

### Plan document (wajib sebelum AskQuestion)

Susun rencana dengan format ini untuk **setiap harness** yang direkomendasikan:

```markdown
## Tool Plan: [judul singkat task]

### Konteks
- **Task:** ...
- **Intent / risk / repo:** ...

### Opsi stack

#### A — Recommended (seimbang)
| # | Harness | Tipe | Fungsi | Preview jika di-apply |
|---|---------|------|--------|----------------------|
| 1 | `grinding-until-pass` | skill | Loop fix→test sampai hijau | Akan menjalankan `pnpm test`, perbaiki error iteratif sampai pass |
| 2 | ... | MCP/skill/rule | ... | ... |

**Urutan eksekusi:** 1 → 2 → 3
**Estimasi:** ~X menit | **Risiko:** rendah/sedang/tinggi

#### B — Minimal (cepat)
[table sama, lebih sedikit harness]

#### C — Quality-max (thorough)
[table sama, lebih banyak QA/review]

#### D — Custom
User pilih item individual (lihat daftar di bawah)

### Daftar harness kandidat
[semua opsi yang relevan, meski tidak masuk A/B/C]
```

**Preview** harus spesifik ke task user — bukan definisi generik. Contoh buruk: "menjalankan tests". Contoh baik: "menjalankan `pnpm test src/auth/` dan memperbaiki 3 test gagal di `login.test.ts` sampai hijau".

### AskQuestion (wajib)

Setelah plan document, panggil `AskQuestion` dengan struktur:

**Question 1 — Pilih stack:**
- `A` — Recommended (default, seimbang)
- `B` — Minimal (paling cepat, coverage lebih tipis)
- `C` — Quality-max (paling thorough, lebih lama)
- `D` — Custom (pilih harness individual di question 2)

**Question 2** (hanya jika `D` atau user minta custom) — **multi-select** harness dari kandidat yang relevan.

**Question 3** (opsional) — konfirmasi guardrail:
- Izinkan git commit? Ya / Tidak
- Izinkan browser automation? Ya / Tidak

**Jangan eksekusi** sampai user menjawab. Setelah jawaban:
1. Ringkas pilihan user (1 paragraf)
2. Baca `SKILL.md` harness terpilih
3. Eksekusi sesuai urutan plan

### Plan mode guardrails

- Selalu jelaskan **fungsi** (what) dan **preview** (what happens on THIS task)
- Tawarkan minimal 3 opsi stack (A/B/C)
- Jika hanya 1 harness yang masuk akal, tetap berikan B=skip harness tambahan dan C=tambah QA

---

## Harness layers (terminologi)

| Layer | Contoh | Kapan |
|-------|--------|-------|
| **Project rules** | `AGENTS.md`, `.cursor/rules/*.mdc` | Selalu — invariant domain |
| **Skills** | `~/.cursor/skills/*/SKILL.md` | Workflow playbook |
| **Built-in skills** | `~/.cursor/skills-cursor/` | Cursor-native (canvas, loop, sdk) |
| **MCP** | `cursor-app-control`, `cursor-ide-browser`, Obsidian, GitHub | Tool eksternal terautentikasi |
| **Subagents** | `explore`, `shell`, `generalPurpose`, `ci-investigator` | Paralel / spesialis |
| **SDK** | `@cursor/sdk`, `cursor-sdk` | Agent di luar IDE |
| **Hooks** | `.cursor/hooks.json` | Otomatisasi event-driven |

## Project-specific defaults

| Repo | Rules/harness | Toolgest biasanya menambah |
|------|---------------|---------------------------|
| `costing-app` | `AGENTS.md` + costing rules | `grinding-until-pass`, `visual-qa-testing`, `parallel-code-review` |
| `noffice-app` | noffice rules | `parallel-exploring`, `api-smoke-testing`, `architecture-decision-records` |
| Obsidian / planning | vault | `obsidian-project-notes`, MCP `user-obsidian`, `saving-workspace-context` |

## After execution (kedua mode)

Akhiri dengan ringkasan singkat:

```markdown
## Toolgest selesai
- **Mode:** auto | plan
- **Harness dipakai:** ...
- **Hasil:** ...
- **Harness yang tidak dipakai (dan kenapa):** ... (plan mode saja, opsional)
```

## Do not

- Jangan list semua 80+ skills ke user — hanya yang relevan (≤10 di plan)
- Jangan eksekusi di plan mode tanpa `AskQuestion`
- Jangan ganti project rules dengan prompt ad-hoc
- Jangan recommend `browser_*` kecuali task butuh UI/API visual verification

## Additional resources

- [catalog.md](catalog.md) — katalog harness lengkap per kategori
- [examples.md](examples.md) — contoh auto vs plan
- `quality-vibecoding-router` — subset quality-first (bukan pengganti toolgest)
