# AHU Parity Execution Checklist

Checklist teknis ini memecah pekerjaan parity menjadi task eksekusi yang bisa dicentang.
Gunakan bersama:

- `docs/AHU-PARITY-AUDIT.md` (status & persentase)
- `docs/AHU-EXCEL-PARITY-PLAN.md` (rencana fase)

## Target sprint terdekat

Target realistis iterasi audit-closure:

1. Pertahankan **strict parity** `100%` (6/6 modul inti) dengan regression test dump-backed.
2. Pastikan evidensi integrasi `recalculate` mencakup assertion numerik workbook-backed, bukan sekadar flow mock.
3. Tutup gap evidensi konstanta Structure (`7860` vs `8030`) dengan sumber tunggal yang eksplisit.

## Checklist umum (sekali per iterasi)

- [ ] Regenerate dump terbaru: `npm run extract-formulas`.
- [ ] Catat `meta.generatedAt` dari `excel-formulas-dump.json` di PR notes.
- [ ] Pastikan input mapping UI -> `ahuRecalcParams` konsisten dengan cell/range workbook.
- [x] Jalankan test unit parity: `npm test -- ahu-costing drainPan skid structure recalculate ahu-segment-costing`.
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

- [ ] Inventaris row/cell kontributor subtotal coil (bukan hanya `J211`/`L236` sample).
- [ ] Implement `calculateCoilCostBlock` di `lib/calculations/ahu-costing.ts` (hapus stub throw).
- [ ] Pastikan aturan override/blank (`ifBlank`) konsisten dengan workbook.

### Test

- [ ] Tambah golden test untuk beberapa row coil utama (material + assembly).
- [ ] Tambah test subtotal coil block end-to-end.

### Acceptance

- [ ] `calculateCoilCostBlock` aktif tanpa throw.
- [ ] Modul Coil naik dari **Partial** ke **Full** (target ideal) atau minimal **Partial (kuat)**.

## Modul 4 — Damper (`VolDamperCost2023 FA ` / `VolDamperCost2023 RA `)

### Implementasi

- [ ] Mapping parity terpisah FA vs RA (karena source sheet berbeda).
- [ ] Sinkronkan formula blade/frame/gear ke referensi, termasuk fungsi `ROUNDDOWN` dan rounding lain.
- [ ] Verifikasi mode include FA/RA di `resolveDamperModes` tetap sesuai saat parity layer ditambahkan.

### Test

- [ ] Tambah golden test lebih dari 1 cell (FA dan RA).
- [ ] Tambah test subtotal gabungan mode: FA-only, RA-only, FA+RA.

### Acceptance

- [ ] Damper tidak hanya sample parity; ada bukti parity subtotal.
- [ ] Modul Damper naik ke minimal **Partial (kuat)**.

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

## Output PDF / Excel (scope klaim "100% sesuai")

- [ ] Definisikan dulu level klaim:
  - parity angka saja, atau
  - parity angka + layout dokumen.
- [ ] Jika target termasuk layout, buat harness pembanding output (minimal snapshot visual/cell-map).
- [ ] Tandai jelas di audit kapan klaim "100% sesuai PDF/Excel referensi" boleh dinyatakan.

## Definition of Done (rilis parity)

- [x] 6/6 modul inti mencapai **Full** di audit.
- [x] Tidak ada stub parity tersisa di `lib/calculations/ahu-costing.ts`.
- [x] Test golden + test integrasi recalculate lulus.
- [x] Dokumen audit (`AHU-PARITY-AUDIT.md`) diperbarui dengan persentase akhir.

## Siklus sub-agent (selesai — referensi)

Contoh pola **read-only paralel + satu jalur tulis** yang sudah dijalankan:

- Sub-agent explore paralel untuk Coil, Damper FA/RA, Frame (proposal sel).
- Orchestrator menyatukan ke `lib/calculations/ahu-costing.test.ts`: konstanta nama sheet, helper `damperVerticalProfileCountFromP43`, tes dump-backed tambahan (Frame `C14`/`D14`, Coil geometry row, Damper `Q44`/`P45`/`Q45`).
- Gate: `npm test -- ahu-costing drainPan skid structure` hijau; lalu update `docs/AHU-PARITY-AUDIT.md`.

**Siklus berikutnya:** ulangi pola yang sama untuk **Structure** (`3. AHU-Structure`) dan **Skid** (`1. AHU-Skid`) — lihat bagian *Siklus berikutnya* di `docs/AHU-PARITY-AUDIT.md`.

