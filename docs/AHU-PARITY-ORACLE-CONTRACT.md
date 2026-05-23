# AHU Oracle Parity Contract (Tier-2 / Claude-standard)

Sumber kebenaran absolut: nilai **calculated** sel/agregasi di `excel-formulas-dump.json` (hasil `scripts/extract-formulas.mjs` dari `Costing AHU DS50.xlsx`). Tes `oracle-parity` membandingkan **output runtime** modul dengan sel oracle — bukan rantai internal JSON saja.

| Modul | Sheet | Oracle cell(s) | Arti bisnis | Input lock (dump) | Harga lock | Fungsi app |
| --- | --- | --- | --- | --- | --- | --- |
| Skid | `1. AHU-Skid` | `J18:J20`, `O25` | Massa baris aktif (section 1) + subtotal IDR | `C2/D2/E2` via `D8/E8`; `C18:D20`, `E18:E20` | `M18` (=30_000) per baris → fixture `UNP100-304.pricePerKg` | `calculateSkid` |
| Structure (shell + channels) | `3. AHU-Structure` | `N60`, `O60` (agregat dengan drain) | Total kg & biaya struktur workbook | `C2/D2/E2`, baris `C/D/E` per komponen | Kolom `M` per baris → map ke `MaterialPrice` (`SGCC-1.5`, `UNP125-304`, `SS316-SHAFT-M12`, dll.) | `buildStructureWorkbookLines` via `calculateStructure` (tanpa baris drain 38–41 yang dipindah ke modul drain) + `calculateDrainPan` |
| Drain pan | `3. AHU-Structure` | `N38:N41`, `O38:O41` | Empat baris SS304 (drain + coil support) | Dimensi per baris seperti sheet (`D38`…`E41`) | `M38` → `SUS304-1.5.pricePerKg` | `calculateDrainPan` |
| Coil | `CoilCost 20251027` | `V235` | Total biaya material blok coil | `F211`, `H211`, `H209`, `G209`, `I209` (face mm), `G211`, `G236`, `I236`, `F237`, `G237`, `H237`, `F209`, `M238`, `O236`, `O237` | `Q236:Q238` → harga per kg material (`AL-FIN`, `COPPER-TUBE`, `SGCC-1.0`) | `calculateCoil` (`coilFaceMm`, `finPackSpanMm`, waste `O236`/`O237` via `ahuRecalcParams.coil`) |
| Frame & panel | `2. AHU-Frame & Panel` | `O96` (= `SUM(O18:O95)`) | Total biaya frame & panel (profil, clip, gasket, karet, liner GI per muka, PU) | `C2/D2/E2` | `M` per baris hardware; `M44`/`M45`, `C44`/`I44`, `C45`/`I45`/`F45` untuk liner & PU | `calculateFramePanel` (fixture profil lengkap + `nSections` selaras dump) |
| Damper FA/RA | `VolDamperCost2023 FA ` / `VolDamperCost2023 RA ` | `S59` | Subtotal biaya damper (baris 50–58) | `C43`, `P43`; opsional `B44` | Katalog ter-embed di `vol-damper-workbook.ts` (kolom E/F snapshot `$B$7:$S$40`) | `calculateDamper` → `calculateVolDamperWorkbookLines` |

**Pemisahan Structure vs Drain Pan:** baris 38–41 pada sheet struktur dipetakan ke modul **Drain Pan** di app agar rollup segmen tidak double-count; assert `N60/O60` memakai **gabungan** `calculateStructure` + `calculateDrainPan`.
