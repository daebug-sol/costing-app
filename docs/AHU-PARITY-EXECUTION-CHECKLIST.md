# AHU Parity Execution Checklist

Checklist teknis ini memecah pekerjaan parity menjadi task eksekusi yang bisa dicentang.
Gunakan bersama:

- `docs/AHU-PARITY-AUDIT.md` (status & persentase)
- `docs/AHU-EXCEL-PARITY-PLAN.md` (rencana fase)

## Target sprint terdekat

Target realistis iterasi audit-closure:

1. Pertahankan **Tier-1** regression dump-backed (`ahu-costing`, modul tests).
2. Jaga **Tier-2 oracle** (`npm test -- oracle-parity`) hijau setiap PR yang menyentuh kalkulator AHU.
3. Pastikan evidensi integrasi `recalculate` mencakup assertion numerik workbook-backed, bukan sekadar flow mock.

## Checklist umum (sekali per iterasi)

- [ ] Regenerate dump terbaru: `npm run extract-formulas`.
- [ ] Catat `meta.generatedAt` dari `excel-formulas-dump.json` di PR notes.
- [ ] Pastikan input mapping UI -> `ahuRecalcParams` konsisten dengan cell/range workbook.
- [x] Jalankan **Tier-2 oracle**: `npm test -- oracle-parity`.
- [x] Jalankan **Tier-1** parity suites: `npm test -- ahu-costing drainPan skid structure recalculate ahu-segment-costing`.
- [x] Update status di `docs/AHU-PARITY-AUDIT.md` setelah task modul selesai.

## Modul 1 — Frame & Panel (`2. AHU-Frame & Panel`)

### Implementasi

- [x] Inventaris range utama sheet (kg, area, IDR) yang berkontribusi ke subtotal frame/panel.
- [x] Implement `calculateFrameWeight` di `lib/calculations/ahu-costing.ts` (hapus stub throw).
- [x] Tandai titik rounding sesuai Excel (`excelRound`, `excelRoundUp`, `excelRoundDown`) hanya di titik yang memang ada di workbook.
- [x] Sinkronkan output parity layer dengan `calculateFramePanel` atau definisikan adapter tunggal agar tidak ada dual-source formula.

### Test

- [x] Tambah test golden untuk minimal 1 skenario dimensi penuh (contoh H/W/D dari workbook).
- [x] Tambah test edge case: blank vs 0 untuk field yang pakai pola `IF(ISBLANK(...))`.
- [x] Tambah assert subtotal modul (bukan hanya helper cell-level).

### Acceptance

- [x] Tidak ada stub/error path pada jalur frame parity.
- [x] Selisih nilai terhadap golden <= toleransi yang disepakati.
- [x] Modul Frame & Panel bisa dipindah ke minimal **Partial (kuat)**.

## Modul 2 — Structure (`3. AHU-Structure`)

### Implementasi

- [x] Mapping range weight & material cost utama dari sheet structure.
- [x] Implement `calculateStructureWeight` di `lib/calculations/ahu-costing.ts` (hapus stub throw).
- [x] Samakan asumsi material thickness/density dengan referensi workbook (jangan hanya default code path).

### Test

- [x] Tambah test golden structure untuk dimensi referensi yang sama dengan test frame.
- [x] Verifikasi subtotal structure terhadap dump.

### Acceptance

- [x] Tidak ada stub/error path pada jalur structure parity.
- [x] Modul Structure naik ke minimal **Partial (kuat)** atau **Full** jika range sudah lengkap.

## Modul 3 — Coil (`CoilCost 20251027`)

### Implementasi

- [x] Inventaris row/cell kontributor subtotal coil (bukan hanya `J211`/`L236` sample).
- [x] Implement `calculateCoilCostBlock` di `lib/calculations/ahu-costing.ts` (delegasi ke `calculateCoil`).
- [x] Pastikan aturan override/blank (`ifBlank`) konsisten dengan workbook pada helper parity.

### Test

