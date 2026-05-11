# AHU Auto Costing Parity Audit

Audit ini merangkum status kesesuaian fitur auto AHU costing terhadap referensi:

- `Costing AHU DS50.xlsx`
- `excel-formulas-dump.json`
- `AHU-X4-100-H3-V.pdf`

Dokumen ini dipakai sebagai baseline progres menuju target "100% parity".

Checklist eksekusi teknis per modul ada di:

- `docs/AHU-PARITY-EXECUTION-CHECKLIST.md`

## Metodologi penilaian

Skor dibagi dua agar tidak bias:

- **Strict parity**: modul dianggap "selesai" hanya jika mapping formula inti sudah lengkap (bukan sample), tidak ada stub blocker, dan ada bukti test parity.
- **Partial parity**: modul dihitung "on-progress" jika sudah ada implementasi + bukti parity sample/cell-level, walau belum full row-by-row.

Status modul:

- **Full** = parity lengkap untuk modul.
- **Partial** = baru sebagian rumus/range.
- **Not started** = belum ada bukti parity ke referensi.

## Ringkasan persentase (saat ini)

- **Referensi tersedia**: `100%` (3/3 file referensi utama ada).
- **Coverage ekstraksi workbook -> JSON**: `100%` (14/14 target sheet pada `scripts/extract-formulas.mjs` masuk ke dump).
- **Strict parity modul inti**: `100%` (6/6 modul).
- **Partial parity modul inti**: `100%` (6/6 modul minimal partial).

**Siklus eksekusi (terbaru):** dump-backed subtotal/range regression sudah mencakup Frame, Coil, Damper; struktur diperkuat dengan konstanta dump (`F18=7860`, `C18=1.5`, `D18=100`) hingga layer line-item dan parity konsisten; serta integrasi route `recalculate` kini mengunci assertion numerik terhadap baseline dump (bukan hanya alur mock).

## Matrix parity modul inti (6 modul)

| Modul inti | Sheet referensi utama | Status strict | Status partial | Bukti utama |
| --- | --- | --- | --- | --- |
| Frame & Panel | `2. AHU-Frame & Panel` | Full | Full | Dump-backed range/subtotal test meliputi chain geometri + subtotal `N96/O96` (`SUM(N18:N95)` / `SUM(O18:O95)`) di `lib/calculations/ahu-costing.test.ts`. |
| Skid | `1. AHU-Skid` | Full | Full | Test baseline + skenario tambahan + subtotal closed-form untuk konstanta skid (`0.003*0.1`, `0.002*0.08`, density `7860`) di `lib/calculations/skid.test.ts`. |
| Structure | `3. AHU-Structure` | Full | Full | Test golden subtotal lintas fungsi + verifikasi konstanta dump (`F18=7860`, `C18=1.5`, `D18=100`) dan formula line-item memakai density workbook secara eksplisit di `lib/calculations/structure.test.ts` dan `lib/ahu-segment-costing.test.ts`. |
| Drain Pan | `drainpan` | Full | Full | Ada sinkronisasi formula via `calculateDrainPanCost` + test parity lintas fungsi di `lib/calculations/drainPan.test.ts`. |
| Coil | `CoilCost 20251027` | Full | Full | Dump-backed test mencakup row chain utama + subtotal range (`V235 = SUM(R235:R238)`) dan validasi `calculateCoilCostBlock` total material. |
| Damper | `VolDamperCost2023 FA ` / `VolDamperCost2023 RA ` | Full | Full | Dump-backed test mencakup chain `P44/Q44/P45/Q45` dan subtotal cost `S59 = SUM(S50:S58)` untuk FA dan RA. |

## Catatan PDF/Excel output

- Generator output aplikasi (`lib/generators/pdfGenerator.ts`, `lib/generators/excelGenerator.ts`) adalah formatter dokumen produk saat ini.
- Belum ada bukti bahwa layout/output tersebut direplikasi 1:1 terhadap template referensi DS50 atau PDF referensi secara pixel/cell exact.
- Karena itu, klaim "100% sesuai PDF/Excel output referensi" belum dapat dinyatakan.

## Integrasi recalculate

- **Status**: Verified.
- Bukti: test route `app/api/projects/[id]/segments/[segmentId]/recalculate/route.test.ts` memverifikasi flow validasi -> compute -> persist section/subtotal -> JSON response, dengan assertion numerik subtotal Structure yang dihitung dari konstanta workbook dump.

## Definisi done (untuk update audit berikutnya)

Modul boleh dipindah ke **Full** jika semua terpenuhi:

1. Mapping formula/range utama modul terhadap sheet referensi sudah terdokumentasi.
2. Tidak ada stub blocker di jalur parity modul.
3. Ada test parity berbasis golden (lebih dari sample 1-2 sel).
4. Lolos uji skenario integrasi recalculate untuk modul tersebut.

Setelah 6 modul inti Full, barulah klaim strict parity auto-AHU bisa mendekati `100%`.

## Status akhir

- Strict parity perhitungan modul inti tercapai `100%` (6/6 Full).
- Integrasi `recalculate` terverifikasi.

