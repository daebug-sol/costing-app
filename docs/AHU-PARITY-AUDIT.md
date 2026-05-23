# AHU Auto Costing Parity Audit

Audit ini merangkum status kesesuaian fitur auto AHU costing terhadap referensi **perhitungan workbook**:

- `Costing AHU DS50.xlsx`
- `excel-formulas-dump.json` (ekstraksi formula)

**Kutipan PDF/Excel** (`lib/generators/*`) adalah **output produk mandiri**; tidak menjadi sasaran parity terhadap workbook atau file PDF lain.

Dokumen ini dipakai sebagai baseline progres menuju target "100% parity" **untuk jalur kalkulasi / recalculate**.

Checklist eksekusi teknis per modul ada di:

- `docs/AHU-PARITY-EXECUTION-CHECKLIST.md`

## Metodologi penilaian

Skor dibagi tiga agar tidak bias:

- **Tier-1 (chain parity)**: assert pola formula / `SUM(range)` / konsistensi internal pada dump — cepat, tapi **bukan** bukti angka final sama dengan jalur app.
- **Tier-2 (oracle parity / Claude-standard)**: untuk setiap modul, minimal satu **sel atau agregasi dump** menjadi oracle absolut; output fungsi runtime yang dipakai produksi (`computeAhuSegmentCostingBlocks`) harus match setelah input + harga disamakan dengan konteks sel tersebut. Bukti utama: `lib/calculations/oracle-parity.test.ts` (`npm test -- oracle-parity`). Kontrak sel: `docs/AHU-PARITY-ORACLE-CONTRACT.md`.
- **Partial parity**: modul on-progress (sample / subset) walau belum full oracle Tier-2.

Status modul:

- **Full** = parity lengkap untuk modul.
- **Partial** = baru sebagian rumus/range.
- **Not started** = belum ada bukti parity ke referensi.

## Ringkasan persentase (saat ini)

- **Referensi tersedia**: `100%` (workbook + dump formula sebagai sumber oracle perhitungan).
- **Coverage ekstraksi workbook -> JSON**: `100%` (14/14 target sheet pada `scripts/extract-formulas.mjs` masuk ke dump).
- **Tier-2 oracle (Claude-standard)**: `Pass` — suite `oracle-parity` hijau pada commit yang direferensikan di PR; kontrak oracle terisi (`docs/AHU-PARITY-ORACLE-CONTRACT.md`).
- **Tier-1 strict (legacy label)**: `100%` — regression dump-backed pada `ahu-costing` + modul test (`frame/coil/damper` chain, dll.).

**Siklus eksekusi (terbaru):** Tier-1 tetap dijaga oleh `ahu-costing.test.ts` dan test modul; Tier-2 ditambahkan untuk mengunci angka absolut vs sel workbook pada kalkulator runtime.

## Matrix parity modul inti (6 modul)

| Modul inti | Sheet referensi utama | Tier-2 Oracle | Tier-1 chain / partial | Bukti utama |
| --- | --- | --- | --- | --- |
| Frame & Panel | `2. AHU-Frame & Panel` | Pass (`O96`) | Full | `oracle-parity` + `ahu-costing.test.ts` |
| Skid | `1. AHU-Skid` | Pass (`J18:J20`, `O25`) | Full | `oracle-parity` + `skid.test.ts` |
| Structure + Drain | `3. AHU-Structure` | Pass (`N60/O60` split modul) | Full | `oracle-parity` + `structure-workbook.ts` / `structure.test.ts` |
| Coil | `CoilCost 20251027` | Pass (`V235` golden row) | Full | `oracle-parity` + `ahu-costing.test.ts` |
| Damper | `VolDamperCost2023 FA ` / `RA ` | Pass (`S59`) | Full | `oracle-parity` + `ahu-costing.test.ts` |

## Integrasi recalculate

- **Status**: Verified (multi-modul + oracle aggregate).
- Bukti: `app/api/projects/[id]/segments/[segmentId]/recalculate/route.test.ts` memverifikasi flow validasi → compute → persist section/subtotal → JSON response, termasuk skenario gabungan skid/structure/drain/coil yang dibandingkan ke oracle dump (`O25`, `N60/O60`, `V235`).

## Definisi done (untuk update audit berikutnya)

Modul boleh dipindah ke **Full** jika semua terpenuhi:

1. Mapping formula/range utama modul terhadap sheet referensi sudah terdokumentasi.
2. Tidak ada stub blocker di jalur parity modul.
3. Ada test parity berbasis golden (lebih dari sample 1-2 sel).
4. Lolos uji skenario integrasi recalculate untuk modul tersebut.

Setelah 6 modul inti Full, barulah klaim strict parity auto-AHU bisa mendekati `100%`.

## Status akhir

- **Tier-2 Oracle parity**: `Pass` (suite `oracle-parity`).
- **Tier-1 chain / modul inti**: tetap dijaga oleh test dump-backed legacy.