- [x] Tambah golden test untuk beberapa row coil utama (material + assembly).
- [x] Tambah test subtotal coil block end-to-end (`oracle-parity` vs `V235`).

### Acceptance

- [x] `calculateCoilCostBlock` aktif tanpa throw.
- [x] Modul Coil Tier-2 oracle **Pass** (`oracle-parity`).

## Modul 4 — Damper (`VolDamperCost2023 FA ` / `VolDamperCost2023 RA `)

### Implementasi

- [x] Mapping parity terpisah FA vs RA (karena source sheet berbeda).
- [x] Sinkronkan formula blade/frame/gear ke referensi, termasuk fungsi `ROUNDDOWN` dan rounding lain.
- [x] Verifikasi mode include FA/RA di `resolveDamperModes` tetap sesuai saat parity layer ditambahkan.

### Test

- [x] Tambah golden test lebih dari 1 cell (FA dan RA).
- [x] Tambah test subtotal gabungan mode: FA-only, RA-only, FA+RA (`oracle-parity` vs `S59`).

### Acceptance

- [x] Damper tidak hanya sample parity; ada bukti parity subtotal.
- [x] Modul Damper Tier-2 oracle **Pass** (`oracle-parity`).

## Modul 5 — Skid (`1. AHU-Skid`)

### Implementasi

- [x] Mapping formula skid dari workbook ke fungsi existing `calculateSkid`.
- [x] Dokumentasikan setiap konstanta fisik yang dipakai (thickness, density, waste).

### Test

- [x] Tambah test golden skid untuk 1 skenario baseline.
- [x] Tambah test sensitivitas terhadap perubahan W/D.

### Acceptance

- [x] Ada bukti parity pertama untuk skid (naik ke **Partial**).

## Modul 6 — Drain Pan (`drainpan`)

### Hardening (sudah paling maju)

- [x] Tambah 1-2 skenario golden tambahan (ukuran kecil vs besar) untuk mengurangi risiko overfit satu contoh.
- [x] Verifikasi konsistensi density/price source antara parity layer dan line-item layer.

### Acceptance

- [x] Tetap **Full** setelah regressions test.

## Integrasi API recalculate

- [x] Tambah test integrasi `POST .../recalculate` untuk memastikan subtotal per section sesuai kalkulasi parity yang baru.
- [x] Pastikan urutan section tetap sinkron dengan `AHU_COSTING_SECTION_DEFS`.
- [x] Validasi bahwa perubahan parity tidak memecahkan modular scope (full vs partial modules).

## Definition of Done (rilis parity)

- [x] 6/6 modul inti mencapai **Full** di audit.
- [x] Tidak ada stub parity tersisa di `lib/calculations/ahu-costing.ts`.
- [x] Test golden + test integrasi recalculate lulus.
- [x] **Tier-2 oracle** `npm test -- oracle-parity` hijau.
- [x] Dokumen audit (`AHU-PARITY-AUDIT.md`) + kontrak oracle (`AHU-PARITY-ORACLE-CONTRACT.md`) diperbarui.

## Siklus sub-agent (selesai — referensi)

Contoh pola **read-only paralel + satu jalur tulis** yang sudah dijalankan:

- Sub-agent explore paralel untuk Coil, Damper FA/RA, Frame (proposal sel).
- Orchestrator menyatukan ke `lib/calculations/ahu-costing.test.ts`: konstanta nama sheet, helper `damperVerticalProfileCountFromP43`, tes dump-backed tambahan (Frame `C14`/`D14`, Coil geometry row, Damper `Q44`/`P45`/`Q45`).
- Gate: `npm test -- ahu-costing drainPan skid structure` hijau; lalu update `docs/AHU-PARITY-AUDIT.md`.

**Siklus berikutnya:** ulangi pola yang sama untuk **Structure** (`3. AHU-Structure`) dan **Skid** (`1. AHU-Skid`) — lihat bagian *Siklus berikutnya* di `docs/AHU-PARITY-AUDIT.md`.

