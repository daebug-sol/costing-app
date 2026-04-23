# Rencana parity: Auto AHU costing ↔ **Costing AHU DS50.xlsx**

**Baseline workbook:** `Costing AHU DS50.xlsx` (root project).  
**Dump formula + nilai:** `excel-formulas-dump.json` (di-generate; ~5MB+ setelah sheet lengkap).  
**Split per sheet (opsional, lokal):** jalankan `npm run extract-formulas` → folder `excel-dumps/` (di-ignore Git; isi sama dengan merged).

**Terakhir di-generate:** lihat `meta.generatedAt` di `excel-formulas-dump.json`.

---

## Fase 0 — Inventaris sheet (workbook DS50)

Semua worksheet di file referensi (urutan tidak penting):

| Sheet | Peran (ringkas) | Prioritas parity |
| --- | --- | --- |
| `DB_MOTOR` | Katalog / lookup motor | Medium — dipakai fan & motor |
| `DB-SanMu Plug Fan` | Katalog fan | Medium |
| `Master` | Data master | Rendah–medium |
| `SCU75M1` | Sizing / unit (contoh) | Sesuaikan kebutuhan |
| `AHU IU1` | Assembly / IU | Tinggi |
| `VolDamperCost2023 RA ` | Biaya damper RA (perhatikan spasi di nama) | Tinggi |
| `VolDamperCost2023 FA ` | Biaya damper FA | Tinggi |
| `drainpan` | Drain pan | Tinggi |
| `1. AHU-Skid` | Skid | Tinggi |
| `2. AHU-Frame & Panel` | Frame & panel | Tinggi |
| `3. AHU-Structure` | Structure | Tinggi |
| `CoilCost 20251027` | Coil | Tinggi |
| `Quotation` | Output quotation | Medium (banyak layout) |
| `Project Cost` | Ringkasan proyek | Medium |

**Matriks input → output (template):** untuk tiap sheet yang jadi sumber HPP, dokumentasikan sel/range **input user** vs **subtotal / kg / IDR** saat iterasi berikutnya (isi bertahap).

---

## Fase 1 — Ekstraksi

- Script: `scripts/extract-formulas.mjs`
- Perintah:
  - `npm run extract-formulas` — tulis `excel-formulas-dump.json` + split ke `excel-dumps/`
  - `npm run extract-formulas:list` — daftar nama sheet persis (debug nama/spasi)
- Syarat: file `Costing AHU DS50.xlsx` ada di root.
- **Modular costing:** subset modul tidak boleh mengisi sel “input” fiktif tanpa aturan; bedakan **blank** vs **0** jika Excel membedakan (`IF(ISBLANK(...))`).

---

## Fase 2 — Engine TypeScript

- Lanjutkan `lib/calculations/ahu-costing.ts` (stub: frame/structure/coil block) **atau** aggregator per sheet + thin mapping ke `CalcLineItem`.
- Gunakan `Decimal` + `lib/calculations/excel-math.ts` (`excelRound`, `excelRoundUp`, `excelRoundDown`, …).
- Satukan dengan jalur `POST .../recalculate` / `lib/ahu-segment-costing.ts` — hindari dua rumus paralel permanen untuk blok yang sama.

---

## Fase 3 — UI ↔ Excel

- Mapping field UI & `ahuRecalcParams` → sel/range logis (dokumentasikan di PR kecil).
- Tambah field form (flow CMH, LPS, Qc/Qs, …) bertahap; sesuaikan `lib/ahu-recalc-validation.ts`.

---

## Fase 4 — Testing

- Unit: fragmen vs nilai golden (polanya di `lib/calculations/ahu-costing.test.ts`; tambah per sheet).
- Integrasi: scenario penuh → subtotal per modul ≈ Excel (toleransi kecil).

---

## Fase 5 — UX

- Setelah angka stabil: urutkan form mengikuti alur sheet / wizard; opsional mode debug intermediate.

---

## Checklist (hidupkan saat selesai)

- [ ] Fase 0: matriks input/output per sheet kritikal diisi
- [ ] Fase 1: `npm run extract-formulas` sukses; `meta.sheetNamesInWorkbook` lengkap
- [ ] Fase 2: stub `ahu-costing` terisi atau diganti aggregator teruji
- [ ] Fase 3: mapping UI ↔ sel terdokumentasi
- [ ] Fase 4: scenario integrasi hijau
- [ ] Fase 5: UX disesuaikan (opsional)

---

## Iterasi pertama (sudah dimulai)

1. ~~Dokumen ini + perluasan `TARGET_SHEETS` + regenerate dump~~
2. Golden tambahan: `ROUNDDOWN` — `excelRoundDown` + tes `VolDamperCost2023 FA` cell P44
3. Berikutnya: port blok **drainpan / coil** yang sudah ada dump, lalu Frame & Panel besar

---

## File terkait

| File | Keterangan |
| --- | --- |
| `excel-formulas-dump.json` | Merge semua sheet target |
| `excel-dumps/*.json` | Split (regenerable, gitignored) |
| `scripts/extract-formulas.mjs` | Ekstraksi |
| `lib/calculations/excel-math.ts` | Semantik Excel |
| `lib/ahu-segment-costing.ts` | Orkestrasi modul |
